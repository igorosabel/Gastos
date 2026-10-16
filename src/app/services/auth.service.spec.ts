import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { LoginResponse } from '@interfaces/auth.interfaces';
import AuthService from '@services/auth.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('envía el login con email y contraseña', () => {
    const payload = {
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    };

    const response = {
      success: true,
      token: 'jwt-de-prueba',
      expires_at: 1800000000,
      user: {
        id: 1,
        name: 'Usuario',
        email: 'usuario@example.com',
      },
      error: null,
      message: null,
    };

    let result: LoginResponse | undefined;

    service.login(payload).subscribe((data) => {
      result = data;
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('envía los datos de registro', () => {
    const payload = {
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    };

    service.register(payload).subscribe((data) => {
      expect(data.success).toBe(true);
      expect(data.user_id).toBe(1);
      expect(data.space_id).toBe(2);
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/register`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush({
      success: true,
      user_id: 1,
      space_id: 2,
      error: null,
      message: null,
    });
  });

  it('obtiene el usuario mediante GET /auth/me', () => {
    service.me().subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.user.email).toBe('usuario@example.com');
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/me`);

    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      user: {
        id: 1,
        name: 'Usuario',
        email: 'usuario@example.com',
      },
    });
  });
});
