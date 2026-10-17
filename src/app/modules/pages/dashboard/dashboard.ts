import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type Space from '@model/spaces/space.model';
import AcceptInvitation from '@modules/spaces/accept-invitation/accept-invitation';
import CreateSpace from '@modules/spaces/create-space/create-space';
import SpaceInvitations from '@modules/spaces/space-invitations/space-invitations';
import { ButtonDirective } from 'primeng/button';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-dashboard',
  imports: [
    ButtonDirective,
    FormsModule,
    SelectModule,
    CreateSpace,
    SpaceInvitations,
    AcceptInvitation,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Dashboard implements OnInit {
  readonly authStore: AuthStore = inject(AuthStore);
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly router: Router = inject(Router);

  readonly creatingSpace: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Muestra el formulario de creación.
   */
  openCreateSpace(): void {
    this.creatingSpace.set(true);
  }

  /**
   * Oculta el formulario sin crear nada.
   */
  cancelCreateSpace(): void {
    this.creatingSpace.set(false);
  }

  /**
   * Registra y selecciona el espacio recién creado.
   */
  onSpaceCreated(space: Space): void {
    const added: boolean = this.spaceStore.addCreated(space);

    this.creatingSpace.set(false);

    if (!added) {
      // Si cambió la sesión o el estado, recuperar el listado real.
      void this.spaceStore.load();
    }
  }

  /**
   * Recupera los espacios al entrar en el dashboard.
   */
  ngOnInit(): void {
    void this.spaceStore.load();
  }

  /**
   * Actualiza la selección del espacio activo.
   */
  selectSpace(spaceId: number | null): void {
    if (typeof spaceId === 'number') {
      this.spaceStore.select(spaceId);
    }
  }

  /**
   * Reintenta la consulta de espacios.
   */
  reloadSpaces(): void {
    void this.spaceStore.load();
  }

  readonly acceptingInvitation: WritableSignal<boolean> = signal<boolean>(false);

  readonly acceptanceMessage: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Abre el formulario para aceptar una invitación.
   */
  openAcceptInvitation(): void {
    this.acceptanceMessage.set(null);
    this.acceptingInvitation.set(true);
  }

  /**
   * Cierra el formulario sin realizar ninguna operación.
   */
  cancelAcceptInvitation(): void {
    this.acceptingInvitation.set(false);
  }

  /**
   * Incorpora el espacio compartido tras aceptar la invitación.
   */
  onInvitationAccepted(space: Space): void {
    const added: boolean = this.spaceStore.addAccepted(space);

    this.acceptingInvitation.set(false);

    if (!added) {
      this.acceptanceMessage.set(
        'La invitación se ha aceptado. Actualiza el listado de espacios para verla.',
      );

      void this.spaceStore.load();
      return;
    }

    this.acceptanceMessage.set(`Te has unido al espacio «${space.name}».`);
  }

  /**
   * Cierra la sesión y elimina los datos del espacio.
   */
  logout(): void {
    this.spaceStore.clear();
    this.authStore.clear();
    void this.router.navigateByUrl('/login');
  }
}
