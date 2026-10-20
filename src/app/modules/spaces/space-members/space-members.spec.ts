import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import AuthStore from '@auth/auth.store';
import type { ApiResponse, LoginResponse } from '@interfaces/auth.interfaces';
import type SpaceMembersResponse from '@interfaces/spaces/space-members-response.interface';
import SpaceMember from '@model/spaces/space-member.model';
import SpaceMembers from '@modules/spaces/space-members/space-members';
import SpacesService from '@services/spaces.service';
import { of, Subject, throwError, type Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SpaceMembers', () => {
  let fixture: ComponentFixture<SpaceMembers>;
  let component: SpaceMembers;
  let service: SpacesService;
  let authStore: AuthStore;

  function createResponse(spaceId: number): SpaceMembersResponse {
    return {
      success: true,
      members: [
        {
          id: spaceId,
          name: `Propietario ${spaceId}`,
          joined_at: '2026-10-16 18:30:00',
          is_owner: true,
        },
      ],
      error: null,
      message: null,
    };
  }

  async function loadGuest(): Promise<SpaceMember> {
    const member: SpaceMember = {
      id: 2,
      name: 'Invitado',
      joined_at: '2026-10-17 10:15:00',
      is_owner: false,
    };

    const response: SpaceMembersResponse = createResponse(8);

    vi.mocked(service.getMembers).mockReturnValue(
      of({
        ...response,
        members: [...response.members, member],
      }),
    );

    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    return member;
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SpaceMembers],
      providers: [provideHttpClient()],
    }).compileComponents();

    service = TestBed.inject(SpacesService);

    authStore = TestBed.inject(AuthStore);

    const login: LoginResponse = {
      success: true,
      token: 'jwt-propietario-de-prueba',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 1,
        name: 'Propietario',
        email: 'propietario@example.com',
      },
      error: null,
      message: null,
    };

    authStore.start(login);

    vi.spyOn(service, 'getMembers').mockImplementation(
      (spaceId: number): Observable<SpaceMembersResponse> => of(createResponse(spaceId)),
    );

    fixture = TestBed.createComponent(SpaceMembers);
    fixture.componentRef.setInput('spaceId', 8);

    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    authStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('carga los miembros del espacio seleccionado', (): void => {
    expect(service.getMembers).toHaveBeenCalledWith(8);
    expect(component.loading()).toBe(false);
    expect(component.members()).toEqual(createResponse(8).members);
    expect(component.members()[0]?.is_owner).toBe(true);
  });

  it('permite actualizar el listado', async (): Promise<void> => {
    component.reload();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(service.getMembers).toHaveBeenCalledTimes(2);
  });

  it('carga otros miembros al cambiar de espacio', async (): Promise<void> => {
    fixture.componentRef.setInput('spaceId', 9);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(service.getMembers).toHaveBeenCalledWith(9);
    expect(component.members()).toEqual(createResponse(9).members);
  });

  it('no mezcla una respuesta antigua con otro espacio', async (): Promise<void> => {
    const pending: Subject<SpaceMembersResponse> = new Subject<SpaceMembersResponse>();

    vi.mocked(service.getMembers).mockImplementation(
      (spaceId: number): Observable<SpaceMembersResponse> =>
        spaceId === 8 ? pending.asObservable() : of(createResponse(spaceId)),
    );

    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(true);

    fixture.componentRef.setInput('spaceId', 9);
    fixture.detectChanges();
    await fixture.whenStable();

    pending.next(createResponse(8));
    pending.complete();

    expect(component.members()).toEqual(createResponse(9).members);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('muestra el error de permisos sin exponer miembros', async (): Promise<void> => {
    vi.mocked(service.getMembers).mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
          }),
      ),
    );

    component.reload();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.members()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(component.error()).toContain('permiso');
  });

  it('permite mostrar un listado vacío', async (): Promise<void> => {
    vi.mocked(service.getMembers).mockReturnValue(
      of({
        success: true,
        members: [],
        error: null,
        message: null,
      }),
    );

    component.reload();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.members()).toEqual([]);
    expect(component.error()).toBeNull();
  });

  it('solicita confirmación sin expulsar inmediatamente', async (): Promise<void> => {
    const member: SpaceMember = await loadGuest();
    const removeSpy = vi.spyOn(service, 'removeMember');

    component.requestRemove(member);

    expect(component.confirmationId()).toBe(2);
    expect(removeSpy).not.toHaveBeenCalled();

    component.cancelRemove();

    expect(component.confirmationId()).toBeNull();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('nunca permite expulsar al propietario', (): void => {
    const owner: SpaceMember | undefined = component.members()[0];
    const removeSpy = vi.spyOn(service, 'removeMember');

    if (owner === undefined) {
      throw new Error('Falta el propietario en el test.');
    }

    component.requestRemove(owner);

    expect(component.confirmationId()).toBeNull();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('expulsa al miembro confirmado y actualiza el listado', async (): Promise<void> => {
    const member: SpaceMember = await loadGuest();

    const removeSpy = vi.spyOn(service, 'removeMember').mockReturnValue(
      of({
        success: true,
        error: null,
        message: null,
      }),
    );

    // La siguiente consulta representa el estado posterior
    // a la expulsión: únicamente continúa el propietario.
    vi.mocked(service.getMembers).mockReturnValue(of(createResponse(8)));

    component.requestRemove(member);
    await component.confirmRemove();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(removeSpy).toHaveBeenCalledWith({
      spaceId: 8,
      userId: 2,
    });

    expect(component.confirmationId()).toBeNull();
    expect(component.removingId()).toBeNull();

    expect(service.getMembers).toHaveBeenCalledTimes(3);
    expect(component.members().some((item: SpaceMember): boolean => item.id === 2)).toBe(false);
  });

  it('muestra un conflicto cuando el usuario ya no es miembro', async (): Promise<void> => {
    const member: SpaceMember = await loadGuest();

    vi.spyOn(service, 'removeMember').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
          }),
      ),
    );

    component.requestRemove(member);
    await component.confirmRemove();

    expect(component.removeError()).toContain('ya no es miembro activo');
    expect(component.confirmationId()).toBe(2);
    expect(component.removingId()).toBeNull();
  });

  it('impide enviar dos expulsiones simultáneas', async (): Promise<void> => {
    const member: SpaceMember = await loadGuest();
    const pending: Subject<ApiResponse> = new Subject<ApiResponse>();

    const removeSpy = vi.spyOn(service, 'removeMember').mockReturnValue(pending.asObservable());

    component.requestRemove(member);

    const first: Promise<void> = component.confirmRemove();
    const second: Promise<void> = component.confirmRemove();

    expect(removeSpy).toHaveBeenCalledTimes(1);

    pending.next({
      success: true,
      error: null,
      message: null,
    });
    pending.complete();

    await Promise.all([first, second]);
  });

  it('ignora una expulsión antigua al cambiar de espacio', async (): Promise<void> => {
    const member: SpaceMember = await loadGuest();
    const pending: Subject<ApiResponse> = new Subject<ApiResponse>();

    vi.spyOn(service, 'removeMember').mockReturnValue(pending.asObservable());

    component.requestRemove(member);

    const operation: Promise<void> = component.confirmRemove();

    // A partir de ahora el servicio simula el espacio 9.
    vi.mocked(service.getMembers).mockImplementation(
      (spaceId: number): Observable<SpaceMembersResponse> => of(createResponse(spaceId)),
    );

    fixture.componentRef.setInput('spaceId', 9);
    fixture.detectChanges();
    await fixture.whenStable();

    pending.next({
      success: true,
      error: null,
      message: null,
    });
    pending.complete();

    await operation;

    expect(component.confirmationId()).toBeNull();
    expect(component.removingId()).toBeNull();
    expect(component.members()).toEqual(createResponse(9).members);

    // Una consulta inicial, una de preparación y otra del espacio 9.
    // No debe haber una cuarta consulta causada por la respuesta antigua.
    expect(service.getMembers).toHaveBeenCalledTimes(3);
  });

  it('ignora una expulsión recibida después de cerrar sesión', async (): Promise<void> => {
    const member: SpaceMember = await loadGuest();
    const pending: Subject<ApiResponse> = new Subject<ApiResponse>();

    vi.spyOn(service, 'removeMember').mockReturnValue(pending.asObservable());

    component.requestRemove(member);

    const operation: Promise<void> = component.confirmRemove();

    authStore.clear();

    pending.next({
      success: true,
      error: null,
      message: null,
    });
    pending.complete();

    await operation;

    // No debe recargar el listado utilizando la sesión anterior.
    expect(service.getMembers).toHaveBeenCalledTimes(2);
  });

  it('muestra solo la fecha de incorporación', async (): Promise<void> => {
    await loadGuest();
    fixture.detectChanges();

    const dates: NodeListOf<HTMLTimeElement> =
      fixture.nativeElement.querySelectorAll('.members__details time');

    expect(dates).toHaveLength(2);

    expect(dates[1]?.textContent?.trim()).toBe('2026-10-17');
    expect(dates[1]?.getAttribute('datetime')).toBe('2026-10-17');

    const content: string = fixture.nativeElement.textContent;

    expect(content).not.toContain('Se unió:');
    expect(content).not.toContain('10:15:00');
  });
});
