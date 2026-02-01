import { Injectable, WritableSignal, computed, effect, signal } from '@angular/core';
import { LoginResponse, SessionData, UserSummary } from '@interfaces/interfaces';
import { UserInterface } from '@interfaces/models/user.interfaces';

const LS_KEY = 'gastos.session.v1';

@Injectable({ providedIn: 'root' })
export default class AuthStore {
  private _user: WritableSignal<UserSummary | null> = signal<UserSummary | null>(null);
  private _accessToken = signal<string | null>(null);
  private _accessExpires = signal<number | null>(null); // epoch ms
  private _refreshToken = signal<string | null>(null); // si no usas cookie

  readonly isAuthenticated = computed(() => {
    const t = this._accessToken();
    const exp = this._accessExpires();
    return !!t && !!exp && Date.now() < exp;
  });

  constructor() {
    effect(() => {
      const data: SessionData = {
        user: this._user(),
        refreshToken: this._refreshToken() ?? undefined,
        accessToken: this._accessToken() ?? undefined,
        accessExpiresAt: this._accessExpires() ?? undefined,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    });
  }

  hydrate(): void {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as SessionData;
      this._user.set(data.user ?? null);
      this._refreshToken.set(data.refreshToken ?? null);
      this._accessToken.set(data.accessToken ?? null);
      this._accessExpires.set(data.accessExpiresAt ?? null);
    } catch (err) {
      console.error(err);
    }
  }

  applyLoginResponse(res: LoginResponse): void {
    this._user.set(res.user);

    const now: number = Date.now();
    const expiresAt: number = now + res.tokens.expiresIn * 1000;
    this._accessToken.set(res.tokens.accessToken);
    this._accessExpires.set(expiresAt);

    if (res.tokens.refreshToken) {
      this._refreshToken.set(res.tokens.refreshToken);
    }
  }

  applyTokens(access_token: string, expires_in: number, refresh_token?: string): void {
    this._accessToken.set(access_token);
    this._accessExpires.set(Date.now() + expires_in * 1000);
    if (refresh_token) {
      this._refreshToken.set(refresh_token);
    }
  }

  clear(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._accessExpires.set(null);
    this._refreshToken.set(null);
    localStorage.removeItem(LS_KEY);
  }

  updateUser(user: UserInterface): void {
    const current: UserSummary | null = this.user();
    if (current) {
      current.username = user.username ?? current.username;
      this._user.set(current);
    }
  }

  user(): UserSummary | null {
    return this._user();
  }

  accessToken(): string | null {
    return this._accessToken();
  }

  refreshToken(): string | null {
    return this._refreshToken();
  }
}
