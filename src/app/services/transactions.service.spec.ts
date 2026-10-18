import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import TransactionsService from '@services/transactions.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('TransactionsService', (): void => {
  let service: TransactionsService;
  let httpTesting: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TransactionsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    httpTesting.verify();
  });

  it('consulta la primera página del espacio indicado', (): void => {
    const response: TransactionsResponse = {
      success: true,
      transactions: [
        {
          id: 31,
          space_id: 12,
          user_id: 1,
          category_id: 7,
          type: 'expense',
          amount: '95.40',
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

    let result: TransactionsResponse | null = null;

    service.getTransactions(12).subscribe({
      next: (value: TransactionsResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(
      (req): boolean =>
        req.url === `${environment.apiUrl}/transactions` &&
        req.params.get('spaceId') === '12' &&
        req.params.get('page') === '1',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('consulta la página solicitada', (): void => {
    const response: TransactionsResponse = {
      success: true,
      transactions: [],
      total: 45,
      page: 2,
      page_size: 20,
      total_pages: 3,
      error: null,
      message: null,
    };

    let result: TransactionsResponse | null = null;

    service.getTransactions(12, 2).subscribe({
      next: (value: TransactionsResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(
      (req): boolean =>
        req.url === `${environment.apiUrl}/transactions` &&
        req.params.get('spaceId') === '12' &&
        req.params.get('page') === '2',
    );

    expect(request.request.method).toBe('GET');

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('envía todos los filtros informados', (): void => {
    service
      .getTransactions(12, 2, {
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
        type: 'expense',
        categoryId: 7,
      })
      .subscribe();

    const request = httpTesting.expectOne(
      (req): boolean =>
        req.url === `${environment.apiUrl}/transactions` &&
        req.params.get('spaceId') === '12' &&
        req.params.get('page') === '2' &&
        req.params.get('dateFrom') === '2026-10-01' &&
        req.params.get('dateTo') === '2026-10-31' &&
        req.params.get('type') === 'expense' &&
        req.params.get('categoryId') === '7',
    );

    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      transactions: [],
      total: 0,
      page: 2,
      page_size: 20,
      total_pages: 0,
      error: null,
      message: null,
    } satisfies TransactionsResponse);
  });

  it('omite los filtros vacíos', (): void => {
    service
      .getTransactions(12, 1, {
        dateFrom: '',
        dateTo: '',
        type: null,
        categoryId: null,
      })
      .subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions?spaceId=12&page=1`);

    expect(request.request.params.has('dateFrom')).toBe(false);
    expect(request.request.params.has('dateTo')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.has('categoryId')).toBe(false);

    request.flush({
      success: true,
      transactions: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      error: null,
      message: null,
    } satisfies TransactionsResponse);
  });
});
