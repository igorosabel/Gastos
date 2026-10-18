import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import Transactions from '@pages/transactions/transactions';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Transactions', (): void => {
  let fixture: ComponentFixture<Transactions>;
  let component: Transactions;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
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

  function transactionResponse(spaceId: number, amount: string = '95.40'): TransactionsResponse {
    return {
      success: true,
      transactions: [
        {
          id: spaceId * 10,
          space_id: spaceId,
          user_id: 1,
          category_id: spaceId * 100,
          type: 'expense',
          amount,
          concept: 'Electricidad',
          date: '2026-10-20',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
      error: null,
      message: null,
    };
  }

  function categoryResponse(spaceId: number): CategoriesResponse {
    return {
      success: true,
      categories: [
        {
          id: spaceId * 100,
          space_id: spaceId,
          parent_id: null,
          name: 'Suministros',
          default_type: 'expense',
          sort_order: 0,
        },
      ],
      error: null,
      message: null,
    };
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

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

    fixture = TestBed.createComponent(Transactions);
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

  function completeLoad(
    spaceId: number,
    amount: string = '95.40',
    page: number = 1,
    total: number = 1,
    totalPages: number = 1,
  ): void {
    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=${spaceId}&page=${page}`,
    );

    const categoriesRequest = httpTesting.expectOne(
      `${environment.apiUrl}/categories?spaceId=${spaceId}`,
    );

    expect(transactionsRequest.request.method).toBe('GET');
    expect(categoriesRequest.request.method).toBe('GET');

    transactionsRequest.flush({
      ...transactionResponse(spaceId, amount),
      page,
      total,
      total_pages: totalPages,
    } satisfies TransactionsResponse);

    categoriesRequest.flush(categoryResponse(spaceId));

    fixture.detectChanges();
  }

  it('no consulta movimientos sin espacio seleccionado', (): void => {
    expect(component.transactions()).toEqual([]);
    expect(component.loading()).toBe(false);

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('consulta movimientos y categorías del espacio activo', async (): Promise<void> => {
    await loadSpaces();

    expect(component.loading()).toBe(true);

    completeLoad(2);

    expect(component.loading()).toBe(false);
    expect(component.transactions()).toHaveLength(1);
    expect(component.categoryName(200)).toBe('Suministros');
    expect(component.transactions()[0]?.amount).toBe('95.40');
  });

  it('muestra el importe original y la categoría', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Electricidad');
    expect(content).toContain('Suministros');
    expect(content).toContain('95.40');
    expect(content).toContain('Gasto');
  });

  it('muestra el estado vacío', async (): Promise<void> => {
    await loadSpaces();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush({
      success: true,
      transactions: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      error: null,
      message: null,
    } satisfies TransactionsResponse);

    categoriesRequest.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.transactions()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'Este espacio todavía no tiene movimientos.',
    );
  });

  it('permite actualizar los movimientos', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.reload();
    fixture.detectChanges();

    completeLoad(2, '110.00');

    expect(component.transactions()[0]?.amount).toBe('110.00');
  });

  it('no permite actualizar durante una carga', async (): Promise<void> => {
    await loadSpaces();

    component.reload();
    fixture.detectChanges();

    const transactionsRequests = httpTesting.match(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequests = httpTesting.match(`${environment.apiUrl}/categories?spaceId=2`);

    expect(transactionsRequests).toHaveLength(1);
    expect(categoriesRequests).toHaveLength(1);

    transactionsRequests[0]!.flush(transactionResponse(2));
    categoriesRequests[0]!.flush(categoryResponse(2));

    fixture.detectChanges();
  });

  it('cancela las consultas al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();

    const oldTransactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const oldCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    spaceStore.select(8);
    fixture.detectChanges();

    expect(oldTransactions.cancelled).toBe(true);
    expect(oldCategories.cancelled).toBe(true);
    expect(component.transactions()).toEqual([]);

    completeLoad(8);

    expect(component.transactions()[0]?.space_id).toBe(8);
    expect(component.categoryName(800)).toBe('Suministros');
  });

  it('descarta los datos al cerrar sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.transactions()).toEqual([]);
    expect(component.categories()).toEqual([]);
    expect(component.total()).toBe(0);
  });

  it('muestra un error si falla la consulta', async (): Promise<void> => {
    await loadSpaces();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush(
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

    expect(categoriesRequest.cancelled).toBe(true);

    fixture.detectChanges();

    expect(component.error()).toBe('No tienes permiso para consultar estos movimientos.');
    expect(component.transactions()).toEqual([]);
  });

  it('muestra un error si la API responde success false', async (): Promise<void> => {
    await loadSpaces();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush({
      ...transactionResponse(2),
      success: false,
    } satisfies TransactionsResponse);

    categoriesRequest.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.error()).toBe('No se han podido consultar los movimientos.');
    expect(component.transactions()).toEqual([]);
  });

  it('muestra la paginación cuando existen varias páginas', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    expect(component.page()).toBe(1);
    expect(component.total()).toBe(45);
    expect(component.totalPages()).toBe(3);

    expect(fixture.nativeElement.textContent).toContain('Página 1 de 3');

    expect(fixture.nativeElement.textContent).toContain('45 movimientos en total');
  });

  it('avanza a la segunda página', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();

    expect(component.page()).toBe(2);
    expect(component.loading()).toBe(true);

    completeLoad(2, '150.00', 2, 45, 3);

    expect(component.loading()).toBe(false);
    expect(component.transactions()[0]?.amount).toBe('150.00');
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 3');
  });

  it('retrocede a la página anterior', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '150.00', 2, 45, 3);

    component.previousPage();
    fixture.detectChanges();

    expect(component.page()).toBe(1);

    completeLoad(2, '95.40', 1, 45, 3);

    expect(component.transactions()[0]?.amount).toBe('95.40');
  });

  it('no permite retroceder desde la primera página', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.previousPage();
    fixture.detectChanges();

    expect(component.page()).toBe(1);

    httpTesting.expectNone(`${environment.apiUrl}/transactions?spaceId=2&page=0`);
  });

  it('no permite avanzar desde la última página', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '120.00', 3, 45, 3);

    component.nextPage();
    fixture.detectChanges();

    expect(component.page()).toBe(3);

    httpTesting.expectNone(`${environment.apiUrl}/transactions?spaceId=2&page=4`);
  });

  it('no permite cambiar de página mientras carga', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    component.nextPage();
    component.previousPage();

    expect(component.page()).toBe(2);

    completeLoad(2, '100.00', 2, 45, 3);
  });

  it('actualiza la página actual sin volver a la primera', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    component.reload();
    fixture.detectChanges();

    expect(component.page()).toBe(2);

    completeLoad(2, '125.00', 2, 45, 3);

    expect(component.transactions()[0]?.amount).toBe('125.00');
  });

  it('regresa a la primera página al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    spaceStore.select(8);
    fixture.detectChanges();

    expect(component.page()).toBe(1);
    expect(component.transactions()).toEqual([]);

    completeLoad(8, '75.00', 1, 1, 1);

    expect(component.transactions()[0]?.space_id).toBe(8);
    expect(component.page()).toBe(1);
  });

  it('cancela las consultas de una página al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();

    const oldTransactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=2`,
    );

    const oldCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    spaceStore.select(8);
    fixture.detectChanges();

    expect(oldTransactions.cancelled).toBe(true);
    expect(oldCategories.cancelled).toBe(true);
    expect(component.page()).toBe(1);

    completeLoad(8);
  });

  it('restablece la paginación al cerrar sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.page()).toBe(1);
    expect(component.transactions()).toEqual([]);
    expect(component.totalPages()).toBe(0);
    expect(component.total()).toBe(0);
  });

  it('no permite avanzar cuando falla la consulta', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=2`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush(
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

    expect(categoriesRequest.cancelled).toBe(true);
    fixture.detectChanges();

    expect(component.error()).toBe('No tienes permiso para consultar estos movimientos.');

    component.nextPage();

    expect(component.page()).toBe(2);
  });
});
