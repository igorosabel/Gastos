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
import type Transaction from '@model/transactions/transaction.model';
import TransactionRefreshService from '@services/transaction-refresh.service';
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

    const navigation: HTMLElement = fixture.nativeElement.querySelector(
      '.private-layout__bottom-nav',
    );

    const actions: NodeListOf<HTMLElement> = navigation.querySelectorAll('a, button');

    expect(actions).toHaveLength(5);

    expect(
      Array.from(actions, (action: HTMLElement): string => action.textContent?.trim() ?? ''),
    ).toEqual(['Inicio', 'Movimientos', 'Añadir', 'Informes', 'Ajustes']);

    expect(actions[2]?.tagName).toBe('BUTTON');
    expect(actions[2]?.hasAttribute('href')).toBe(false);
  });

  it('dispone de navegación lateral para escritorio', async (): Promise<void> => {
    await completeInitialLoad();

    const navigation: HTMLElement = fixture.nativeElement.querySelector(
      '.private-layout__desktop-nav',
    );

    const links: NodeListOf<HTMLAnchorElement> = navigation.querySelectorAll('a');

    expect(links).toHaveLength(6);

    expect(
      Array.from(links, (link: HTMLAnchorElement): string => link.textContent?.trim() ?? ''),
    ).toEqual(['Inicio', 'Movimientos', 'Recurrentes', 'Informes', 'Categorías', 'Ajustes']);

    expect(links[2]?.getAttribute('href')).toBe('/recurring');
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

  it('ofrece el registro rápido también en escritorio', async (): Promise<void> => {
    await completeInitialLoad();

    const action: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.private-layout__desktop-add',
    );

    expect(action.tagName).toBe('BUTTON');
    expect(action.textContent).toContain('Añadir movimiento');

    action.click();
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(true);

    httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`).flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    });
  });

  it('renderiza los iconos SVG de navegación', async (): Promise<void> => {
    await completeInitialLoad();

    const desktop: HTMLElement = fixture.nativeElement.querySelector(
      '.private-layout__desktop-nav',
    );

    const mobile: HTMLElement = fixture.nativeElement.querySelector('.private-layout__bottom-nav');

    expect(desktop.querySelector('svg[data-p-icon="home"]')).not.toBeNull();
    expect(desktop.querySelector('svg[data-p-icon="chart-bar"]')).not.toBeNull();
    expect(mobile.querySelector('svg[data-p-icon="home"]')).not.toBeNull();
    expect(mobile.querySelector('svg[data-p-icon="plus"]')).not.toBeNull();
  });

  it('no abre el registro rápido sin un espacio activo', async (): Promise<void> => {
    // Completamos la carga inicial que inicia ngOnInit().
    await completeInitialLoad();

    // Simulamos que el usuario se queda sin espacio activo.
    spaceStore.clear();
    fixture.detectChanges();

    expect(spaceStore.selectedId()).toBeNull();

    component.openQuickTransaction();
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(false);

    httpTesting.expectNone(`${environment.apiUrl}/categories`);
  });

  it('abre el registro rápido sin cambiar de ruta', async (): Promise<void> => {
    await completeInitialLoad();

    const url: string = router.url;

    component.openQuickTransaction();
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(true);
    expect(router.url).toBe(url);

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      categories: [
        {
          id: 20,
          space_id: 2,
          parent_id: null,
          name: 'Hogar',
          default_type: 'expense',
          sort_order: 0,
        },
      ],
      error: null,
      message: null,
    });

    fixture.detectChanges();

    expect(component.quickLoading()).toBe(false);
    expect(component.quickCategories()).toHaveLength(1);
    expect(component.quickOpen()).toBe(true);
  });

  it('permite cancelar el registro rápido', async (): Promise<void> => {
    await completeInitialLoad();

    component.openQuickTransaction();
    fixture.detectChanges();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    component.closeQuickTransaction();
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(false);
    expect(request.cancelled).toBe(true);

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('permite reintentar la carga de categorías', async (): Promise<void> => {
    await completeInitialLoad();

    component.openQuickTransaction();
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`).flush(
      {
        success: false,
        error: 'forbidden',
        message: 'Error',
      },
      {
        status: 403,
        statusText: 'Forbidden',
      },
    );

    fixture.detectChanges();

    expect(component.quickError()).toBe('No se han podido cargar las categorías.');

    component.retryQuickCategories();
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`).flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    });

    fixture.detectChanges();

    expect(component.quickError()).toBeNull();
    expect(component.quickLoading()).toBe(false);
  });

  it('cierra el registro rápido al cambiar de espacio', async (): Promise<void> => {
    await completeInitialLoad();

    component.openQuickTransaction();
    fixture.detectChanges();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    component.selectSpace(8);
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(false);
    expect(request.cancelled).toBe(true);

    httpTesting.expectNone(`${environment.apiUrl}/categories?spaceId=8`);
  });

  it('cierra el registro rápido al terminar la sesión', async (): Promise<void> => {
    await completeInitialLoad();

    component.openQuickTransaction();
    fixture.detectChanges();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.logout();
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(false);
    expect(request.cancelled).toBe(true);
    expect(component.quickMessage()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('notifica los cambios después de crear un movimiento', async (): Promise<void> => {
    await completeInitialLoad();

    const refreshService: TransactionRefreshService = TestBed.inject(TransactionRefreshService);

    component.openQuickTransaction();
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`).flush({
      success: true,
      categories: [
        {
          id: 20,
          space_id: 2,
          parent_id: null,
          name: 'Hogar',
          default_type: 'expense',
          sort_order: 0,
        },
      ],
      error: null,
      message: null,
    });

    fixture.detectChanges();

    const created: Transaction = {
      id: 31,
      space_id: 2,
      user_id: 1,
      category_id: 20,
      type: 'expense',
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-19',
    };

    const previousVersion: number = refreshService.version();

    component.onQuickTransactionCreated(created);
    fixture.detectChanges();

    expect(component.quickOpen()).toBe(false);
    expect(refreshService.version()).toBe(previousVersion + 1);
    expect(component.quickMessage()).toBe('Se ha creado el movimiento «Electricidad».');

    expect(fixture.nativeElement.textContent).toContain('Se ha creado el movimiento');
  });

  it('ignora movimientos de otro espacio', async (): Promise<void> => {
    await completeInitialLoad();

    const refreshService: TransactionRefreshService = TestBed.inject(TransactionRefreshService);

    component.openQuickTransaction();
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`).flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    });

    const previousVersion: number = refreshService.version();

    component.onQuickTransactionCreated({
      id: 31,
      space_id: 8,
      user_id: 1,
      category_id: 80,
      type: 'expense',
      amount: '10.00',
      concept: 'Otro espacio',
      date: '2026-10-19',
    });

    expect(refreshService.version()).toBe(previousVersion);
    expect(component.quickMessage()).toBeNull();
  });

  it('oculta la confirmación después de cuatro segundos', async (): Promise<void> => {
    await completeInitialLoad();

    component.openQuickTransaction();
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`).flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    });

    fixture.detectChanges();

    const transaction: Transaction = {
      id: 31,
      space_id: 2,
      user_id: 1,
      category_id: 20,
      type: 'expense',
      amount: '33.00',
      concept: null,
      date: '2026-10-19',
    };

    vi.useFakeTimers();

    try {
      component.onQuickTransactionCreated(transaction);
      fixture.detectChanges();

      expect(component.quickMessage()).toBe('Se ha creado el movimiento «33.00 €».');

      // El mensaje sigue visible antes de los cuatro segundos.
      vi.advanceTimersByTime(3999);

      expect(component.quickMessage()).not.toBeNull();

      // Al cumplirse los cuatro segundos desaparece.
      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(component.quickMessage()).toBeNull();

      expect(fixture.nativeElement.querySelector('.private-layout__quick-message')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
