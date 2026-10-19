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
import type EvolutionResponse from '@interfaces/reports/evolution-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import { monthLabel, shiftMonth } from '@model/reports/month-period';
import type MonthlySummary from '@model/reports/monthly-summary.model';
import Reports from '@pages/reports/reports';
import TransactionRefreshService from '@services/transaction-refresh.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Reports', (): void => {
  let fixture: ComponentFixture<Reports>;
  let component: Reports;
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

  function summary(
    spaceId: number,
    month: string,
    income: string = '2500.00',
    expense: string = '1800.00',
    balance: string = '700.00',
  ): MonthlySummary {
    return {
      space_id: spaceId,
      month,
      income,
      expense,
      balance,
      income_count: 1,
      expense_count: 10,
      transaction_count: 11,
    };
  }

  function evolutionResponse(
    spaceId: number,
    end: string,
    months: MonthlySummary[] = [
      summary(spaceId, end),
      summary(spaceId, shiftMonth(end, -1), '2400.00', '2600.00', '-200.00'),
    ],
  ): EvolutionResponse {
    return {
      success: true,
      report: {
        space_id: spaceId,
        month_from: shiftMonth(end, -11),
        month_to: end,
        months,
      },
      error: null,
      message: null,
    };
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Reports],
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

    fixture = TestBed.createComponent(Reports);
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

  function evolutionRequest(spaceId: number, end: string = component.periodEnd()): TestRequest {
    return httpTesting.expectOne(
      `${environment.apiUrl}/reports/evolution?spaceId=${spaceId}&monthFrom=${shiftMonth(end, -11)}&monthTo=${end}`,
    );
  }

  function completeEvolution(spaceId: number, end: string = component.periodEnd()): void {
    const request: TestRequest = evolutionRequest(spaceId, end);

    expect(request.request.method).toBe('GET');

    request.flush(evolutionResponse(spaceId, end));
    fixture.detectChanges();
  }

  it('no consulta informes sin espacio activo', (): void => {
    expect(component.loading()).toBe(false);
    expect(component.months()).toEqual([]);

    expect(fixture.nativeElement.textContent).toContain('Selecciona un espacio');

    httpTesting.expectNone(`${environment.apiUrl}/reports/evolution`);
  });

  it('consulta los últimos doce meses del espacio activo', async (): Promise<void> => {
    await loadSpaces();

    expect(component.periodEnd()).toBe(component.currentMonth);
    expect(component.periodStart()).toBe(shiftMonth(component.currentMonth, -11));
    expect(component.loading()).toBe(true);

    completeEvolution(2);

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.months()).toHaveLength(2);
  });

  it('muestra ingresos, gastos y resultado reales', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('2.500,00 €');
    expect(content).toContain('1.800,00 €');
    expect(content).toContain('700,00 €');
    expect(content).toContain('-200,00 €');
  });

  it('ordena los meses del más reciente al más antiguo', async (): Promise<void> => {
    await loadSpaces();

    const end: string = component.periodEnd();

    evolutionRequest(2).flush(
      evolutionResponse(2, end, [
        summary(2, shiftMonth(end, -2)),
        summary(2, end),
        summary(2, shiftMonth(end, -1)),
      ]),
    );

    fixture.detectChanges();

    expect(component.orderedMonths().map((month: MonthlySummary): string => month.month)).toEqual([
      end,
      shiftMonth(end, -1),
      shiftMonth(end, -2),
    ]);

    expect(fixture.nativeElement.textContent).toContain(monthLabel(end));
  });

  it('consulta el periodo de doce meses anterior', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    const previousEnd: string = shiftMonth(component.currentMonth, -12);

    component.previousPeriod();
    fixture.detectChanges();

    expect(component.periodEnd()).toBe(previousEnd);
    expect(component.periodStart()).toBe(shiftMonth(previousEnd, -11));

    completeEvolution(2, previousEnd);
  });

  it('permite regresar al periodo actual', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    component.previousPeriod();
    fixture.detectChanges();
    completeEvolution(2);

    component.nextPeriod();
    fixture.detectChanges();

    expect(component.periodEnd()).toBe(component.currentMonth);

    completeEvolution(2);
  });

  it('impide consultar meses futuros', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    component.nextPeriod();
    fixture.detectChanges();

    expect(component.periodEnd()).toBe(component.currentMonth);

    expect(component.loading()).toBe(false);
  });

  it('actualiza el periodo seleccionado', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    component.previousPeriod();
    fixture.detectChanges();
    completeEvolution(2);

    const selectedEnd: string = component.periodEnd();

    component.reload();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);
    expect(component.periodEnd()).toBe(selectedEnd);

    completeEvolution(2, selectedEnd);
  });

  it('no duplica consultas mientras carga', async (): Promise<void> => {
    await loadSpaces();

    component.previousPeriod();
    component.nextPeriod();
    component.reload();

    expect(component.periodEnd()).toBe(component.currentMonth);

    completeEvolution(2);
  });

  it('actualiza los informes después del registro rápido', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    const refreshService: TransactionRefreshService = TestBed.inject(TransactionRefreshService);

    refreshService.notifyChanged();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    completeEvolution(2);

    expect(component.loading()).toBe(false);
  });

  it('cancela la consulta anterior al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();

    const request: TestRequest = evolutionRequest(2);

    spaceStore.select(8);
    fixture.detectChanges();

    expect(request.cancelled).toBe(true);
    expect(component.months()).toEqual([]);

    completeEvolution(8);

    expect(component.months()[0]?.space_id).toBe(8);
  });

  it('limpia los informes al cerrar la sesión', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.months()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('presenta un estado vacío sin resultados', async (): Promise<void> => {
    await loadSpaces();

    evolutionRequest(2).flush(evolutionResponse(2, component.periodEnd(), []));

    fixture.detectChanges();

    expect(component.months()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay datos disponibles para este periodo.',
    );
  });

  it('muestra un error HTTP de permisos', async (): Promise<void> => {
    await loadSpaces();

    evolutionRequest(2).flush(
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

    expect(component.error()).toBe(
      'No tienes permiso para consultar los informes de este espacio.',
    );
    expect(component.months()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No tienes permiso');
  });

  it('rechaza respuestas de otro espacio', async (): Promise<void> => {
    await loadSpaces();

    const invalid: EvolutionResponse = evolutionResponse(8, component.periodEnd());

    evolutionRequest(2).flush(invalid);
    fixture.detectChanges();

    expect(component.months()).toEqual([]);
    expect(component.error()).toBe('No se ha podido obtener la evolución económica.');
  });

  it('rechaza respuestas de otro intervalo', async (): Promise<void> => {
    await loadSpaces();

    const invalid: EvolutionResponse = evolutionResponse(2, component.periodEnd());

    invalid.report.month_from = '2000-01';

    evolutionRequest(2).flush(invalid);
    fixture.detectChanges();

    expect(component.months()).toEqual([]);
    expect(component.error()).toBe('No se ha podido obtener la evolución económica.');
  });

  it('rechaza una respuesta con success false', async (): Promise<void> => {
    await loadSpaces();

    evolutionRequest(2).flush({
      ...evolutionResponse(2, component.periodEnd()),
      success: false,
      error: 'validation_error',
      message: 'Informe no disponible',
    } satisfies EvolutionResponse);

    fixture.detectChanges();

    expect(component.months()).toEqual([]);
    expect(component.error()).toBe('No se ha podido obtener la evolución económica.');
  });

  it('mantiene Evolución como vista inicial', (): void => {
    expect(component.activeView()).toBe('evolution');
    expect(component.categoryMonth()).toBe(component.currentMonth);
  });

  it('abre el análisis de categorías del mes seleccionado', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    component.selectView('categories');
    fixture.detectChanges();

    expect(component.activeView()).toBe('categories');

    const request: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${component.categoryMonth()}`,
    );

    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      report: {
        space_id: 2,
        month: component.categoryMonth(),
        categories: [
          {
            category_id: 20,
            parent_id: null,
            name: 'Hogar',
            type: 'expense',
            amount: '450.00',
            transaction_count: 3,
          },
        ],
      },
      error: null,
      message: null,
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Análisis mensual por categorías');
    expect(fixture.nativeElement.textContent).toContain('Hogar');
    expect(fixture.nativeElement.textContent).toContain('450,00 €');

    component.selectView('evolution');
    fixture.detectChanges();

    expect(component.activeView()).toBe('evolution');
    expect(fixture.nativeElement.querySelector('app-monthly-categories')).toBeNull();

    expect(fixture.nativeElement.textContent).toContain('Resumen por meses');
  });

  it('cambia el mes de categorías sin recargar la evolución', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    component.selectView('categories');
    fixture.detectChanges();

    const previousRequest: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${component.currentMonth}`,
    );

    const previousMonth: string = shiftMonth(component.currentMonth, -1);

    component.selectCategoryMonth(previousMonth);
    fixture.detectChanges();

    expect(component.categoryMonth()).toBe(previousMonth);
    expect(previousRequest.cancelled).toBe(true);

    const request: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${previousMonth}`,
    );

    request.flush({
      success: true,
      report: {
        space_id: 2,
        month: previousMonth,
        categories: [],
      },
      error: null,
      message: null,
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay gastos asignados a categorías este mes.',
    );

    expect(
      httpTesting.match(
        (request): boolean => request.url === `${environment.apiUrl}/reports/evolution`,
      ),
    ).toHaveLength(0);
  });

  it('rechaza seleccionar un mes fuera del periodo visible', (): void => {
    const original: string = component.categoryMonth();

    component.selectCategoryMonth(shiftMonth(component.currentMonth, 1));

    expect(component.categoryMonth()).toBe(original);
  });

  it('sincroniza el mes de categorías al cambiar de periodo', async (): Promise<void> => {
    await loadSpaces();
    completeEvolution(2);

    component.selectView('categories');
    fixture.detectChanges();

    const oldCategories: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${component.currentMonth}`,
    );

    component.previousPeriod();
    fixture.detectChanges();

    const previousEnd: string = shiftMonth(component.currentMonth, -12);

    expect(component.periodEnd()).toBe(previousEnd);
    expect(component.categoryMonth()).toBe(previousEnd);
    expect(oldCategories.cancelled).toBe(true);

    completeEvolution(2, previousEnd);

    httpTesting
      .expectOne(`${environment.apiUrl}/reports/monthly/categories?spaceId=2&month=${previousEnd}`)
      .flush({
        success: true,
        report: {
          space_id: 2,
          month: previousEnd,
          categories: [],
        },
        error: null,
        message: null,
      });

    fixture.detectChanges();
  });
});
