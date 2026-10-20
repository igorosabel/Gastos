import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  PLATFORM_ID,
  Service,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';

const STORAGE_KEY: string = 'gastos.pending-invitation.v1';

@Service()
export default class PendingInvitationStore {
  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly storage: Storage | null = this.getStorage();

  private readonly tokenState: WritableSignal<string | null> = signal<string | null>(
    this.restore(),
  );

  readonly token: Signal<string | null> = this.tokenState.asReadonly();

  /**
   * Conserva únicamente tokens con el formato
   * reconocido por ApiGastos.
   */
  save(token: string): boolean {
    if (token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
      this.clear();
      return false;
    }

    this.tokenState.set(token);

    try {
      this.storage?.setItem(STORAGE_KEY, token);
    } catch {
      // La invitación sigue disponible en memoria.
    }

    return true;
  }

  /**
   * Elimina una invitación aceptada o descartada.
   */
  clear(): void {
    this.tokenState.set(null);

    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // El estado en memoria ya se ha limpiado.
    }
  }

  private getStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  }

  private restore(): string | null {
    try {
      const token: string | null = this.storage?.getItem(STORAGE_KEY) ?? null;

      if (token !== null && token.length === 64 && /^[a-f0-9]{64}$/.test(token)) {
        return token;
      }

      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // El almacenamiento es opcional.
    }

    return null;
  }
}
