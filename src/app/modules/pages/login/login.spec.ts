import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import AuthStore from '@auth/auth.store';
import { LoginResponse } from '@interfaces/auth.interfaces';
import Login from '@pages/login/login';
import AuthService from '@services/auth.service';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let authService: AuthService;
  let authStore: AuthStore;
  let router: Router;

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * Simula el envío del formulario HTML.
   */
  function sendForm(): void {
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const form: HTMLFormElement | null = element.querySelector('form');

    if (form === null) {
      throw new Error('No se ha encontrado el formulario de login.');
    }

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it('no envía datos inválidos a la API', async (): Promise<void> => {
    const loginSpy = vi.spyOn(authService, 'login');

    component.loginModel.set({
      email: 'correo-invalido',
      password: '',
    });

    sendForm();
    await fixture.whenStable();

    expect(component.loginForm.email().invalid()).toBe(true);
    expect(component.loginForm.email().touched()).toBe(true);
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('inicia la sesión y navega al dashboard', async (): Promise<void> => {
    const response: LoginResponse = {
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
    };

    vi.spyOn(authService, 'login').mockReturnValue(of(response));
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.loginModel.set({
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });

    sendForm();
    await fixture.whenStable();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });
    expect(authStore.isAuthenticated()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('muestra un error cuando las credenciales son incorrectas', async (): Promise<void> => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Unauthorized',
          }),
      ),
    );

    component.loginModel.set({
      email: 'usuario@example.com',
      password: 'password-incorrecta',
    });

    sendForm();
    await fixture.whenStable();

    expect(authStore.isAuthenticated()).toBe(false);
    expect(component.loginForm.password().errors()[0]?.message).toBe(
      'Correo electrónico o contraseña incorrectos.',
    );
  });
});
