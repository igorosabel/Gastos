import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { LoginResponse } from '@interfaces/auth.interfaces';
import StoredSession from '@interfaces/session.interfaces';

const STORAGE_KEY = 'gastos.auth.v1';

@Service()
export default class AuthStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = this.getStorage();
  private readonly session = signal<StoredSession | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);

  /**
   * Establece una sesión a partir de un login correcto.
   * Devuelve false si la respuesta no contiene una sesión válida.
   */
  start(response: LoginResponse): boolean {
    const session = {
      token: response.token,
      expires_at: response.expires_at,
      user: response.user,
    };

    if (!response.success || !this.isValidSession(session)) {
      return false;
    }

    this.session.set(session);

    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // La sesión continúa funcionando en memoria.
    }

    return true;
  }

  /**
   * Devuelve el JWT vigente o null.
   * Una sesión caducada se elimina al consultarla.
   */
  token(): string | null {
    const current = this.session();

    if (!current) {
      return null;
    }

    if (current.expires_at <= Math.floor(Date.now() / 1000)) {
      this.clear();
      return null;
    }

    return current.token;
  }

  /**
   * Indica si existe un JWT que todavía no ha caducado.
   */
  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  /**
   * Invalida una sesión únicamente si corresponde al JWT indicado.
   * Evita borrar una sesión nueva por una respuesta HTTP antigua.
   */
  clearIfToken(token: string): boolean {
    if (this.session()?.token !== token) {
      return false;
    }

    this.clear();
    return true;
  }

  /**
   * Cierra la sesión localmente.
   */
  clear(): void {
    this.session.set(null);

    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // La sesión en memoria ya está eliminada.
    }
  }

  /**
   * Obtiene el almacenamiento de la pestaña cuando está disponible.
   */
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

  /**
   * Recupera una sesión persistida, descartando datos inválidos.
   */
  private restore(): StoredSession | null {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);

      if (this.isValidSession(parsed)) {
        return parsed;
      }

      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      try {
        this.storage?.removeItem(STORAGE_KEY);
      } catch {
        // No hay almacenamiento disponible.
      }
    }

    return null;
  }

  /**
   * Valida la estructura y vigencia de una sesión.
   */
  private isValidSession(value: unknown): value is StoredSession {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const session = value as Record<string, unknown>;
    const token = session['token'];
    const expiresAt = session['expires_at'];
    const user = session['user'];

    if (
      typeof token !== 'string' ||
      token.length === 0 ||
      typeof expiresAt !== 'number' ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Math.floor(Date.now() / 1000) ||
      typeof user !== 'object' ||
      user === null
    ) {
      return false;
    }

    const account = user as Record<string, unknown>;
    const id = account['id'];

    return (
      typeof id === 'number' &&
      Number.isSafeInteger(id) &&
      id > 0 &&
      typeof account['name'] === 'string' &&
      typeof account['email'] === 'string'
    );
  }
}
