import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import type Space from '@model/spaces/space.model';
import AcceptInvitation from '@modules/spaces/accept-invitation/accept-invitation';
import CreateSpace from '@modules/spaces/create-space/create-space';
import LeaveSpace from '@modules/spaces/leave-space/leave-space';
import SpaceInvitations from '@modules/spaces/space-invitations/space-invitations';
import SpaceMembers from '@modules/spaces/space-members/space-members';
import { ArrowRight } from '@primeicons/angular';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-settings',
  imports: [
    RouterLink,
    ButtonDirective,
    CreateSpace,
    AcceptInvitation,
    LeaveSpace,
    SpaceInvitations,
    SpaceMembers,
    ArrowRight,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export default class Settings {
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  readonly creatingSpace: WritableSignal<boolean> = signal<boolean>(false);
  readonly acceptingInvitation: WritableSignal<boolean> = signal<boolean>(false);
  readonly acceptanceMessage: WritableSignal<string | null> = signal<string | null>(null);
  readonly membershipMessage: WritableSignal<string | null> = signal<string | null>(null);

  openCreateSpace(): void {
    this.creatingSpace.set(true);
  }

  cancelCreateSpace(): void {
    this.creatingSpace.set(false);
  }

  onSpaceCreated(space: Space): void {
    const added: boolean = this.spaceStore.addCreated(space);

    this.creatingSpace.set(false);

    if (!added) {
      void this.spaceStore.load();
    }
  }

  openAcceptInvitation(): void {
    this.acceptanceMessage.set(null);
    this.acceptingInvitation.set(true);
  }

  cancelAcceptInvitation(): void {
    this.acceptingInvitation.set(false);
  }

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

  onSpaceLeft(spaceId: number): void {
    const space: Space | undefined = this.spaceStore
      .spaces()
      .find((item: Space): boolean => item.id === spaceId);

    const removed: boolean = this.spaceStore.removeAfterLeave(spaceId);

    if (!removed) {
      void this.spaceStore.load();
      return;
    }

    this.membershipMessage.set(`Has abandonado el espacio «${space?.name ?? 'compartido'}».`);
  }
}
