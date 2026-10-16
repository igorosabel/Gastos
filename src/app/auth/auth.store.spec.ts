import { TestBed } from '@angular/core/testing';
import AuthStore from '@auth/auth.store';
import { LoginResponse } from '@interfaces/auth.interfaces';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('AuthStore', () => {
  const storageKey = 'gastos.auth.v1';

  const validLogin = (): LoginResponse => ({
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

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('inicia una sesión y conserva sus datos', () => {
    const store = TestBed.inject(AuthStore);

    expect(store.start(validLogin())).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('jwt-de-prueba');
    expect(store.user()?.email).toBe('usuario@example.com');

    expect(sessionStorage.getItem(storageKey)).not.toBeNull();
  });

  it('recupera una sesión al inicializarse', () => {
    const response = validLogin();

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        token: response.token,
        expires_at: response.expires_at,
        user: response.user,
      }),
    );

    const store = TestBed.inject(AuthStore);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.name).toBe('Usuario');
  });

  it('rechaza sesiones caducadas', () => {
    const store = TestBed.inject(AuthStore);

    const expired = {
      ...validLogin(),
      expires_at: Math.floor(Date.now() / 1000) - 10,
    };

    expect(store.start(expired)).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('rechaza datos almacenados inválidos', () => {
    sessionStorage.setItem(storageKey, '{"token":"incorrecto"}');

    const store = TestBed.inject(AuthStore);

    expect(store.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it('elimina completamente la sesión al cerrar', () => {
    const store = TestBed.inject(AuthStore);

    store.start(validLogin());
    store.clear();

    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it('no elimina otra sesión al recibir un JWT anterior', () => {
    const store = TestBed.inject(AuthStore);

    store.start(validLogin());

    expect(store.clearIfToken('token-antiguo')).toBe(false);
    expect(store.token()).toBe('jwt-de-prueba');

    expect(store.clearIfToken('jwt-de-prueba')).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
  });
});
