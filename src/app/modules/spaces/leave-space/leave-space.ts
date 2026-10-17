import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import AuthStore from '@auth/auth.store';
import type { ApiResponse, AuthUser } from '@interfaces/auth.interfaces';
import type Space from '@model/spaces/space.model';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-leave-space',
  imports: [ButtonDirective],
  templateUrl: './leave-space.html',
  styleUrl: './leave-space.scss',
})
export default class LeaveSpace {
  private readonly spacesService: SpacesService = inject(SpacesService);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly space: InputSignal<Space | null> = input<Space | null>(null);
  readonly left: OutputEmitterRef<number> = output<number>();

  readonly confirming: WritableSignal<boolean> = signal<boolean>(false);
  readonly leavingId: WritableSignal<number | null> = signal<number | null>(null);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private currentSpaceId: number | null = null;

  constructor() {
    effect((): void => {
      const spaceId: number | null = this.space()?.id ?? null;

      if (spaceId !== this.currentSpaceId) {
        this.currentSpaceId = spaceId;
        this.confirming.set(false);
        this.error.set(null);
      }
    });
  }

  /**
   * Solicita confirmación antes de abandonar un espacio.
   */
  requestLeave(): void {
    const space: Space | null = this.space();

    if (space === null || space.type !== 'shared' || space.is_owner || this.leavingId() !== null) {
      return;
    }

    this.error.set(null);
    this.confirming.set(true);
  }

  /**
   * Cancela la operación sin contactar con ApiGastos.
   */
  cancelLeave(): void {
    if (this.leavingId() !== null) {
      return;
    }

    this.confirming.set(false);
    this.error.set(null);
  }

  /**
   * Ejecuta la salida del espacio confirmado.
   */
  async confirmLeave(): Promise<void> {
    const space: Space | null = this.space();

    if (
      space === null ||
      space.type !== 'shared' ||
      space.is_owner ||
      !this.confirming() ||
      this.leavingId() !== null
    ) {
      return;
    }

    const sessionToken: string | null = this.authStore.token();
    const user: AuthUser | null = this.authStore.user();

    if (sessionToken === null || user === null) {
      this.error.set('Debes iniciar sesión para abandonar un espacio.');
      return;
    }

    const spaceId: number = space.id;
    const userId: number = user.id;

    this.leavingId.set(spaceId);
    this.error.set(null);

    try {
      const response: ApiResponse = await firstValueFrom(
        this.spacesService.leaveSpace({ spaceId }),
      );

      if (!this.isCurrentSession(sessionToken, userId)) {
        return;
      }

      if (!response.success) {
        if (this.space()?.id === spaceId) {
          this.error.set('No se ha podido abandonar el espacio.');
        }
        return;
      }

      this.confirming.set(false);
      this.left.emit(spaceId);
    } catch (error: unknown) {
      if (!this.isCurrentSession(sessionToken, userId)) {
        return;
      }

      if (this.space()?.id === spaceId) {
        this.error.set(this.getLeaveError(error));
      }
    } finally {
      if (!this.destroyRef.destroyed) {
        this.leavingId.set(null);
      }
    }
  }

  /**
   * Descarta resultados de una sesión anterior.
   */
  private isCurrentSession(token: string, userId: number): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }

  /**
   * Traduce los errores conocidos del backend.
   */
  private getLeaveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'El espacio indicado no es válido.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para abandonar este espacio.';

        case 409:
          return 'Ya no eres miembro activo de este espacio. Actualiza el listado.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido abandonar el espacio. Inténtalo de nuevo.';
  }
}
