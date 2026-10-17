
import {
  Component,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import type SpaceInvitationsResponse from '@interfaces/space-invitations-response.interface';
import type SpaceInvitation from '@model/spaces/space-invitation.model';
import CreateInvitation from '@modules/spaces/create-invitation/create-invitation';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-space-invitations',
  imports: [ButtonDirective, CreateInvitation],
  templateUrl: './space-invitations.html',
  styleUrl: './space-invitations.scss',
})
export default class SpaceInvitations {
  private readonly spacesService: SpacesService = inject(SpacesService);

  readonly spaceId: InputSignal<number> = input.required<number>();

  readonly invitations: WritableSignal<SpaceInvitation[]> =
    signal<SpaceInvitation[]>([]);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly creating: WritableSignal<boolean> = signal<boolean>(false);
  readonly createdToken: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);
  private loadedSpaceId: number | null = null;

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number = this.spaceId();

      // Esta lectura permite repetir la consulta tras crear
      // una invitación o solicitar un reintento.
      this.refreshVersion();

      if (this.loadedSpaceId !== spaceId) {
        this.loadedSpaceId = spaceId;
        this.invitations.set([]);
        this.creating.set(false);
        this.createdToken.set(null);
      }

      this.loading.set(true);
      this.error.set(null);

      const subscription: Subscription = this.spacesService
        .getInvitations(spaceId)
        .subscribe({
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

      // Cancelar la carga anterior al cambiar de espacio
      // y cuando se destruya el componente.
      onCleanup((): void => {
        subscription.unsubscribe();
      });
    });
  }

  reload(): void {
    this.refreshVersion.update((version: number): number => version + 1);
  }

  openCreate(): void {
    this.creating.set(true);
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  onCreated(token: string): void {
    this.createdToken.set(token);
    this.creating.set(false);
    this.reload();
  }

  hideToken(): void {
    this.createdToken.set(null);
  }
}
