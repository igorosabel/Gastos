import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type SpaceMembersResponse from '@interfaces/spaces/space-members-response.interface';
import SpaceMembers from '@modules/spaces/space-members/space-members';
import SpacesService from '@services/spaces.service';
import { of, Subject, throwError, type Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SpaceMembers', () => {
  let fixture: ComponentFixture<SpaceMembers>;
  let component: SpaceMembers;
  let service: SpacesService;

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

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [SpaceMembers],
      providers: [provideHttpClient()],
    }).compileComponents();

    service = TestBed.inject(SpacesService);

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
});
