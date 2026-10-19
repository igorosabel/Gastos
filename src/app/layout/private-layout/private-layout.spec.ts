import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import PrivateLayout from '@layout/private-layout/private-layout';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('PrivateLayout', (): void => {
  let fixture: ComponentFixture<PrivateLayout>;
  let component: PrivateLayout;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;
  let router: Router;

  const spacesResponse: SpacesResponse = {
    success: true,
    spaces: [
      {
        id: 2,
        name: 'Personal',
        type: 'personal',
        owner_id: 1,
        is_owner: true,
      },
      {
        id: 8,
        name: 'Familia',
        type: 'shared',
        owner_id: 1,
        is_owner: true,
      },
    ],
  };

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PrivateLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    const login: LoginResponse = {
      success: true,
      token: 'jwt-de-prueba',
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

    fixture = TestBed.createComponent(PrivateLayout);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach((): void => {
    httpTesting.verify();
    spaceStore.clear();
    authStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * Completa la carga iniciada por ngOnInit().
   */
  async function completeInitialLoad(): Promise<void> {
    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    expect(request.request.method).toBe('GET');

    request.flush(spacesResponse);

    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('carga los espacios al inicializar el layout', async (): Promise<void> => {
    await completeInitialLoad();

    expect(spaceStore.loading()).toBe(false);
    expect(spaceStore.spaces()).toEqual(spacesResponse.spaces);
    expect(spaceStore.selectedId()).toBe(2);
  });

  it('permite seleccionar un espacio compartido', async (): Promise<void> => {
    await completeInitialLoad();

    component.selectSpace(8);

    expect(spaceStore.selectedId()).toBe(8);
    expect(spaceStore.selected()?.name).toBe('Familia');

    httpTesting.expectNone(`${environment.apiUrl}/spaces`);
  });

  it('impide seleccionar un espacio no autorizado', async (): Promise<void> => {
    await completeInitialLoad();

    component.selectSpace(999);

    expect(spaceStore.selectedId()).toBe(2);
  });

  it('permite actualizar el listado de espacios', async (): Promise<void> => {
    await completeInitialLoad();

    component.reloadSpaces();

    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    request.flush(spacesResponse);

    await fixture.whenStable();

    expect(spaceStore.spaces()).toEqual(spacesResponse.spaces);
  });

  it('limpia la sesión y navega al login al cerrar sesión', async (): Promise<void> => {
    await completeInitialLoad();

    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.logout();

    expect(authStore.user()).toBeNull();
    expect(spaceStore.spaces()).toEqual([]);
    expect(spaceStore.selectedId()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('dispone de navegación móvil con cinco acciones', async (): Promise<void> => {
    await completeInitialLoad();

    const navigation: HTMLElement | null = fixture.nativeElement.querySelector(
      '.private-layout__bottom-nav',
    );

    expect(navigation).not.toBeNull();

    const links: NodeListOf<HTMLAnchorElement> = navigation!.querySelectorAll('a');

    expect(links).toHaveLength(5);

    expect(
      Array.from(links, (link: HTMLAnchorElement): string => link.textContent?.trim() ?? ''),
    ).toEqual(['Inicio', 'Movimientos', 'Añadir', 'Informes', 'Ajustes']);

    expect(links[2]?.getAttribute('href')).toBe('/transactions');
  });

  it('dispone de navegación lateral para escritorio', async (): Promise<void> => {
    await completeInitialLoad();

    const navigation: HTMLElement | null = fixture.nativeElement.querySelector(
      '.private-layout__desktop-nav',
    );

    expect(navigation).not.toBeNull();

    const links: NodeListOf<HTMLAnchorElement> = navigation!.querySelectorAll('a');

    expect(links).toHaveLength(5);

    expect(
      Array.from(links, (link: HTMLAnchorElement): string => link.textContent?.trim() ?? ''),
    ).toEqual(['Inicio', 'Movimientos', 'Informes', 'Categorías', 'Ajustes']);
  });

  it('mantiene el selector de espacio en la cabecera', async (): Promise<void> => {
    await completeInitialLoad();

    const selector: HTMLElement | null = fixture.nativeElement.querySelector(
      '.private-layout__header #active-space',
    );

    expect(selector).not.toBeNull();
    expect(spaceStore.selectedId()).toBe(2);

    component.selectSpace(8);
    fixture.detectChanges();

    expect(spaceStore.selectedId()).toBe(8);
  });

  it('ofrece la acción de añadir también en escritorio', async (): Promise<void> => {
    await completeInitialLoad();

    const action: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '.private-layout__desktop-add',
    );

    expect(action).not.toBeNull();
    expect(action?.getAttribute('href')).toBe('/transactions');
    expect(action?.textContent).toContain('Añadir movimiento');
  });
});
