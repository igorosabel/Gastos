import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import PendingInvitationStore from '@app/spaces/pending-invitation.store';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type AcceptSpaceInvitationResponse from '@interfaces/spaces/accept-space-invitation-response.interface';
import type Space from '@model/spaces/space.model';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-invitation-link',
  imports: [RouterLink, ButtonDirective],
  templateUrl: './invitation-link.html',
  styleUrl: './invitation-link.scss',
})
export default class InvitationLink {
  readonly authStore: AuthStore = inject(AuthStore);
  readonly pendingInvitation: PendingInvitationStore = inject(PendingInvitationStore);

  private readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly spacesService: SpacesService = inject(SpacesService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly location: Location = inject(Location);

  readonly submitting: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly warning: WritableSignal<string | null> = signal<string | null>(null);
  readonly acceptedSpace: WritableSignal<Space | null> = signal<Space | null>(null);

  readonly invalidLink: boolean;

  constructor() {
    const fragment: string | null = this.route.snapshot.fragment;

    if (fragment === null) {
      this.invalidLink = false;
      return;
    }

    const params: URLSearchParams = new URLSearchParams(fragment);

    const token: string = params.get('token') ?? '';

    this.invalidLink = !this.pendingInvitation.save(token);

    // Retirar el token de la URL y del historial visible.
    this.location.replaceState('/invitacion');
  }

  /**
   * Acepta la invitación únicamente tras una
   * confirmación explícita del destinatario.
   */
  async accept(): Promise<void> {
    const invitationToken: string | null = this.pendingInvitation.token();
    const sessionToken: string | null = this.authStore.token();
    const userId: number | undefined = this.authStore.user()?.id;

    if (
      this.submitting() ||
      this.acceptedSpace() !== null ||
      invitationToken === null ||
      sessionToken === null ||
      userId === undefined
    ) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.warning.set(null);

    try {
      const response: AcceptSpaceInvitationResponse = await firstValueFrom(
        this.spacesService.acceptInvitation({
          token: invitationToken,
        }),
      );

      // Una respuesta antigua no debe afectar
      // a otra sesión iniciada posteriormente.
      if (this.authStore.token() !== sessionToken || this.authStore.user()?.id !== userId) {
        return;
      }

      if (!response.success || response.space === null || response.space.type !== 'shared') {
        this.error.set('No se ha podido confirmar la aceptación.');
        return;
      }

      const space: Space = response.space;

      // El token no debe seguir disponible una vez
      // consumida correctamente la invitación.
      this.pendingInvitation.clear();

      if (!this.spaceStore.addAccepted(space)) {
        // Esta página es pública y puede abrirse
        // sin haber inicializado el layout privado.
        await this.spaceStore.load();

        if (!this.spaceStore.select(space.id)) {
          this.warning.set(
            'La invitación se ha aceptado, pero no se ha ' +
              'podido seleccionar el espacio. ' +
              'Podrás actualizar tus espacios desde la aplicación.',
          );
        }
      }

      this.acceptedSpace.set(space);
    } catch (error: unknown) {
      if (this.authStore.token() !== sessionToken || this.authStore.user()?.id !== userId) {
        return;
      }

      this.error.set(this.getAcceptanceError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Permite iniciar sesión con otra cuenta
   * sin perder la invitación pendiente.
   */
  changeAccount(): void {
    if (this.submitting()) {
      return;
    }

    this.spaceStore.clear();
    this.authStore.clear();

    void this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/invitacion',
      },
    });
  }

  /**
   * Descartar no revoca la invitación del backend:
   * solo elimina el enlace de esta pestaña.
   */
  discard(): void {
    if (this.submitting()) {
      return;
    }

    this.pendingInvitation.clear();

    void this.router.navigateByUrl(this.authStore.isAuthenticated() ? '/dashboard' : '/login');
  }

  private getAcceptanceError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'El enlace de invitación no es válido.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return (
            'Esta invitación está dirigida a otra cuenta. ' +
            'Inicia sesión con el correo que recibió la invitación.'
          );

        case 409:
          return 'La invitación ha caducado, ha sido revocada ' + 'o ya se ha utilizado.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido aceptar la invitación. ' + 'Inténtalo de nuevo.';
  }
}
