import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type { ApiResponse } from '@interfaces/auth.interfaces';
import type CreateTransactionResponse from '@interfaces/transactions/create-transaction-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import type UpdateTransactionResponse from '@interfaces/transactions/update-transaction-response.interface';
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

  it('crea un movimiento mediante POST', (): void => {
    const response: CreateTransactionResponse = {
      success: true,
      transaction: {
        id: 31,
        space_id: 12,
        user_id: 1,
        category_id: 7,
        type: 'expense',
        amount: '95.40',
        concept: 'Electricidad',
        date: '2026-10-20',
      },
      error: null,
      message: null,
    };

    let result: CreateTransactionResponse | null = null;

    service
      .createTransaction({
        spaceId: 12,
        categoryId: 7,
        type: 'expense',
        amount: '95.40',
        concept: 'Electricidad',
        date: '2026-10-20',
      })
      .subscribe({
        next: (value: CreateTransactionResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 12,
      categoryId: 7,
      type: 'expense',
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-20',
    });

    request.flush(response, {
      status: 201,
      statusText: 'Created',
    });

    expect(result).toEqual(response);
  });

  it('actualiza un movimiento mediante POST', (): void => {
    const response: UpdateTransactionResponse = {
      success: true,
      transaction: {
        id: 31,
        space_id: 12,
        user_id: 1,
        category_id: 7,
        type: 'expense',
        amount: '98.00',
        concept: 'Electricidad ajustada',
        date: '2026-10-20',
      },
      error: null,
      message: null,
    };

    let result: UpdateTransactionResponse | null = null;

    service
      .updateTransaction({
        spaceId: 12,
        transactionId: 31,
        categoryId: 7,
        type: 'expense',
        amount: '98.00',
        concept: 'Electricidad ajustada',
        date: '2026-10-20',
      })
      .subscribe({
        next: (value: UpdateTransactionResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 12,
      transactionId: 31,
      categoryId: 7,
      type: 'expense',
      amount: '98.00',
      concept: 'Electricidad ajustada',
      date: '2026-10-20',
    });

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('elimina un movimiento mediante POST', (): void => {
    const response: ApiResponse = {
      success: true,
      error: null,
      message: null,
    };

    let result: ApiResponse | null = null;

    service
      .deleteTransaction({
        spaceId: 12,
        transactionId: 31,
      })
      .subscribe({
        next: (value: ApiResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/delete`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 12,
      transactionId: 31,
    });

    request.flush(response);

    expect(result).toEqual(response);
  });
});
