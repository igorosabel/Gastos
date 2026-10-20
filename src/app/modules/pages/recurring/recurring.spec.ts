import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type RecurringResponse from '@interfaces/recurring/recurring-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type Category from '@model/categories/category.model';
import type RecurringModel from '@model/recurring/recurring.model';
import Recurring from '@pages/recurring/recurring';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Recurring', (): void => {
  let fixture: ComponentFixture<Recurring>;
  let component: Recurring;
  let spaceStore: SpaceStore;
  let authStore: AuthStore;
  let httpTesting: HttpTestingController;

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

  function recurringResponse(
    spaceId: number,
    items: RecurringModel[] = [
      {
        id: 50,
        space_id: spaceId,
        category_id: spaceId * 100,
        type: 'expense',
        amount: '95.40',
        concept: 'Electricidad',
        day_of_month: 20,
        start_date: '2026-10-01',
        end_date: null,
        active: true,
      },
      {
        id: 51,
        space_id: spaceId,
        category_id: spaceId * 100 + 1,
        type: 'income',
        amount: '2500.00',
        concept: 'Nómina',
        day_of_month: 1,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        active: false,
      },
    ],
  ): RecurringResponse {
    return {
      success: true,
      recurring: items,
      error: null,
      message: null,
    };
  }

  function categoriesResponse(spaceId: number): CategoriesResponse {
    const categories: Category[] = [
      {
        id: spaceId * 100,
        space_id: spaceId,
        parent_id: null,
        name: 'Suministros',
        default_type: 'expense',
        sort_order: 0,
      },
      {
        id: spaceId * 100 + 1,
        space_id: spaceId,
        parent_id: null,
        name: 'Salario',
        default_type: 'income',
        sort_order: 1,
      },
    ];

    return {
      success: true,
      categories,
      error: null,
      message: null,
    };
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Recurring],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

    authStore.start({
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
    } satisfies LoginResponse);

    fixture = TestBed.createComponent(Recurring);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach((): void => {
    httpTesting.verify();
    fixture.destroy();
    spaceStore.clear();
    authStore.clear();
    sessionStorage.clear();
  });

  async function loadSpaces(): Promise<void> {
    const loading: Promise<void> = spaceStore.load();

    httpTesting.expectOne(`${environment.apiUrl}/spaces`).flush(spacesResponse);

    await loading;
    fixture.detectChanges();
  }

  function recurringRequest(spaceId: number): TestRequest {
    return httpTesting.expectOne(`${environment.apiUrl}/recurring?spaceId=${spaceId}`);
  }

  function categoryRequest(spaceId: number): TestRequest {
    return httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=${spaceId}`);
  }

  function completeLoad(spaceId: number, items?: RecurringModel[]): void {
    const recurring: TestRequest = recurringRequest(spaceId);
    const categories: TestRequest = categoryRequest(spaceId);

    expect(recurring.request.method).toBe('GET');
    expect(categories.request.method).toBe('GET');

    recurring.flush(recurringResponse(spaceId, items));
    categories.flush(categoriesResponse(spaceId));

    fixture.detectChanges();
  }

  it('no consulta sin espacio activo', (): void => {
    expect(component.recurring()).toEqual([]);
    expect(component.loading()).toBe(false);

    expect(fixture.nativeElement.textContent).toContain('Selecciona un espacio');

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('consulta plantillas y categorías del espacio', async (): Promise<void> => {
    await loadSpaces();

    expect(component.loading()).toBe(true);

    completeLoad(2);

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.recurring()).toHaveLength(2);
    expect(component.categories()).toHaveLength(2);
  });

  it('muestra los datos de las plantillas activas e inactivas', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Electricidad');
    expect(content).toContain('Suministros');
    expect(content).toContain('95,40 €');
    expect(content).toContain('20');
    expect(content).toContain('2026-10-01');
    expect(content).toContain('Sin fecha de fin');

    expect(content).toContain('Nómina');
    expect(content).toContain('Salario');
    expect(content).toContain('2.500,00 €');
    expect(content).toContain('2026-12-31');

    expect(component.activeCount()).toBe(1);
    expect(component.inactiveCount()).toBe(1);
  });

  it('presenta correctamente un listado vacío', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, []);

    expect(component.recurring()).toEqual([]);
    expect(component.activeCount()).toBe(0);
    expect(component.inactiveCount()).toBe(0);

    expect(fixture.nativeElement.textContent).toContain('todavía no tiene movimientos recurrentes');
  });

  it('permite actualizar el listado', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.reload();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    completeLoad(2);

    expect(component.loading()).toBe(false);
    expect(component.recurring()).toHaveLength(2);
  });

  it('no duplica consultas mientras carga', async (): Promise<void> => {
    await loadSpaces();

    component.reload();
    component.reload();
    fixture.detectChanges();

    completeLoad(2);

    expect(component.loading()).toBe(false);
  });

  it('cancela las peticiones anteriores al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();

    const previousRecurring: TestRequest = recurringRequest(2);
    const previousCategories: TestRequest = categoryRequest(2);

    spaceStore.select(8);
    fixture.detectChanges();

    expect(previousRecurring.cancelled).toBe(true);
    expect(previousCategories.cancelled).toBe(true);
    expect(component.recurring()).toEqual([]);
    expect(component.categories()).toEqual([]);

    completeLoad(8);

    expect(component.recurring()[0]?.space_id).toBe(8);
    expect(component.categories()[0]?.space_id).toBe(8);
  });

  it('elimina los datos al cerrar la sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.recurring()).toEqual([]);
    expect(component.categories()).toEqual([]);
    expect(component.error()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('muestra un error de permisos', async (): Promise<void> => {
    await loadSpaces();

    const recurring: TestRequest = recurringRequest(2);
    const categories: TestRequest = categoryRequest(2);

    recurring.flush(
      {
        success: false,
        error: 'forbidden',
        message: 'Sin permisos',
      },
      {
        status: 403,
        statusText: 'Forbidden',
      },
    );

    expect(categories.cancelled).toBe(true);

    fixture.detectChanges();

    expect(component.error()).toBe(
      'No tienes permiso para consultar los recurrentes de este espacio.',
    );
    expect(component.recurring()).toEqual([]);
  });

  it('permite reintentar una consulta fallida', async (): Promise<void> => {
    await loadSpaces();

    const recurring: TestRequest = recurringRequest(2);
    const categories: TestRequest = categoryRequest(2);

    recurring.flush(
      {
        success: false,
        error: 'forbidden',
        message: 'Sin permisos',
      },
      {
        status: 403,
        statusText: 'Forbidden',
      },
    );

    expect(categories.cancelled).toBe(true);
    fixture.detectChanges();

    component.reload();
    fixture.detectChanges();

    completeLoad(2);

    expect(component.error()).toBeNull();
    expect(component.recurring()).toHaveLength(2);
  });

  it('rechaza una respuesta de otro espacio', async (): Promise<void> => {
    await loadSpaces();

    const recurring: TestRequest = recurringRequest(2);
    const categories: TestRequest = categoryRequest(2);

    recurring.flush(recurringResponse(8));
    categories.flush(categoriesResponse(2));

    fixture.detectChanges();

    expect(component.recurring()).toEqual([]);
    expect(component.categories()).toEqual([]);
    expect(component.error()).toBe('No se han podido obtener los movimientos recurrentes.');
  });

  it('rechaza success false sin mostrar datos parciales', async (): Promise<void> => {
    await loadSpaces();

    const recurring: TestRequest = recurringRequest(2);
    const categories: TestRequest = categoryRequest(2);

    recurring.flush({
      ...recurringResponse(2),
      success: false,
    } satisfies RecurringResponse);

    categories.flush(categoriesResponse(2));
    fixture.detectChanges();

    expect(component.recurring()).toEqual([]);
    expect(component.error()).toBe('No se han podido obtener los movimientos recurrentes.');
  });

  it('abre el formulario de creación', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();
    fixture.detectChanges();

    expect(component.creatingRecurring()).toBe(true);

    expect(fixture.nativeElement.querySelector('app-create-recurring')).not.toBeNull();

    expect(fixture.nativeElement.textContent).toContain('Nuevo movimiento recurrente');
  });

  it('cancela la creación sin modificar las plantillas', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();
    fixture.detectChanges();

    component.cancelCreateRecurring();
    fixture.detectChanges();

    expect(component.creatingRecurring()).toBe(false);
    expect(component.recurring()).toHaveLength(2);

    expect(fixture.nativeElement.querySelector('app-create-recurring')).toBeNull();

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('no abre el formulario durante una carga', async (): Promise<void> => {
    await loadSpaces();

    component.openCreateRecurring();

    expect(component.creatingRecurring()).toBe(false);

    completeLoad(2);
  });

  it('no permite crear sin categorías disponibles', async (): Promise<void> => {
    await loadSpaces();

    const recurring = recurringRequest(2);
    const categories = categoryRequest(2);

    recurring.flush(recurringResponse(2, []));
    categories.flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    } satisfies CategoriesResponse);

    fixture.detectChanges();

    component.openCreateRecurring();
    fixture.detectChanges();

    expect(component.creatingRecurring()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Para crear un recurrente necesitas una categoría.',
    );
  });

  it('recarga el listado después de crear una plantilla', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();
    fixture.detectChanges();

    const created: RecurringModel = {
      id: 90,
      space_id: 2,
      category_id: 200,
      type: 'expense',
      amount: '33.00',
      concept: 'Electricidad',
      day_of_month: 20,
      start_date: '2026-10-01',
      end_date: null,
      active: true,
    };

    component.onRecurringCreated(created);
    fixture.detectChanges();

    expect(component.creatingRecurring()).toBe(false);
    expect(component.loading()).toBe(true);

    const updated: RecurringModel[] = [...recurringResponse(2).recurring, created];

    completeLoad(2, updated);

    expect(component.recurring()).toHaveLength(3);
    expect(component.activeCount()).toBe(2);

    expect(component.creationMessage()).toBe('Se ha creado el recurrente «Electricidad».');
  });

  it('ignora una plantilla creada en otro espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();

    const external: RecurringModel = {
      id: 90,
      space_id: 8,
      category_id: 800,
      type: 'expense',
      amount: '33.00',
      concept: 'Otro espacio',
      day_of_month: 20,
      start_date: '2026-10-01',
      end_date: null,
      active: true,
    };

    component.onRecurringCreated(external);
    fixture.detectChanges();

    expect(component.creationMessage()).toBeNull();
    expect(component.recurring()).toHaveLength(2);

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('cierra el formulario al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();
    fixture.detectChanges();

    spaceStore.select(8);
    fixture.detectChanges();

    expect(component.creatingRecurring()).toBe(false);
    expect(component.creationMessage()).toBeNull();

    completeLoad(8);
  });

  it('cierra el formulario al cerrar sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();
    fixture.detectChanges();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.creatingRecurring()).toBe(false);
    expect(component.recurring()).toEqual([]);
    expect(component.creationMessage()).toBeNull();
  });

  it('oculta la confirmación de creación después de cuatro segundos', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateRecurring();
    fixture.detectChanges();

    const created: RecurringModel = {
      id: 90,
      space_id: 2,
      category_id: 200,
      type: 'expense',
      amount: '33.00',
      concept: 'Electricidad',
      day_of_month: 20,
      start_date: '2026-10-01',
      end_date: null,
      active: true,
    };

    vi.useFakeTimers();

    try {
      component.onRecurringCreated(created);
      fixture.detectChanges();

      // Completamos la recarga iniciada tras crear.
      completeLoad(2, [...recurringResponse(2).recurring, created]);

      expect(component.creationMessage()).toBe('Se ha creado el recurrente «Electricidad».');

      vi.advanceTimersByTime(3999);

      expect(component.creationMessage()).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(component.creationMessage()).toBeNull();

      expect(fixture.nativeElement.querySelector('.recurring__success')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
