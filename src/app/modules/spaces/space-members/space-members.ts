import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import type SpaceMembersResponse from '@interfaces/spaces/space-members-response.interface';
import type SpaceMember from '@model/spaces/space-member.model';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-space-members',
  imports: [ButtonDirective],
  templateUrl: './space-members.html',
  styleUrl: './space-members.scss',
})
export default class SpaceMembers {
  private readonly spacesService: SpacesService = inject(SpacesService);

  readonly spaceId: InputSignal<number> = input.required<number>();

  readonly members: WritableSignal<SpaceMember[]> = signal<SpaceMember[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number = this.spaceId();

      // Permite repetir la consulta manualmente.
      this.refreshVersion();

      this.members.set([]);
      this.loading.set(true);
      this.error.set(null);

      const subscription: Subscription = this.spacesService.getMembers(spaceId).subscribe({
        next: (response: SpaceMembersResponse): void => {
          if (this.spaceId() !== spaceId) {
            return;
          }

          if (!response.success) {
            this.error.set('No se han podido consultar los miembros.');
          } else {
            this.members.set(response.members);
          }

          this.loading.set(false);
        },
        error: (error: unknown): void => {
          if (this.spaceId() !== spaceId) {
            return;
          }

          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.error.set('No tienes permiso para consultar los miembros.');
          } else {
            this.error.set('No se han podido consultar los miembros.');
          }

          this.loading.set(false);
        },
      });

      // Evita mezclar respuestas de distintos espacios.
      onCleanup((): void => {
        subscription.unsubscribe();
      });
    });
  }

  /**
   * Actualiza el listado desde ApiGastos.
   */
  reload(): void {
    this.refreshVersion.update((version: number): number => version + 1);
  }
}
