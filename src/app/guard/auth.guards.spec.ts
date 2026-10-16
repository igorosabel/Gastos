import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import AuthStore from '@auth/auth.store';
import { authGuard, guestGuard } from '@guard/auth.guards';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Auth guards', () => {
  let store: AuthStore;
  let router: Router;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  it('redirige al login cuando no hay sesión', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeInstanceOf(UrlTree);

    if (result instanceof UrlTree) {
      expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fdashboard');
    }
  });

  it('permite acceder a una ruta privada con sesión', () => {
    store.start({
      success: true,
      token: 'jwt-de-prueba',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 1,
        name: 'Usuario',
        email: 'usuario@example.com',
      },
      error: null,
      message: null,
    });

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
  });

  it('permite abrir el login cuando no hay sesión', () => {
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));

    expect(result).toBe(true);
  });
});
