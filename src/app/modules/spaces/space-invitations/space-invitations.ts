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
import type RevokeSpaceInvitationResponse from '@interfaces/revoke-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/space-invitations-response.interface';
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

  readonly spaceId: InputSignal<number> = input.required<number>();

  readonly invitations: WritableSignal<SpaceInvitation[]> = signal<SpaceInvitation[]>([]);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly creating: WritableSignal<boolean> = signal<boolean>(false);
  readonly createdToken: WritableSignal<string | null> = signal<string | null>(null);

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
        this.createdToken.set(null);
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
   * Recibe el token de una invitación recién creada.
   */
  onCreated(token: string): void {
    this.createdToken.set(token);
    this.creating.set(false);
    this.reload();
  }

  /**
   * Oculta el token, que no volverá a estar disponible.
   */
  hideToken(): void {
    this.createdToken.set(null);
  }

  /**
   * Solicita confirmación para revocar una invitación pendiente.
   */
  requestRevoke(invitation: SpaceInvitation): void {
    if (
      invitation.status !== 'pending' ||
      invitation.space_id !== this.spaceId() ||
      this.revokingId() !== null
    ) {
      return;
    }

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
      this.revokingId() !== null
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
      this.createdToken.set(null);
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
