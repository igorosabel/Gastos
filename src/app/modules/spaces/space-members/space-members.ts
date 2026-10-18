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
import AuthStore from '@auth/auth.store';
import type { ApiResponse, AuthUser } from '@interfaces/auth.interfaces';
import type SpaceMembersResponse from '@interfaces/spaces/space-members-response.interface';
import type SpaceMember from '@model/spaces/space-member.model';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { firstValueFrom, type Subscription } from 'rxjs';

@Component({
  selector: 'app-space-members',
  imports: [ButtonDirective],
  templateUrl: './space-members.html',
  styleUrl: './space-members.scss',
})
export default class SpaceMembers {
  private readonly spacesService: SpacesService = inject(SpacesService);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly spaceId: InputSignal<number> = input.required<number>();

  readonly members: WritableSignal<SpaceMember[]> = signal<SpaceMember[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly confirmationId: WritableSignal<number | null> = signal<number | null>(null);
  readonly removingId: WritableSignal<number | null> = signal<number | null>(null);
  readonly removeError: WritableSignal<string | null> = signal<string | null>(null);

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

        this.confirmationId.set(null);
        this.removingId.set(null);
        this.removeError.set(null);
      }

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

      onCleanup((): void => {
        subscription.unsubscribe();
      });
    });
  }

  /**
   * Actualiza el listado desde ApiGastos.
   */
  reload(): void {
    this.confirmationId.set(null);
    this.removeError.set(null);
    this.refreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Solicita confirmación para expulsar a un miembro.
   */
  requestRemove(member: SpaceMember): void {
    const user: AuthUser | null = this.authStore.user();

    const exists: boolean = this.members().some(
      (item: SpaceMember): boolean => item.id === member.id && !item.is_owner,
    );

    if (
      user === null ||
      !exists ||
      member.is_owner ||
      member.id === user.id ||
      this.loading() ||
      this.removingId() !== null
    ) {
      return;
    }

    this.confirmationId.set(member.id);
    this.removeError.set(null);
  }

  /**
   * Cancela la expulsión sin realizar ninguna petición.
   */
  cancelRemove(): void {
    if (this.removingId() !== null) {
      return;
    }

    this.confirmationId.set(null);
    this.removeError.set(null);
  }

  /**
   * Expulsa a un miembro después de recibir la confirmación.
   */
  async confirmRemove(): Promise<void> {
    const userId: number | null = this.confirmationId();
    const spaceId: number = this.spaceId();
    const version: number = this.contextVersion;

    const user: AuthUser | null = this.authStore.user();
    const token: string | null = this.authStore.token();

    if (
      userId === null ||
      user === null ||
      token === null ||
      this.loading() ||
      this.removingId() !== null
    ) {
      return;
    }

    const member: SpaceMember | undefined = this.members().find(
      (item: SpaceMember): boolean => item.id === userId,
    );

    if (member === undefined || member.is_owner || member.id === user.id) {
      this.confirmationId.set(null);
      return;
    }

    this.removingId.set(userId);
    this.removeError.set(null);

    try {
      const response: ApiResponse = await firstValueFrom(
        this.spacesService.removeMember({ spaceId, userId }),
      );

      if (!this.isCurrentContext(spaceId, version, token, user.id)) {
        return;
      }

      if (!response.success) {
        this.removeError.set('No se ha podido expulsar al miembro.');
        return;
      }

      // La API confirma la baja, pero volvemos a consultar
      // los miembros para mostrar el estado definitivo.
      this.reload();
    } catch (error: unknown) {
      if (!this.isCurrentContext(spaceId, version, token, user.id)) {
        return;
      }

      this.removeError.set(this.getRemoveError(error));
    } finally {
      if (this.isCurrentContext(spaceId, version, token, user.id)) {
        this.removingId.set(null);
      }
    }
  }

  /**
   * Comprueba espacio, sesión y ciclo de vida del componente.
   */
  private isCurrentContext(
    spaceId: number,
    version: number,
    token: string,
    userId: number,
  ): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.spaceId() === spaceId &&
      this.contextVersion === version &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }

  /**
   * Traduce los errores de expulsión.
   */
  private getRemoveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Los identificadores de la operación no son válidos.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para expulsar a este miembro.';

        case 409:
          return 'El usuario ya no es miembro activo. Actualiza el listado.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido expulsar al miembro. Inténtalo de nuevo.';
  }
}
