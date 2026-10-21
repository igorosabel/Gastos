import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import type CreateSpaceInvitationResponse from '@interfaces/spaces/create-space-invitation-response.interface';
import type RevokeSpaceInvitationResponse from '@interfaces/spaces/revoke-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/spaces/space-invitations-response.interface';
import type SpaceInvitation from '@model/spaces/space-invitation.model';
import CreateInvitation from '@modules/spaces/create-invitation/create-invitation';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { firstValueFrom, type Subscription } from 'rxjs';

@Component({
  selector: 'app-space-invitations',
  imports: [ButtonDirective, CreateInvitation],
  templateUrl: './space-invitations.html',
  styleUrl: './space-invitations.scss',
})
export default class SpaceInvitations {
  private readonly spacesService: SpacesService = inject(SpacesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly document: Document = inject(DOCUMENT);

  readonly spaceId: InputSignal<number> = input.required<number>();

  readonly invitations: WritableSignal<SpaceInvitation[]> = signal<SpaceInvitation[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly creating: WritableSignal<boolean> = signal<boolean>(false);
  readonly lastDelivery: WritableSignal<CreateSpaceInvitationResponse | null> =
    signal<CreateSpaceInvitationResponse | null>(null);
  readonly linkCopied: WritableSignal<boolean> = signal<boolean>(false);
  readonly copyError: WritableSignal<string | null> = signal<string | null>(null);
  readonly resendConfirmationId: WritableSignal<number | null> = signal<number | null>(null);
  readonly resendingId: WritableSignal<number | null> = signal<number | null>(null);
  readonly resendError: WritableSignal<string | null> = signal<string | null>(null);
  readonly confirmationId: WritableSignal<number | null> = signal<number | null>(null);
  readonly revokingId: WritableSignal<number | null> = signal<number | null>(null);
  readonly revokeError: WritableSignal<string | null> = signal<string | null>(null);
  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  private loadedSpaceId: number | null = null;
  private contextVersion: number = 0;

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number = this.spaceId();

      this.refreshVersion();

      if (this.loadedSpaceId !== spaceId) {
        this.loadedSpaceId = spaceId;
        this.contextVersion += 1;

        this.invitations.set([]);
        this.creating.set(false);
        this.lastDelivery.set(null);
        this.linkCopied.set(false);
        this.copyError.set(null);
        this.resendConfirmationId.set(null);
        this.resendingId.set(null);
        this.resendError.set(null);
        this.confirmationId.set(null);
        this.revokingId.set(null);
        this.revokeError.set(null);
      }

      this.loading.set(true);
      this.error.set(null);

      const subscription: Subscription = this.spacesService.getInvitations(spaceId).subscribe({
        next: (response: SpaceInvitationsResponse): void => {
          if (!response.success) {
            this.invitations.set([]);
            this.error.set('No se han podido consultar las invitaciones.');
          } else {
            this.invitations.set(response.invitations);
          }

          this.loading.set(false);
        },
        error: (): void => {
          this.invitations.set([]);
          this.error.set('No se han podido consultar las invitaciones.');
          this.loading.set(false);
        },
      });

      onCleanup((): void => {
        subscription.unsubscribe();
      });
    });
  }

  /**
   * Vuelve a consultar las invitaciones del espacio.
   */
  reload(): void {
    this.refreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Abre el formulario de invitación.
   */
  openCreate(): void {
    this.creating.set(true);
  }

  /**
   * Cancela la creación de una invitación.
   */
  cancelCreate(): void {
    this.creating.set(false);
  }

  /**
   * Recibe el resultado completo de una invitación nueva.
   */
  onCreated(response: CreateSpaceInvitationResponse): void {
    if (!response.success || response.invitation.space_id !== this.spaceId()) {
      return;
    }

    this.showDelivery(response);
    this.creating.set(false);
    this.reload();
  }

  /**
   * Guarda el resultado de la última emisión del espacio.
   */
  private showDelivery(response: CreateSpaceInvitationResponse): void {
    this.lastDelivery.set(response);
    this.linkCopied.set(false);
    this.copyError.set(null);
  }

  /**
   * Oculta el resultado y descarta su token en memoria.
   */
  hideDelivery(): void {
    this.lastDelivery.set(null);
    this.linkCopied.set(false);
    this.copyError.set(null);
  }

  /**
   * Construye el enlace de aceptación con el origen
   * real desde el que se está ejecutando Gastos.
   */
  invitationLink(token: string): string {
    const origin: string = this.document.location?.origin ?? '';

    return `${origin}/invitacion#token=${token}`;
  }

  /**
   * Copia el enlace alternativo cuando SMTP no
   * ha confirmado el envío.
   */
  async copyLink(): Promise<void> {
    const delivery: CreateSpaceInvitationResponse | null = this.lastDelivery();

    if (delivery === null || delivery.email_sent) {
      return;
    }

    this.linkCopied.set(false);
    this.copyError.set(null);

    const clipboard: Clipboard | undefined = this.document.defaultView?.navigator.clipboard;

    if (clipboard === undefined) {
      this.copyError.set('Selecciona y copia el enlace del campo de texto.');
      return;
    }

    try {
      await clipboard.writeText(this.invitationLink(delivery.invitation.token));

      if (this.lastDelivery() === delivery) {
        this.linkCopied.set(true);
      }
    } catch {
      if (this.lastDelivery() === delivery) {
        this.copyError.set(
          'No se ha podido copiar automáticamente. ' +
            'Selecciona el enlace y cópialo manualmente.',
        );
      }
    }
  }

  /**
   * Solicita confirmación para revocar una invitación pendiente.
   */
  requestRevoke(invitation: SpaceInvitation): void {
    if (
      invitation.status !== 'pending' ||
      invitation.space_id !== this.spaceId() ||
      this.revokingId() !== null ||
      this.resendingId() !== null
    ) {
      return;
    }

    this.resendConfirmationId.set(null);
    this.resendError.set(null);
    this.confirmationId.set(invitation.id);
    this.revokeError.set(null);
  }

  /**
   * Cancela la confirmación sin contactar con la API.
   */
  cancelRevoke(): void {
    if (this.revokingId() !== null) {
      return;
    }

    this.confirmationId.set(null);
    this.revokeError.set(null);
  }

  /**
   * Ejecuta la revocación después de la confirmación.
   */
  async confirmRevoke(): Promise<void> {
    const invitationId: number | null = this.confirmationId();
    const spaceId: number = this.spaceId();
    const version: number = this.contextVersion;

    const invitation: SpaceInvitation | undefined = this.invitations().find(
      (item: SpaceInvitation): boolean => item.id === invitationId,
    );

    if (
      invitationId === null ||
      invitation === undefined ||
      invitation.status !== 'pending' ||
      invitation.space_id !== spaceId ||
      this.revokingId() !== null ||
      this.resendingId() !== null
    ) {
      return;
    }

    this.revokingId.set(invitationId);
    this.revokeError.set(null);

    try {
      const response: RevokeSpaceInvitationResponse = await firstValueFrom(
        this.spacesService.revokeInvitation({ invitationId }),
      );

      if (!this.isCurrentContext(spaceId, version)) {
        return;
      }

      if (
        !response.success ||
        response.invitation === null ||
        response.invitation.id !== invitationId ||
        response.invitation.space_id !== spaceId ||
        response.invitation.status !== 'revoked'
      ) {
        this.revokeError.set('No se ha podido confirmar la revocación.');
        return;
      }

      // El token de una invitación reciente no debe seguir visible.
      // Si acabamos de revocar la invitación del aviso,
      // su enlace ya no debe seguir mostrándose.
      if (this.lastDelivery()?.invitation.id === invitationId) {
        this.hideDelivery();
      }

      this.confirmationId.set(null);

      // Recuperamos el estado definitivo de todas las invitaciones.
      this.reload();
    } catch (error: unknown) {
      if (!this.isCurrentContext(spaceId, version)) {
        return;
      }

      this.revokeError.set(this.getRevokeError(error));
    } finally {
      if (this.isCurrentContext(spaceId, version)) {
        this.revokingId.set(null);
      }
    }
  }

  /**
   * Solicita confirmación antes de invalidar
   * el enlace anterior de una invitación.
   */
  requestResend(invitation: SpaceInvitation): void {
    if (
      invitation.status !== 'pending' ||
      invitation.space_id !== this.spaceId() ||
      this.resendingId() !== null ||
      this.revokingId() !== null
    ) {
      return;
    }

    this.confirmationId.set(null);
    this.revokeError.set(null);
    this.resendConfirmationId.set(invitation.id);
    this.resendError.set(null);
  }

  /**
   * Cancela el reenvío pendiente de confirmación.
   */
  cancelResend(): void {
    if (this.resendingId() !== null) {
      return;
    }

    this.resendConfirmationId.set(null);
    this.resendError.set(null);
  }

  /**
   * Regenera el token y solicita el envío SMTP.
   */
  async confirmResend(): Promise<void> {
    const invitationId: number | null = this.resendConfirmationId();
    const spaceId: number = this.spaceId();
    const version: number = this.contextVersion;

    const invitation: SpaceInvitation | undefined = this.invitations().find(
      (item: SpaceInvitation): boolean => item.id === invitationId,
    );

    if (
      invitationId === null ||
      invitation === undefined ||
      invitation.status !== 'pending' ||
      invitation.space_id !== spaceId ||
      this.resendingId() !== null ||
      this.revokingId() !== null
    ) {
      return;
    }

    this.resendingId.set(invitationId);
    this.resendError.set(null);

    try {
      const response: CreateSpaceInvitationResponse = await firstValueFrom(
        this.spacesService.resendInvitation({ invitationId }),
      );

      if (!this.isCurrentContext(spaceId, version)) {
        return;
      }

      if (
        !response.success ||
        !response.invitation ||
        response.invitation.id !== invitationId ||
        response.invitation.space_id !== spaceId ||
        response.invitation.email !== invitation.email ||
        typeof response.email_sent !== 'boolean' ||
        !/^[a-f0-9]{64}$/.test(response.invitation.token)
      ) {
        this.resendError.set('No se ha podido confirmar el reenvío.');
        return;
      }

      // El resultado nuevo sustituye cualquier enlace
      // que todavía estuviera visible.
      this.showDelivery(response);
      this.resendConfirmationId.set(null);
      this.reload();
    } catch (error: unknown) {
      if (!this.isCurrentContext(spaceId, version)) {
        return;
      }

      this.resendError.set(this.getResendError(error));
    } finally {
      if (this.isCurrentContext(spaceId, version)) {
        this.resendingId.set(null);
      }
    }
  }

  /**
   * Traduce los errores del reenvío.
   */
  private getResendError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'La invitación indicada no es válida.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para reenviar esta invitación.';

        case 409:
          return (
            'No se puede reenviar todavía. Debe transcurrir ' +
            'al menos un minuto desde el último envío y ' +
            'la invitación debe continuar pendiente.'
          );

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido reenviar la invitación. Inténtalo de nuevo.';
  }

  /**
   * Comprueba que seguimos en el mismo espacio y componente.
   */
  private isCurrentContext(spaceId: number, version: number): boolean {
    return (
      !this.destroyRef.destroyed && this.spaceId() === spaceId && this.contextVersion === version
    );
  }

  /**
   * Traduce los errores de revocación a mensajes para el usuario.
   */
  private getRevokeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'La invitación indicada no es válida.';

        case 403:
          return 'No tienes permiso para revocar esta invitación.';

        case 409:
          return 'La invitación ya no está pendiente. Actualiza el listado.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido revocar la invitación. Inténtalo de nuevo.';
  }
}
