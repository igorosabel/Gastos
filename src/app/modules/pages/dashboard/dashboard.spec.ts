import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type MonthlyCategoriesResponse from '@interfaces/reports/monthly-categories-response.interface';
import type MonthlyForecastResponse from '@interfaces/reports/monthly-forecast-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import type Transaction from '@model/transactions/transaction.model';
import Dashboard from '@pages/dashboard/dashboard';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Dashboard', (): void => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
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

  function forecastResponse(spaceId: number, month: string): MonthlyForecastResponse {
    return {
      success: true,
      report: {
        space_id: spaceId,
        month,
        actual: {
          space_id: spaceId,
          month,
          income: '2500.00',
          expense: '1800.00',
          balance: '700.00',
          income_count: 1,
          expense_count: 10,
          transaction_count: 11,
        },
        projected: {
          income: '2500.00',
          expense: '2000.00',
          balance: '500.00',
        },
      },
      error: null,
      message: null,
    };
  }

  function categoriesResponse(spaceId: number, month: string): MonthlyCategoriesResponse {
    return {
      success: true,
      report: {
        space_id: spaceId,
        month,
        categories: [
          {
            category_id: spaceId * 100,
            parent_id: null,
            name: 'Hogar',
            type: 'expense',
            amount: '425.60',
            transaction_count: 12,
          },
          {
            category_id: spaceId * 100 + 1,
            parent_id: null,
            name: 'Nómina',
            type: 'income',
            amount: '2500.00',
            transaction_count: 1,
          },
        ],
      },
      error: null,
      message: null,
    };
  }

  function transactionsResponse(spaceId: number, count: number = 2): TransactionsResponse {
    const transactions: Transaction[] = Array.from(
      { length: count },
      (_: unknown, index: number): Transaction => ({
        id: spaceId * 100 + index + 1,
        space_id: spaceId,
        user_id: 1,
        category_id: spaceId * 100,
        type: index === 1 ? 'income' : 'expense',
        amount: index === 1 ? '2500.00' : '95.40',
        concept: index === 0 ? 'Electricidad' : index === 1 ? 'Nómina' : `Movimiento ${index + 1}`,
        date: '2026-10-20',
      }),
    );

    return {
      success: true,
      transactions,
      total: count,
      page: 1,
      page_size: 20,
      total_pages: count === 0 ? 0 : 1,
      error: null,
      message: null,
    };
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Dashboard],
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

    fixture = TestBed.createComponent(Dashboard);
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

  function completeDashboard(spaceId: number, transactionCount: number = 2): void {
    const month: string = component.month;

    const forecast = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=${spaceId}&month=${month}`,
    );

    const categories = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=${spaceId}&month=${month}`,
    );

    const transactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=${spaceId}&page=1`,
    );

    expect(forecast.request.method).toBe('GET');
    expect(categories.request.method).toBe('GET');
    expect(transactions.request.method).toBe('GET');

    forecast.flush(forecastResponse(spaceId, month));
    categories.flush(categoriesResponse(spaceId, month));
    transactions.flush(transactionsResponse(spaceId, transactionCount));

    fixture.detectChanges();
  }

  it('solicita seleccionar un espacio si no hay ninguno activo', (): void => {
    expect(component.forecast()).toBeNull();
    expect(component.loading()).toBe(false);

    expect(fixture.nativeElement.textContent).toContain('Selecciona un espacio');

    httpTesting.expectNone(`${environment.apiUrl}/reports/monthly/forecast`);
  });

  it('consulta los datos del espacio y mes activos', async (): Promise<void> => {
    await loadSpaces();

    expect(component.loading()).toBe(true);

    completeDashboard(2);

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.forecast()?.space_id).toBe(2);
    expect(component.forecast()?.month).toBe(component.month);
  });

  it('muestra las cuatro cifras económicas reales', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2);

    const metrics: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.dashboard__metric');

    expect(metrics).toHaveLength(4);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Ingresos');
    expect(content).toContain('2.500,00 €');
    expect(content).toContain('Gastos');
    expect(content).toContain('1.800,00 €');
    expect(content).toContain('Resultado');
    expect(content).toContain('700,00 €');
    expect(content).toContain('Previsión fin de mes');
    expect(content).toContain('500,00 €');
  });

  it('muestra solo las categorías de gasto', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2);

    expect(component.expenseCategories()).toHaveLength(1);
    expect(component.expenseCategories()[0]?.name).toBe('Hogar');

    const categories: HTMLElement = fixture.nativeElement.querySelector('.dashboard__categories');

    expect(categories.textContent).toContain('Hogar');
    expect(categories.textContent).toContain('425,60 €');
    expect(categories.textContent).not.toContain('Nómina');
  });

  it('presenta la proporción de cada categoría', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2);

    expect(component.percentageOf('425.60', '1800.00')).toBe(23);

    const bar: HTMLElement = fixture.nativeElement.querySelector('.dashboard__category-bar');

    expect(bar.style.width).toBe('23%');
  });

  it('muestra los movimientos más recientes', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Electricidad');
    expect(content).toContain('Nómina');
    expect(content).toContain('95,40 €');
    expect(content).toContain('2.500,00 €');
  });

  it('limita el resumen a cinco movimientos', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2, 6);

    expect(component.latestTransactions()).toHaveLength(5);

    const items: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.dashboard__transaction');

    expect(items).toHaveLength(5);
    expect(fixture.nativeElement.textContent).not.toContain('Movimiento 6');
  });

  it('muestra estados vacíos cuando no hay datos', async (): Promise<void> => {
    await loadSpaces();

    const month: string = component.month;

    const forecast = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=2&month=${month}`,
    );

    const categories = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${month}`,
    );

    const transactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    const emptyForecast: MonthlyForecastResponse = forecastResponse(2, month);

    emptyForecast.report.actual.income = '0.00';
    emptyForecast.report.actual.expense = '0.00';
    emptyForecast.report.actual.balance = '0.00';
    emptyForecast.report.projected.balance = '0.00';

    forecast.flush(emptyForecast);
    categories.flush({
      ...categoriesResponse(2, month),
      report: {
        space_id: 2,
        month,
        categories: [],
      },
    } satisfies MonthlyCategoriesResponse);

    transactions.flush(transactionsResponse(2, 0));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay gastos por categorías este mes.');

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay movimientos registrados.');

    expect(fixture.nativeElement.textContent).toContain('0,00 €');
  });

  it('permite actualizar el resumen', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2);

    component.reload();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    completeDashboard(2);

    expect(component.loading()).toBe(false);
    expect(component.forecast()?.actual.balance).toBe('700.00');
  });

  it('no duplica consultas mientras carga', async (): Promise<void> => {
    await loadSpaces();

    component.reload();
    fixture.detectChanges();

    completeDashboard(2);

    expect(component.loading()).toBe(false);
  });

  it('cancela los datos del espacio anterior', async (): Promise<void> => {
    await loadSpaces();

    const month: string = component.month;

    const oldForecast = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=2&month=${month}`,
    );

    const oldCategories = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${month}`,
    );

    const oldTransactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    spaceStore.select(8);
    fixture.detectChanges();

    expect(oldForecast.cancelled).toBe(true);
    expect(oldCategories.cancelled).toBe(true);
    expect(oldTransactions.cancelled).toBe(true);
    expect(component.forecast()).toBeNull();

    completeDashboard(8);

    expect(component.forecast()?.space_id).toBe(8);
    expect(component.latestTransactions()[0]?.space_id).toBe(8);
  });

  it('descarta el resumen al cerrar sesión', async (): Promise<void> => {
    await loadSpaces();
    completeDashboard(2);

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.forecast()).toBeNull();
    expect(component.categories()).toEqual([]);
    expect(component.latestTransactions()).toEqual([]);
  });

  it('muestra un error HTTP sin datos parciales', async (): Promise<void> => {
    await loadSpaces();

    const month: string = component.month;

    const forecast = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=2&month=${month}`,
    );

    const categories = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${month}`,
    );

    const transactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    forecast.flush(
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
    expect(transactions.cancelled).toBe(true);

    fixture.detectChanges();

    expect(component.error()).toBe('No tienes permiso para consultar este espacio.');
    expect(component.forecast()).toBeNull();

    expect(fixture.nativeElement.textContent).toContain('No tienes permiso');
  });

  it('rechaza una respuesta con success false', async (): Promise<void> => {
    await loadSpaces();

    const month: string = component.month;

    const forecast = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=2&month=${month}`,
    );

    const categories = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${month}`,
    );

    const transactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    forecast.flush(forecastResponse(2, month));
    categories.flush({
      ...categoriesResponse(2, month),
      success: false,
    } satisfies MonthlyCategoriesResponse);
    transactions.flush(transactionsResponse(2));

    fixture.detectChanges();

    expect(component.error()).toBe('No se ha podido obtener el resumen económico.');
    expect(component.forecast()).toBeNull();
  });

  it('rechaza datos que no corresponden al mes activo', async (): Promise<void> => {
    await loadSpaces();

    const month: string = component.month;

    const forecast = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=2&month=${month}`,
    );

    const categories = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${month}`,
    );

    const transactions = httpTesting.expectOne(
      `${environment.apiUrl}/transactions?spaceId=2&page=1`,
    );

    forecast.flush(forecastResponse(2, '2000-01'));
    categories.flush(categoriesResponse(2, month));
    transactions.flush(transactionsResponse(2));

    fixture.detectChanges();

    expect(component.forecast()).toBeNull();
    expect(component.error()).toBe('No se ha podido obtener el resumen económico.');
  });
});
