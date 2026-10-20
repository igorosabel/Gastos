import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type CreateRecurringResponse from '@interfaces/recurring/create-recurring-response.interface';
import type GenerateRecurringSpaceResponse from '@interfaces/recurring/generate-recurring-space-response.interface';
import type RecurringOccurrencesResponse from '@interfaces/recurring/recurring-occurrences-response.interface';
import type RecurringResponse from '@interfaces/recurring/recurring-response.interface';
import type SetRecurringStatusResponse from '@interfaces/recurring/set-recurring-status-response.interface';
import type UpdateRecurringResponse from '@interfaces/recurring/update-recurring-response.interface';
import RecurringService from '@services/recurring.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('RecurringService', (): void => {
  let service: RecurringService;
  let httpTesting: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(RecurringService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    httpTesting.verify();
  });

  it('consulta todas las plantillas del espacio', (): void => {
    const response: RecurringResponse = {
      success: true,
      recurring: [
        {
          id: 50,
          space_id: 12,
          category_id: 7,
          type: 'expense',
          amount: '95.40',
          concept: 'Electricidad',
          day_of_month: 20,
          start_date: '2026-10-01',
          end_date: null,
          active: true,
        },
      ],
      error: null,
      message: null,
    };

    let result: RecurringResponse | null = null;

    service.getRecurring(12).subscribe({
      next: (value: RecurringResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring?spaceId=12`);

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('no añade paginación ni filtros inexistentes', (): void => {
    service.getRecurring(8).subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring?spaceId=8`);

    expect(request.request.params.keys()).toEqual(['spaceId']);

    request.flush({
      success: true,
      recurring: [],
      error: null,
      message: null,
    } satisfies RecurringResponse);
  });

  it('crea una plantilla mensual activa mediante POST', (): void => {
    const response: CreateRecurringResponse = {
      success: true,
      recurring: {
        id: 50,
        space_id: 12,
        category_id: 7,
        type: 'expense',
        amount: '33.00',
        concept: 'Electricidad',
        day_of_month: 20,
        start_date: '2026-10-01',
        end_date: null,
        active: true,
      },
      error: null,
      message: null,
    };

    let result: CreateRecurringResponse | null = null;

    service
      .createRecurring({
        spaceId: 12,
        categoryId: 7,
        type: 'expense',
        amount: '33.00',
        concept: 'Electricidad',
        dayOfMonth: 20,
        startDate: '2026-10-01',
        endDate: null,
      })
      .subscribe({
        next: (value: CreateRecurringResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 12,
      categoryId: 7,
      type: 'expense',
      amount: '33.00',
      concept: 'Electricidad',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: null,
    });

    expect(request.request.body).not.toHaveProperty('active');

    request.flush(response, {
      status: 201,
      statusText: 'Created',
    });

    expect(result).toEqual(response);
  });

  it.each([[false], [true]])(
    'actualiza el estado active=%s mediante POST',
    (active: boolean): void => {
      const response: SetRecurringStatusResponse = {
        success: true,
        recurring: {
          id: 50,
          space_id: 12,
          category_id: 7,
          type: 'expense',
          amount: '95.40',
          concept: 'Electricidad',
          day_of_month: 20,
          start_date: '2026-10-01',
          end_date: null,
          active,
        },
        error: null,
        message: null,
      };

      let result: SetRecurringStatusResponse | null = null;

      service
        .setRecurringStatus({
          spaceId: 12,
          recurringId: 50,
          active,
        })
        .subscribe({
          next: (value: SetRecurringStatusResponse): void => {
            result = value;
          },
        });

      const request = httpTesting.expectOne(`${environment.apiUrl}/recurring/status`);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        spaceId: 12,
        recurringId: 50,
        active,
      });

      request.flush(response);

      expect(result).toEqual(response);
    },
  );

  it('actualiza una plantilla sin enviar el campo active', (): void => {
    const response: UpdateRecurringResponse = {
      success: true,
      recurring: {
        id: 50,
        space_id: 12,
        category_id: 7,
        type: 'expense',
        amount: '105.00',
        concept: 'Electricidad nueva',
        day_of_month: 20,
        start_date: '2026-10-01',
        end_date: null,
        active: false,
      },
      error: null,
      message: null,
    };

    let result: UpdateRecurringResponse | null = null;

    service
      .updateRecurring({
        spaceId: 12,
        recurringId: 50,
        categoryId: 7,
        type: 'expense',
        amount: '105.00',
        concept: 'Electricidad nueva',
        dayOfMonth: 20,
        startDate: '2026-10-01',
        endDate: null,
      })
      .subscribe({
        next: (value: UpdateRecurringResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring/update`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body.recurringId).toBe(50);
    expect(request.request.body.amount).toBe('105.00');
    expect(request.request.body).not.toHaveProperty('active');

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('consulta ocurrencias de un mes con paginación', (): void => {
    const response: RecurringOccurrencesResponse = {
      success: true,
      occurrences: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      error: null,
      message: null,
    };

    service
      .getOccurrences({
        spaceId: 12,
        periodFrom: '2026-10-01',
        periodTo: '2026-10-01',
        page: 1,
        pageSize: 20,
      })
      .subscribe();

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/recurring/occurrences?spaceId=12&periodFrom=2026-10-01&periodTo=2026-10-01&page=1&pageSize=20`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('status')).toBe(false);

    request.flush(response);
  });

  it('envía el filtro de estado cuando se solicita', (): void => {
    service
      .getOccurrences({
        spaceId: 8,
        periodFrom: '2026-09-01',
        periodTo: '2026-09-01',
        page: 2,
        pageSize: 20,
        status: 'pending',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/recurring/occurrences?spaceId=8&periodFrom=2026-09-01&periodTo=2026-09-01&page=2&pageSize=20&status=pending`,
    );

    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      occurrences: [],
      total: 25,
      page: 2,
      page_size: 20,
      total_pages: 2,
      error: null,
      message: null,
    } satisfies RecurringOccurrencesResponse);
  });

  it('genera mensualidades de un espacio mediante POST', (): void => {
    const response: GenerateRecurringSpaceResponse = {
      success: true,
      created: 2,
      existing: 1,
      skipped: 1,
      total: 4,
      error: null,
      message: null,
    };

    let result: GenerateRecurringSpaceResponse | null = null;

    service
      .generateSpace({
        spaceId: 12,
        period: '2026-10-01',
      })
      .subscribe({
        next: (value: GenerateRecurringSpaceResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring/generate-space`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 12,
      period: '2026-10-01',
    });

    request.flush(response);

    expect(result).toEqual(response);
  });
});
