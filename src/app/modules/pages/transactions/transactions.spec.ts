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

  function completeLoad(spaceId: number, amount: string = '95.40'): void {
    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=${spaceId}&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(
      `${environment.apiUrl}/categories?spaceId=${spaceId}`,
    );

    expect(transactionsRequest.request.method).toBe('GET');
    expect(categoriesRequest.request.method).toBe('GET');

    transactionsRequest.flush(transactionResponse(spaceId, amount));
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

  it('muestra un aviso cuando existen más páginas', async (): Promise<void> => {
    await loadSpaces();

    const transactionsRequest = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const categoriesRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    transactionsRequest.flush({
      ...transactionResponse(2),
      total: 45,
      total_pages: 3,
    } satisfies TransactionsResponse);

    categoriesRequest.flush(categoryResponse(2));
    fixture.detectChanges();

    expect(component.total()).toBe(45);
    expect(fixture.nativeElement.textContent).toContain('Mostrando los primeros 1');
  });
});
