import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import authInterceptor from '@interceptors/auth.interceptor';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let store: AuthStore;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    controller.verify();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const login = (storeToLogin: AuthStore): void => {
    storeToLogin.start({
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
  };

  it('adjunta el JWT a las peticiones privadas', () => {
    login(store);

    http.get(`${environment.apiUrl}/auth/me`).subscribe();

    const request = controller.expectOne(`${environment.apiUrl}/auth/me`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');

    request.flush({
      success: true,
      user: { id: 1, name: 'Usuario', email: 'usuario@example.com' },
    });
  });

  it('no envía el JWT a dominios externos', () => {
    login(store);

    http.get('https://externo.example.com/datos').subscribe();

    const request = controller.expectOne('https://externo.example.com/datos');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });

  it('no envía el JWT al endpoint público de login', () => {
    login(store);

    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();

    const request = controller.expectOne(`${environment.apiUrl}/auth/login`);

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });

  it('elimina la sesión cuando la API rechaza el JWT', () => {
    login(store);

    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    http.get(`${environment.apiUrl}/auth/me`).subscribe({
      error: () => {
        // El error HTTP es esperado.
      },
    });

    const request = controller.expectOne(`${environment.apiUrl}/auth/me`);

    request.flush(
      { success: false, error: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(store.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
