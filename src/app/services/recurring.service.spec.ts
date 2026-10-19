import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type RecurringResponse from '@interfaces/recurring/recurring-response.interface';
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
});
