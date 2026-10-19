import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type EvolutionResponse from '@interfaces/reports/evolution-response.interface';
import type MonthlyCategoriesResponse from '@interfaces/reports/monthly-categories-response.interface';
import type MonthlyForecastResponse from '@interfaces/reports/monthly-forecast-response.interface';
import ReportsService from '@services/reports.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('ReportsService', (): void => {
  let service: ReportsService;
  let httpTesting: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ReportsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    httpTesting.verify();
  });

  it('consulta la previsión del mes y espacio', (): void => {
    const response: MonthlyForecastResponse = {
      success: true,
      report: {
        space_id: 12,
        month: '2026-10',
        actual: {
          space_id: 12,
          month: '2026-10',
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

    let result: MonthlyForecastResponse | null = null;

    service.getMonthlyForecast(12, '2026-10').subscribe({
      next: (value: MonthlyForecastResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/forecast?spaceId=12&month=2026-10`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('consulta el desglose mensual por categorías', (): void => {
    const response: MonthlyCategoriesResponse = {
      success: true,
      report: {
        space_id: 12,
        month: '2026-10',
        categories: [
          {
            category_id: 7,
            parent_id: null,
            name: 'Hogar',
            type: 'expense',
            amount: '425.60',
            transaction_count: 12,
          },
        ],
      },
      error: null,
      message: null,
    };

    let result: MonthlyCategoriesResponse | null = null;

    service.getMonthlyCategories(12, '2026-10').subscribe({
      next: (value: MonthlyCategoriesResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/reports/monthly/categories?spaceId=12&month=2026-10`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('consulta la evolución de doce meses del espacio', (): void => {
    const response: EvolutionResponse = {
      success: true,
      report: {
        space_id: 12,
        month_from: '2025-11',
        month_to: '2026-10',
        months: [
          {
            space_id: 12,
            month: '2026-10',
            income: '2500.00',
            expense: '1800.00',
            balance: '700.00',
            income_count: 1,
            expense_count: 10,
            transaction_count: 11,
          },
        ],
      },
      error: null,
      message: null,
    };

    let result: EvolutionResponse | null = null;

    service.getEvolution(12, '2025-11', '2026-10').subscribe({
      next: (value: EvolutionResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/reports/evolution?spaceId=12&monthFrom=2025-11&monthTo=2026-10`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(response);

    expect(result).toEqual(response);
  });
});
