import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterResponse } from '@interfaces/auth.interfaces';
import Register from '@pages/register/register';
import AuthService from '@services/auth.service';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let authService: AuthService;
  let router: Router;

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * Simula el envío del formulario de registro.
   */
  function sendForm(): void {
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const form: HTMLFormElement | null = element.querySelector('form');

    if (form === null) {
      throw new Error('No se ha encontrado el formulario de registro.');
    }

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it('rechaza contraseñas demasiado cortas', async (): Promise<void> => {
    const registerSpy = vi.spyOn(authService, 'register');

    component.registerModel.set({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'corta',
    });

    sendForm();
    await fixture.whenStable();

    expect(component.registerForm.password().invalid()).toBe(true);
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('registra al usuario y vuelve al login', async (): Promise<void> => {
    const response: RegisterResponse = {
      success: true,
      user_id: 1,
      space_id: 2,
      error: null,
      message: null,
    };

    vi.spyOn(authService, 'register').mockReturnValue(of(response));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.registerModel.set({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });

    sendForm();
    await fixture.whenStable();

    expect(authService.register).toHaveBeenCalledWith({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
    });
  });

  it('muestra el conflicto de correo duplicado', async (): Promise<void> => {
    vi.spyOn(authService, 'register').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
          }),
      ),
    );

    component.registerModel.set({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });

    sendForm();
    await fixture.whenStable();

    expect(component.registerForm.email().errors()[0]?.message).toBe(
      'Ya existe una cuenta con ese correo electrónico.',
    );
  });
});
