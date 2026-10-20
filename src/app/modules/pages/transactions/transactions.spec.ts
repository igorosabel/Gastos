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
import type Transaction from '@model/transactions/transaction.model';
import Transactions from '@pages/transactions/transactions';
import TransactionRefreshService from '@services/transaction-refresh.service';
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

  function completeFilteredLoad(
    spaceId: number,
    query: string,
    total: number = 1,
    page: number = 1,
    totalPages: number = 1,
  ): void {
    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?${query}`,
    );

    const categoriesRequest = httpTesting.expectOne(
      `${environment.apiUrl}/categories?spaceId=${spaceId}`,
    );

    transactionsRequest.flush({
      ...transactionResponse(spaceId),
      total,
      page,
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

  it('mantiene los filtros vacíos por defecto', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    expect(component.filtersModel()).toEqual({
      dateFrom: '',
      dateTo: '',
      type: null,
      categoryId: null,
    });

    expect(component.appliedFilters()).toEqual(component.filtersModel());
  });

  it('no realiza peticiones al editar filtros sin aplicarlos', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      dateFrom: '2026-10-01',
      type: 'expense',
    }));

    fixture.detectChanges();

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);

    expect(component.appliedFilters().dateFrom).toBe('');
    expect(component.appliedFilters().type).toBeNull();
  });

  it('aplica los filtros y consulta la primera página', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.set({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      type: 'expense',
      categoryId: 200,
    });

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    expect(component.page()).toBe(1);

    completeFilteredLoad(
      2,
      'spaceId=2&page=1&dateFrom=2026-10-01&dateTo=2026-10-31&type=expense&categoryId=200',
    );

    expect(component.appliedFilters()).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      type: 'expense',
      categoryId: 200,
    });

    expect(component.transactions()).toHaveLength(1);
  });

  it('conserva los filtros al cambiar de página', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    completeFilteredLoad(2, 'spaceId=2&page=1&type=expense', 45, 1, 3);

    component.nextPage();
    fixture.detectChanges();

    expect(component.page()).toBe(2);

    completeFilteredLoad(2, 'spaceId=2&page=2&type=expense', 45, 2, 3);

    expect(component.appliedFilters().type).toBe('expense');
  });

  it('rechaza un rango de fechas invertido', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      dateFrom: '2026-10-31',
      dateTo: '2026-10-01',
    }));

    fixture.detectChanges();
    component.applyFilters();

    expect(component.filtersError()).toBe(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('impide filtrar por una categoría incompatible', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'income',
      categoryId: 200,
    }));

    fixture.detectChanges();
    component.applyFilters();

    expect(component.filtersError()).toBe(
      'La categoría seleccionada no es válida para este filtro.',
    );

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('limpia los filtros aplicados', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    completeFilteredLoad(2, 'spaceId=2&page=1&type=expense');

    component.clearFilters();
    fixture.detectChanges();

    completeLoad(2);

    expect(component.filtersModel().type).toBeNull();
    expect(component.appliedFilters().type).toBeNull();
    expect(component.page()).toBe(1);
  });

  it('reinicia los filtros al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    completeFilteredLoad(2, 'spaceId=2&page=1&type=expense');

    spaceStore.select(8);
    fixture.detectChanges();

    expect(component.filtersModel().type).toBeNull();
    expect(component.appliedFilters().type).toBeNull();
    expect(component.page()).toBe(1);

    completeLoad(8);
  });

  it('reinicia los filtros al cerrar sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    completeFilteredLoad(2, 'spaceId=2&page=1&type=expense');

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.filtersModel().type).toBeNull();
    expect(component.appliedFilters().type).toBeNull();
    expect(component.transactions()).toEqual([]);
  });

  it('abre el formulario de creación', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateTransaction();
    fixture.detectChanges();

    expect(component.creatingTransaction()).toBe(true);

    expect(fixture.nativeElement.querySelector('app-create-transaction')).not.toBeNull();

    expect(fixture.nativeElement.textContent).toContain('Nuevo movimiento');
  });

  it('cancela la creación sin modificar el listado', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateTransaction();
    fixture.detectChanges();

    component.cancelCreateTransaction();
    fixture.detectChanges();

    expect(component.creatingTransaction()).toBe(false);

    expect(fixture.nativeElement.querySelector('app-create-transaction')).toBeNull();

    expect(component.transactions()).toHaveLength(1);

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('no abre el formulario mientras carga', async (): Promise<void> => {
    await loadSpaces();

    component.openCreateTransaction();

    expect(component.creatingTransaction()).toBe(false);

    completeLoad(2);
  });

  it('recarga el listado al crear un movimiento', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const created: Transaction = {
      id: 99,
      space_id: 2,
      user_id: 1,
      category_id: 200,
      type: 'expense',
      amount: '120.00',
      concept: 'Compra',
      date: '2026-10-20',
    };

    component.openCreateTransaction();
    fixture.detectChanges();

    component.onTransactionCreated(created);
    fixture.detectChanges();

    expect(component.creatingTransaction()).toBe(false);
    expect(component.page()).toBe(1);

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush({
      ...transactionResponse(2, '120.00'),
    } satisfies TransactionsResponse);

    categoriesRequest.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.transactions()[0]?.amount).toBe('120.00');
    expect(component.creationMessage()).toBe('Se ha creado el movimiento «Compra».');
  });

  it('vuelve a la primera página después de crear', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    component.openCreateTransaction();
    fixture.detectChanges();

    const created: Transaction = {
      id: 99,
      space_id: 2,
      user_id: 1,
      category_id: 200,
      type: 'expense',
      amount: '30.00',
      concept: 'Compra',
      date: '2026-10-20',
    };

    component.onTransactionCreated(created);
    fixture.detectChanges();

    expect(component.page()).toBe(1);

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush(transactionResponse(2, '30.00'));
    categoriesRequest.flush(categoryResponse(2));
    fixture.detectChanges();
  });

  it('conserva los filtros aplicados después de crear', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    const filteredTransactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1&type=expense`,
    );

    const filteredCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    filteredTransactions.flush(transactionResponse(2));
    filteredCategories.flush(categoryResponse(2));
    fixture.detectChanges();

    component.openCreateTransaction();
    fixture.detectChanges();

    const created: Transaction = {
      id: 99,
      space_id: 2,
      user_id: 1,
      category_id: 200,
      type: 'expense',
      amount: '15.00',
      concept: 'Café',
      date: '2026-10-20',
    };

    component.onTransactionCreated(created);
    fixture.detectChanges();

    expect(component.appliedFilters().type).toBe('expense');

    const refreshedTransactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1&type=expense`,
    );

    const refreshedCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    refreshedTransactions.flush(transactionResponse(2, '15.00'));
    refreshedCategories.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.creationMessage()).toContain('Café');
  });

  it('ignora un movimiento creado en otro espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateTransaction();
    fixture.detectChanges();

    const external: Transaction = {
      id: 80,
      space_id: 8,
      user_id: 1,
      category_id: 800,
      type: 'expense',
      amount: '10.00',
      concept: 'Otro espacio',
      date: '2026-10-20',
    };

    component.onTransactionCreated(external);
    fixture.detectChanges();

    expect(component.creationMessage()).toBeNull();
    expect(component.transactions()).toHaveLength(1);

    httpTesting.expectNone(`${environment.apiUrl}/transactions?spaceId=2&page=1`);
  });

  it('cierra la creación al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateTransaction();
    fixture.detectChanges();

    spaceStore.select(8);
    fixture.detectChanges();

    expect(component.creatingTransaction()).toBe(false);
    expect(component.creationMessage()).toBeNull();

    completeLoad(8);
  });

  it('cierra la creación al finalizar la sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openCreateTransaction();
    fixture.detectChanges();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.creatingTransaction()).toBe(false);
    expect(component.transactions()).toEqual([]);
    expect(component.creationMessage()).toBeNull();
  });

  it('abre el formulario de edición del movimiento', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const transaction: Transaction = component.transactions()[0]!;

    component.openEditTransaction(transaction);
    fixture.detectChanges();

    expect(component.editingTransaction()).toEqual(transaction);

    expect(fixture.nativeElement.querySelector('app-edit-transaction')).not.toBeNull();
  });

  it('cancela la edición sin modificar el listado', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    component.cancelEditTransaction();
    fixture.detectChanges();

    expect(component.editingTransaction()).toBeNull();
    expect(component.transactions()).toHaveLength(1);

    httpTesting.expectNone(`${environment.apiUrl}/transactions/update`);
  });

  it('impide editar un movimiento de otro espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const external: Transaction = {
      ...component.transactions()[0]!,
      id: 80,
      space_id: 8,
    };

    component.openEditTransaction(external);

    expect(component.editingTransaction()).toBeNull();
  });

  it('impide abrir creación mientras se está editando', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openEditTransaction(component.transactions()[0]!);
    component.openCreateTransaction();

    expect(component.editingTransaction()).not.toBeNull();
    expect(component.creatingTransaction()).toBe(false);
  });

  it('actualiza el listado tras guardar una edición', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const updated: Transaction = {
      ...component.transactions()[0]!,
      amount: '120.00',
      concept: 'Electricidad ajustada',
    };

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    component.onTransactionSaved(updated);
    fixture.detectChanges();

    expect(component.editingTransaction()).toBeNull();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush(transactionResponse(2, '120.00'));
    categoriesRequest.flush(categoryResponse(2));

    fixture.detectChanges();

    expect(component.transactions()[0]?.amount).toBe('120.00');
    expect(component.creationMessage()).toBe(
      'Se ha actualizado el movimiento «Electricidad ajustada».',
    );
  });

  it('conserva la página actual después de editar', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    const updated: Transaction = {
      ...component.transactions()[0]!,
      amount: '110.00',
    };

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    component.onTransactionSaved(updated);
    fixture.detectChanges();

    expect(component.page()).toBe(2);

    completeLoad(2, '110.00', 2, 45, 3);

    expect(component.transactions()[0]?.amount).toBe('110.00');
  });

  it('conserva los filtros aplicados después de editar', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    const filtered = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1&type=expense`,
    );

    const filteredCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    filtered.flush(transactionResponse(2));
    filteredCategories.flush(categoryResponse(2));
    fixture.detectChanges();

    const updated: Transaction = {
      ...component.transactions()[0]!,
      concept: 'Nuevo concepto',
    };

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    component.onTransactionSaved(updated);
    fixture.detectChanges();

    const refreshed = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1&type=expense`,
    );

    const refreshedCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    refreshed.flush(transactionResponse(2));
    refreshedCategories.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.appliedFilters().type).toBe('expense');
  });

  it('descarta una respuesta de edición de otro espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const original: Transaction = component.transactions()[0]!;

    component.openEditTransaction(original);

    component.onTransactionSaved({
      ...original,
      space_id: 8,
      amount: '500.00',
    });

    fixture.detectChanges();

    expect(component.editingTransaction()).toBeNull();
    expect(component.transactions()[0]?.amount).toBe('95.40');

    httpTesting.expectNone(`${environment.apiUrl}/transactions?spaceId=2&page=1`);
  });

  it('cierra la edición al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    spaceStore.select(8);
    fixture.detectChanges();

    expect(component.editingTransaction()).toBeNull();
    expect(component.creationMessage()).toBeNull();

    completeLoad(8);
  });

  it('cierra la edición al cerrar sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.editingTransaction()).toBeNull();
    expect(component.transactions()).toEqual([]);
  });

  it('cierra la edición al actualizar manualmente', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.openEditTransaction(component.transactions()[0]!);
    fixture.detectChanges();

    component.reload();
    fixture.detectChanges();

    expect(component.editingTransaction()).toBeNull();

    completeLoad(2);
  });

  it('solicita confirmación antes de eliminar', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const transaction: Transaction = component.transactions()[0]!;

    component.requestDelete(transaction);
    fixture.detectChanges();

    expect(component.confirmationId()).toBe(transaction.id);
    expect(component.deletingId()).toBeNull();

    expect(fixture.nativeElement.textContent).toContain('Confirmar eliminación');

    httpTesting.expectNone(`${environment.apiUrl}/transactions/delete`);
  });

  it('cancela sin eliminar el movimiento', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.requestDelete(component.transactions()[0]!);
    component.cancelDelete();

    fixture.detectChanges();

    expect(component.confirmationId()).toBeNull();
    expect(component.deleteError()).toBeNull();
    expect(component.transactions()).toHaveLength(1);

    httpTesting.expectNone(`${environment.apiUrl}/transactions/delete`);
  });

  it('rechaza la eliminación de otro espacio', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const external: Transaction = {
      ...component.transactions()[0]!,
      id: 80,
      space_id: 8,
    };

    component.requestDelete(external);

    expect(component.confirmationId()).toBeNull();
  });

  it('impide crear o editar durante una confirmación', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const transaction: Transaction = component.transactions()[0]!;

    component.requestDelete(transaction);
    component.openCreateTransaction();
    component.openEditTransaction(transaction);

    expect(component.creatingTransaction()).toBe(false);
    expect(component.editingTransaction()).toBeNull();
    expect(component.confirmationId()).toBe(transaction.id);
  });

  it('elimina el movimiento y recarga la página actual', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    const transaction: Transaction = component.transactions()[0]!;

    component.requestDelete(transaction);

    const deletion: Promise<void> = component.confirmDelete();

    expect(component.deletingId()).toBe(transaction.id);

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      transactionId: transaction.id,
    });

    request.flush({
      success: true,
      error: null,
      message: null,
    });

    await deletion;
    fixture.detectChanges();

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
    expect(component.confirmationId()).toBeNull();
    expect(component.deletingId()).toBeNull();

    expect(component.creationMessage()).toBe('Se ha eliminado el movimiento «Electricidad».');
  });

  it('regresa a la página anterior si elimina su único movimiento', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 21, 2);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 21, 2);

    component.requestDelete(component.transactions()[0]!);

    const deletion: Promise<void> = component.confirmDelete();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    request.flush({
      success: true,
      error: null,
      message: null,
    });

    await deletion;
    fixture.detectChanges();

    expect(component.page()).toBe(1);

    completeLoad(2, '95.40', 1, 20, 1);

    expect(component.transactions()).toHaveLength(1);
    expect(component.total()).toBe(20);
  });

  it('impide enviar dos peticiones simultáneas de eliminación', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.requestDelete(component.transactions()[0]!);

    const first: Promise<void> = component.confirmDelete();
    const second: Promise<void> = component.confirmDelete();

    const requests = httpTesting.match(`${environment.apiUrl}/transactions/delete`);

    expect(requests).toHaveLength(1);

    requests[0]!.flush({
      success: true,
      error: null,
      message: null,
    });

    await Promise.all([first, second]);
    fixture.detectChanges();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush(transactionResponse(2));
    categoriesRequest.flush(categoryResponse(2));
    fixture.detectChanges();
  });

  it.each([
    [400, 'Los identificadores del movimiento no son válidos.'],
    [401, 'Tu sesión ha caducado. Vuelve a iniciar sesión.'],
    [403, 'No tienes permiso para eliminar este movimiento.'],
    [404, 'El movimiento ya no está disponible. Actualiza el listado.'],
    [409, 'No se puede eliminar un movimiento vinculado a una ocurrencia recurrente.'],
    [0, 'No se ha podido conectar con el servidor.'],
  ])(
    'muestra el error HTTP %i al eliminar',
    async (status: number, message: string): Promise<void> => {
      await loadSpaces();
      completeLoad(2);

      const transaction: Transaction = component.transactions()[0]!;

      component.requestDelete(transaction);

      const deletion: Promise<void> = component.confirmDelete();

      const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

      request.flush(
        {
          success: false,
          error: status === 409 ? 'transaction_conflict' : 'test_error',
          message: 'Error de prueba',
        },
        {
          status,
          statusText: status === 0 ? 'Unknown Error' : 'Error',
        },
      );

      await deletion;
      fixture.detectChanges();

      expect(component.deleteError()).toBe(message);
      expect(component.confirmationId()).toBe(transaction.id);
      expect(component.deletingId()).toBeNull();
      expect(component.transactions()).toHaveLength(1);
      expect(fixture.nativeElement.textContent).toContain(message);
    },
  );

  it('mantiene el movimiento si la API devuelve success false', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.requestDelete(component.transactions()[0]!);

    const deletion: Promise<void> = component.confirmDelete();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    request.flush({
      success: false,
      error: 'transaction_conflict',
      message: 'Operación rechazada',
    });

    await deletion;
    fixture.detectChanges();

    expect(component.deleteError()).toBe('No se ha podido eliminar el movimiento.');

    expect(component.transactions()).toHaveLength(1);
  });

  it('descarta la respuesta si cambia el espacio durante la eliminación', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.requestDelete(component.transactions()[0]!);

    const deletion: Promise<void> = component.confirmDelete();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    spaceStore.select(8);
    fixture.detectChanges();

    request.flush({
      success: true,
      error: null,
      message: null,
    });

    await deletion;
    fixture.detectChanges();

    expect(component.confirmationId()).toBeNull();
    expect(component.deletingId()).toBeNull();
    expect(component.creationMessage()).toBeNull();

    completeLoad(8);

    expect(component.transactions()[0]?.space_id).toBe(8);
  });

  it('descarta la respuesta si se cierra la sesión', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.requestDelete(component.transactions()[0]!);

    const deletion: Promise<void> = component.confirmDelete();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    request.flush({
      success: true,
      error: null,
      message: null,
    });

    await deletion;
    fixture.detectChanges();

    expect(component.transactions()).toEqual([]);
    expect(component.confirmationId()).toBeNull();
    expect(component.creationMessage()).toBeNull();
  });

  it('cierra la confirmación al actualizar manualmente', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.requestDelete(component.transactions()[0]!);
    component.reload();
    fixture.detectChanges();

    expect(component.confirmationId()).toBeNull();

    completeLoad(2);
  });

  it('conserva los filtros aplicados después de eliminar', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2);

    component.filtersModel.update((model) => ({
      ...model,
      type: 'expense',
    }));

    fixture.detectChanges();
    component.applyFilters();
    fixture.detectChanges();

    const filtered = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1&type=expense`,
    );

    const filteredCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    filtered.flush(transactionResponse(2));
    filteredCategories.flush(categoryResponse(2));
    fixture.detectChanges();

    component.requestDelete(component.transactions()[0]!);

    const deletion: Promise<void> = component.confirmDelete();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    request.flush({
      success: true,
      error: null,
      message: null,
    });

    await deletion;
    fixture.detectChanges();

    expect(component.appliedFilters().type).toBe('expense');

    const refreshed = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1&type=expense`,
    );

    const refreshedCategories = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    refreshed.flush({
      success: true,
      transactions: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      error: null,
      message: null,
    } satisfies TransactionsResponse);

    refreshedCategories.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.appliedFilters().type).toBe('expense');
    expect(component.transactions()).toEqual([]);
  });

  it('actualiza la página actual tras una creación global', async (): Promise<void> => {
    await loadSpaces();
    completeLoad(2, '95.40', 1, 45, 3);

    component.nextPage();
    fixture.detectChanges();
    completeLoad(2, '100.00', 2, 45, 3);

    const refreshService: TransactionRefreshService = TestBed.inject(TransactionRefreshService);

    refreshService.notifyChanged();
    fixture.detectChanges();

    expect(component.page()).toBe(2);
    expect(component.loading()).toBe(true);

    completeLoad(2, '125.00', 2, 45, 3);

    expect(component.page()).toBe(2);
    expect(component.transactions()[0]?.amount).toBe('125.00');
  });

  it('ofrece acceso a recurrentes desde Movimientos', (): void => {
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '.transactions__recurring-link',
    );

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/recurring');
    expect(link?.textContent).toContain('Ver recurrentes');
  });

  it('agrupa las acciones de la cabecera', (): void => {
    const header: HTMLElement = fixture.nativeElement.querySelector('.transactions__heading');

    expect(header.querySelector(':scope > .transactions__heading-title')).not.toBeNull();

    const actions: HTMLElement | null = header.querySelector(
      ':scope > .transactions__heading-actions',
    );

    expect(actions).not.toBeNull();

    if (actions === null) {
      throw new Error('No se ha encontrado el contenedor de acciones.');
    }

    expect(actions.querySelector('.transactions__recurring-link')).not.toBeNull();
  });

  it('incluye etiquetas compactas y accesibles en las acciones', (): void => {
    const recurring: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '.transactions__recurring-link',
    );

    expect(recurring?.getAttribute('aria-label')).toBe('Ver recurrentes');

    expect(recurring?.querySelector('.transactions__label-mobile')?.textContent?.trim()).toBe(
      'Recurrentes',
    );

    const newButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.transactions__heading-actions button[aria-label="Nuevo movimiento"]',
    );

    expect(newButton).not.toBeNull();

    expect(newButton?.querySelector('.transactions__label-mobile')?.textContent?.trim()).toBe(
      'Nuevo',
    );
  });
});
