import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import AuthStore from '@auth/auth.store';
import type AcceptSpaceInvitationResponse from '@interfaces/accept-space-invitation-response.interface';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import AcceptInvitation from '@modules/spaces/accept-invitation/accept-invitation';
import SpacesService from '@services/spaces.service';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('AcceptInvitation', () => {
  let fixture: ComponentFixture<AcceptInvitation>;
  let component: AcceptInvitation;
  let service: SpacesService;
  let authStore: AuthStore;

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AcceptInvitation],
      providers: [provideHttpClient()],
    }).compileComponents();

    service = TestBed.inject(SpacesService);
    authStore = TestBed.inject(AuthStore);

    const login: LoginResponse = {
      success: true,
      token: 'jwt-de-prueba',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 2,
        name: 'Usuario invitado',
        email: 'invitado@example.com',
      },
      error: null,
      message: null,
    };

    authStore.start(login);

    fixture = TestBed.createComponent(AcceptInvitation);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    authStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function submitForm(): void {
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const form: HTMLFormElement | null = element.querySelector('form');

    if (form === null) {
      throw new Error('No se ha encontrado el formulario.');
    }

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it('no envía tokens con un formato incorrecto', async (): Promise<void> => {
    const acceptSpy = vi.spyOn(service, 'acceptInvitation');

    component.invitationModel.set({
      token: 'token-incorrecto',
    });

    submitForm();
    await fixture.whenStable();

    expect(component.invitationForm.token().invalid()).toBe(true);
    expect(acceptSpy).not.toHaveBeenCalled();
  });

  it('acepta la invitación y emite el nuevo espacio', async (): Promise<void> => {
    const response: AcceptSpaceInvitationResponse = {
      success: true,
      space: {
        id: 8,
        name: 'Familia',
        type: 'shared',
        owner_id: 1,
        is_owner: false,
      },
      error: null,
      message: null,
    };

    const acceptSpy = vi.spyOn(service, 'acceptInvitation').mockReturnValue(of(response));

    const emitSpy = vi.spyOn(component.accepted, 'emit');

    component.invitationModel.set({
      token: `  ${'A'.repeat(64)}  `,
    });

    submitForm();
    await fixture.whenStable();

    expect(acceptSpy).toHaveBeenCalledWith({
      token: 'a'.repeat(64),
    });

    expect(emitSpy).toHaveBeenCalledWith(response.space);
    expect(component.invitationModel().token).toBe('');
  });

  it('rechaza una invitación dirigida a otra cuenta', async (): Promise<void> => {
    vi.spyOn(service, 'acceptInvitation').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
          }),
      ),
    );

    const emitSpy = vi.spyOn(component.accepted, 'emit');

    component.invitationModel.set({
      token: 'a'.repeat(64),
    });

    submitForm();
    await fixture.whenStable();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.invitationForm().errors()[0]?.message).toContain('pertenece a otra cuenta');
  });

  it('no acepta una invitación sin sesión', async (): Promise<void> => {
    const acceptSpy = vi.spyOn(service, 'acceptInvitation');

    authStore.clear();

    component.invitationModel.set({
      token: 'a'.repeat(64),
    });

    submitForm();
    await fixture.whenStable();

    expect(acceptSpy).not.toHaveBeenCalled();
    expect(component.accepted).toBeDefined();
  });
});
