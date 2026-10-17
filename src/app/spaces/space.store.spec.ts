import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type SpacesResponse from '@interfaces/spaces-response.interface';
import Space from '@model/spaces/space.model';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('SpaceStore', () => {
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;

  const response: SpacesResponse = {
    success: true,
    spaces: [
      {
        id: 7,
        name: 'Familia',
        type: 'shared',
        owner_id: 1,
        is_owner: true,
      },
      {
        id: 2,
        name: 'Personal',
        type: 'personal',
        owner_id: 1,
        is_owner: true,
      },
    ],
  };

  beforeEach((): void => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    authStore = TestBed.inject(AuthStore);
    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

    const login: LoginResponse = {
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

    authStore.start(login);
  });

  afterEach((): void => {
    httpTesting.verify();
    spaceStore.clear();
    authStore.clear();
    sessionStorage.clear();
  });

  /**
   * Resuelve una petición pendiente de espacios.
   */
  function flushSpaces(data: SpacesResponse = response): void {
    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    request.flush(data);
  }

  it('selecciona inicialmente el espacio personal', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    expect(spaceStore.loading()).toBe(false);
    expect(spaceStore.spaces()).toEqual(response.spaces);
    expect(spaceStore.selectedId()).toBe(2);
    expect(spaceStore.selected()?.name).toBe('Personal');
  });

  it('permite cambiar a otro espacio accesible', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    expect(spaceStore.select(7)).toBe(true);
    expect(spaceStore.selectedId()).toBe(7);
    expect(spaceStore.selected()?.type).toBe('shared');
  });

  it('rechaza un espacio que no pertenece al listado', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    expect(spaceStore.select(999)).toBe(false);
    expect(spaceStore.selectedId()).toBe(2);
  });

  it('conserva la selección válida al recargar', async (): Promise<void> => {
    const firstLoad: Promise<void> = spaceStore.load();

    flushSpaces();
    await firstLoad;

    spaceStore.select(7);

    const secondLoad: Promise<void> = spaceStore.load();

    flushSpaces();
    await secondLoad;

    expect(spaceStore.selectedId()).toBe(7);
  });

  it('descarta una selección que deja de estar disponible', async (): Promise<void> => {
    const firstLoad: Promise<void> = spaceStore.load();

    flushSpaces();
    await firstLoad;

    spaceStore.select(7);

    const secondLoad: Promise<void> = spaceStore.load();

    flushSpaces({
      success: true,
      spaces: [response.spaces[1]],
    });

    await secondLoad;

    expect(spaceStore.selectedId()).toBe(2);
  });

  it('expone un error cuando falla la consulta', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    request.flush({}, { status: 500, statusText: 'Internal Server Error' });

    await loading;

    expect(spaceStore.loading()).toBe(false);
    expect(spaceStore.error()).not.toBeNull();
    expect(spaceStore.spaces()).toEqual([]);
    expect(spaceStore.selectedId()).toBeNull();
  });

  it('ignora respuestas recibidas después de cerrar sesión', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    spaceStore.clear();
    authStore.clear();

    flushSpaces();
    await loading;

    expect(spaceStore.spaces()).toEqual([]);
    expect(spaceStore.selected()).toBeNull();
  });

  it('no permite consultar espacios sin autenticación', async (): Promise<void> => {
    authStore.clear();

    await spaceStore.load();

    httpTesting.expectNone(`${environment.apiUrl}/spaces`);
    expect(spaceStore.spaces()).toEqual([]);
  });

  it('incorpora y selecciona un espacio recién creado', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    const createdSpace: Space = {
      id: 9,
      name: 'Vacaciones',
      type: 'shared',
      owner_id: 1,
      is_owner: true,
    };

    expect(spaceStore.addCreated(createdSpace)).toBe(true);
    expect(spaceStore.selectedId()).toBe(9);
    expect(spaceStore.selected()).toEqual(createdSpace);
    expect(spaceStore.spaces()).toContainEqual(createdSpace);
  });

  it('no sobrescribe un espacio nuevo con una carga anterior', async (): Promise<void> => {
    const firstLoad: Promise<void> = spaceStore.load();

    flushSpaces();
    await firstLoad;

    const secondLoad: Promise<void> = spaceStore.load();

    const createdSpace: Space = {
      id: 9,
      name: 'Vacaciones',
      type: 'shared',
      owner_id: 1,
      is_owner: true,
    };

    expect(spaceStore.addCreated(createdSpace)).toBe(true);

    // Esta respuesta representa un listado consultado antes
    // de que existiera el espacio recién creado.
    flushSpaces();
    await secondLoad;

    expect(spaceStore.selectedId()).toBe(9);
    expect(spaceStore.spaces()).toContainEqual(createdSpace);
    expect(spaceStore.loading()).toBe(false);
  });

  it('rechaza un espacio creado después de cerrar sesión', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    authStore.clear();

    const accepted: boolean = spaceStore.addCreated({
      id: 9,
      name: 'Vacaciones',
      type: 'shared',
      owner_id: 1,
      is_owner: true,
    });

    expect(accepted).toBe(false);
    expect(spaceStore.spaces()).toEqual([]);
    expect(spaceStore.selected()).toBeNull();
  });

  it('incorpora y selecciona un espacio al aceptar una invitación', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    const acceptedSpace: Space = {
      id: 9,
      name: 'Compartido',
      type: 'shared',
      owner_id: 2,
      is_owner: false,
    };

    expect(spaceStore.addAccepted(acceptedSpace)).toBe(true);
    expect(spaceStore.selectedId()).toBe(9);
    expect(spaceStore.spaces()).toContainEqual(acceptedSpace);
  });

  it('no permite incorporar espacios aceptados después de cerrar sesión', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    flushSpaces();
    await loading;

    authStore.clear();

    expect(
      spaceStore.addAccepted({
        id: 9,
        name: 'Compartido',
        type: 'shared',
        owner_id: 2,
        is_owner: false,
      }),
    ).toBe(false);

    expect(spaceStore.spaces()).toEqual([]);
  });

  it('no sobrescribe una aceptación con una consulta anterior', async (): Promise<void> => {
    const initialLoad: Promise<void> = spaceStore.load();

    flushSpaces();
    await initialLoad;

    const pendingLoad: Promise<void> = spaceStore.load();

    expect(
      spaceStore.addAccepted({
        id: 9,
        name: 'Compartido',
        type: 'shared',
        owner_id: 2,
        is_owner: false,
      }),
    ).toBe(true);

    flushSpaces();
    await pendingLoad;

    expect(spaceStore.selectedId()).toBe(9);
    expect(spaceStore.spaces().some((space: Space): boolean => space.id === 9)).toBe(true);
  });
});
