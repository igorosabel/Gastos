import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import AuthStore from '@auth/auth.store';
import type { ApiResponse, LoginResponse } from '@interfaces/auth.interfaces';
import type Space from '@model/spaces/space.model';
import LeaveSpace from '@modules/spaces/leave-space/leave-space';
import SpacesService from '@services/spaces.service';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('LeaveSpace', (): void => {
  let fixture: ComponentFixture<LeaveSpace>;
  let component: LeaveSpace;
  let authStore: AuthStore;
  let spacesService: SpacesService;

  const sharedSpace: Space = {
    id: 8,
    name: 'Familia',
    type: 'shared',
    owner_id: 1,
    is_owner: false,
  };

  const successResponse: ApiResponse = {
    success: true,
    error: null,
    message: null,
  };

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LeaveSpace],
      providers: [provideHttpClient()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    spacesService = TestBed.inject(SpacesService);

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

    fixture = TestBed.createComponent(LeaveSpace);
    fixture.componentRef.setInput('space', sharedSpace);

    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    authStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('permite cancelar sin enviar ninguna petición', (): void => {
    const leaveSpy = vi.spyOn(spacesService, 'leaveSpace');

    component.requestLeave();

    expect(component.confirming()).toBe(true);
    expect(leaveSpy).not.toHaveBeenCalled();

    component.cancelLeave();

    expect(component.confirming()).toBe(false);
    expect(leaveSpy).not.toHaveBeenCalled();
  });

  it('abandona el espacio y emite su identificador', async (): Promise<void> => {
    const leaveSpy = vi.spyOn(spacesService, 'leaveSpace').mockReturnValue(of(successResponse));

    const emitSpy = vi.spyOn(component.left, 'emit');

    component.requestLeave();
    await component.confirmLeave();

    expect(leaveSpy).toHaveBeenCalledWith({ spaceId: 8 });
    expect(emitSpy).toHaveBeenCalledWith(8);
    expect(component.leavingId()).toBeNull();
    expect(component.confirming()).toBe(false);
  });

  it('no permite abandonar un espacio propio', async (): Promise<void> => {
    const leaveSpy = vi.spyOn(spacesService, 'leaveSpace');

    fixture.componentRef.setInput('space', {
      ...sharedSpace,
      is_owner: true,
      owner_id: 2,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    component.requestLeave();
    await component.confirmLeave();

    expect(component.confirming()).toBe(false);
    expect(leaveSpy).not.toHaveBeenCalled();
  });

  it('muestra el error de permisos sin completar la salida', async (): Promise<void> => {
    vi.spyOn(spacesService, 'leaveSpace').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
          }),
      ),
    );

    const emitSpy = vi.spyOn(component.left, 'emit');

    component.requestLeave();
    await component.confirmLeave();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.error()).toContain('permiso');
    expect(component.confirming()).toBe(true);
    expect(component.leavingId()).toBeNull();
  });

  it('impide realizar dos solicitudes simultáneas', async (): Promise<void> => {
    const pending: Subject<ApiResponse> = new Subject<ApiResponse>();

    const leaveSpy = vi.spyOn(spacesService, 'leaveSpace').mockReturnValue(pending.asObservable());

    component.requestLeave();

    const firstRequest: Promise<void> = component.confirmLeave();
    const secondRequest: Promise<void> = component.confirmLeave();

    expect(leaveSpy).toHaveBeenCalledTimes(1);

    pending.next(successResponse);
    pending.complete();

    await Promise.all([firstRequest, secondRequest]);
  });

  it('conserva el id original si cambia el espacio durante la petición', async (): Promise<void> => {
    const pending: Subject<ApiResponse> = new Subject<ApiResponse>();

    vi.spyOn(spacesService, 'leaveSpace').mockReturnValue(pending.asObservable());

    const emitSpy = vi.spyOn(component.left, 'emit');

    component.requestLeave();

    const operation: Promise<void> = component.confirmLeave();

    fixture.componentRef.setInput('space', {
      id: 9,
      name: 'Otro espacio',
      type: 'shared',
      owner_id: 3,
      is_owner: false,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.confirming()).toBe(false);

    pending.next(successResponse);
    pending.complete();

    await operation;

    expect(emitSpy).toHaveBeenCalledWith(8);
    expect(component.leavingId()).toBeNull();
  });

  it('ignora una respuesta recibida después de cerrar sesión', async (): Promise<void> => {
    const pending: Subject<ApiResponse> = new Subject<ApiResponse>();

    vi.spyOn(spacesService, 'leaveSpace').mockReturnValue(pending.asObservable());

    const emitSpy = vi.spyOn(component.left, 'emit');

    component.requestLeave();

    const operation: Promise<void> = component.confirmLeave();

    authStore.clear();

    pending.next(successResponse);
    pending.complete();

    await operation;

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
