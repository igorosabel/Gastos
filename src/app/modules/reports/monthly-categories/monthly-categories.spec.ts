import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type MonthlyCategoriesResponse from '@interfaces/reports/monthly-categories-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type MonthlyCategory from '@model/reports/monthly-category.model';
import type MonthlySummary from '@model/reports/monthly-summary.model';
import MonthlyCategories from '@modules/reports/monthly-categories/monthly-categories';
import TransactionRefreshService from '@services/transaction-refresh.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('MonthlyCategories', (): void => {
  let fixture: ComponentFixture<MonthlyCategories>;
  let component: MonthlyCategories;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;

  const month: string = '2026-10';

  const summary: MonthlySummary = {
    space_id: 2,
    month,
    income: '2500.00',
    expense: '1800.00',
    balance: '700.00',
    income_count: 2,
    expense_count: 5,
    transaction_count: 7,
  };

  const categories: MonthlyCategory[] = [
    {
      category_id: 20,
      parent_id: null,
      name: 'Hogar',
      type: 'expense',
      amount: '450.00',
      transaction_count: 3,
    },
    {
      category_id: 21,
      parent_id: null,
      name: 'Nómina',
      type: 'income',
      amount: '500.00',
      transaction_count: 1,
    },
  ];

  function response(
    spaceId: number,
    selectedMonth: string,
    items: MonthlyCategory[] = categories,
  ): MonthlyCategoriesResponse {
    return {
      success: true,
      report: {
        space_id: spaceId,
        month: selectedMonth,
        categories: items,
      },
      error: null,
      message: null,
    };
  }

  function request(spaceId: number = 2, selectedMonth: string = month): TestRequest {
    return httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=${spaceId}&month=${selectedMonth}`,
    );
  }

  function completeLoad(
    spaceId: number = 2,
    selectedMonth: string = month,
    items: MonthlyCategory[] = categories,
  ): void {
    const pending: TestRequest = request(spaceId, selectedMonth);

    expect(pending.request.method).toBe('GET');
    pending.flush(response(spaceId, selectedMonth, items));
    fixture.detectChanges();
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [MonthlyCategories],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

    const loading: Promise<void> = spaceStore.load();

    httpTesting.expectOne(`${environment.apiUrl}/spaces`).flush({
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
    } satisfies SpacesResponse);

    await loading;

    fixture = TestBed.createComponent(MonthlyCategories);
    fixture.componentRef.setInput('spaceId', 2);
    fixture.componentRef.setInput('month', month);
    fixture.componentRef.setInput('summary', summary);

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

  it('consulta las categorías del espacio y mes', (): void => {
    expect(component.loading()).toBe(true);

    completeLoad();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.categories()).toHaveLength(2);
  });

  it('muestra gastos y calcula su proporción', (): void => {
    completeLoad();

    expect(component.categoryType()).toBe('expense');
    expect(component.visibleCategories()).toHaveLength(1);
    expect(component.total()).toBe('1800.00');

    expect(fixture.nativeElement.textContent).toContain('Hogar');
    expect(fixture.nativeElement.textContent).toContain('450,00 €');
    expect(fixture.nativeElement.textContent).toContain('1.800,00 €');

    const bar: HTMLElement = fixture.nativeElement.querySelector('.monthly-categories__bar');

    expect(bar.style.width).toBe('25%');
  });

  it('permite cambiar a ingresos sin otra petición', (): void => {
    completeLoad();

    component.setCategoryType('income');
    fixture.detectChanges();

    expect(component.total()).toBe('2500.00');
    expect(component.visibleCategories()).toHaveLength(1);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Nómina');
    expect(content).toContain('500,00 €');
    expect(content).not.toContain('Hogar');

    expect(component.percentageOf('500.00', '2500.00')).toBe(20);

    httpTesting.expectNone(`${environment.apiUrl}/reports/monthly/categories`);
  });

  it('muestra un estado vacío cuando no hay categorías', (): void => {
    completeLoad(2, month, []);

    expect(fixture.nativeElement.textContent).toContain(
      'No hay gastos asignados a categorías este mes.',
    );

    component.setCategoryType('income');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay ingresos asignados a categorías este mes.',
    );
  });

  it('cancela la consulta anterior al cambiar de mes', (): void => {
    const previous: TestRequest = request();

    fixture.componentRef.setInput('month', '2026-09');
    fixture.detectChanges();

    expect(previous.cancelled).toBe(true);
    expect(component.categories()).toEqual([]);

    completeLoad(2, '2026-09');

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('cancela la consulta anterior al cambiar de espacio', (): void => {
    const previous: TestRequest = request();

    spaceStore.select(8);
    fixture.componentRef.setInput('spaceId', 8);
    fixture.detectChanges();

    expect(previous.cancelled).toBe(true);
    expect(component.categories()).toEqual([]);

    completeLoad(8, month);

    expect(component.loading()).toBe(false);
  });

  it('descarta los datos al cerrar sesión', (): void => {
    completeLoad();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.categories()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('muestra el error HTTP de permisos', (): void => {
    request().flush(
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

    fixture.detectChanges();

    expect(component.error()).toBe('No tienes permiso para consultar estas categorías.');

    expect(component.categories()).toEqual([]);
  });

  it('rechaza una respuesta de otro espacio', (): void => {
    request().flush(response(8, month));
    fixture.detectChanges();

    expect(component.error()).toBe('No se ha podido obtener el desglose por categorías.');

    expect(component.categories()).toEqual([]);
  });

  it('rechaza una respuesta de otro mes', (): void => {
    request().flush(response(2, '2026-09'));
    fixture.detectChanges();

    expect(component.error()).toBe('No se ha podido obtener el desglose por categorías.');

    expect(component.categories()).toEqual([]);
  });

  it('permite reintentar una consulta fallida', (): void => {
    request().flush(
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

    fixture.detectChanges();

    component.reload();
    fixture.detectChanges();

    completeLoad();

    expect(component.error()).toBeNull();
    expect(component.categories()).toHaveLength(2);
  });

  it('actualiza el desglose tras registrar un movimiento', (): void => {
    completeLoad();

    const refreshService: TransactionRefreshService = TestBed.inject(TransactionRefreshService);

    refreshService.notifyChanged();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    completeLoad();

    expect(component.loading()).toBe(false);
  });
});
