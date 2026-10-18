import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import CategoriesService from '@services/categories.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('CategoriesService', (): void => {
  let service: CategoriesService;
  let httpTesting: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoriesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    httpTesting.verify();
  });

  it('consulta las categorías del espacio indicado', (): void => {
    const response: CategoriesResponse = {
      success: true,
      categories: [
        {
          id: 7,
          space_id: 12,
          parent_id: null,
          name: 'Hogar',
          default_type: 'expense',
          sort_order: 0,
        },
      ],
      error: null,
      message: null,
    };

    let result: CategoriesResponse | null = null;

    service.getCategories(12).subscribe({
      next: (value: CategoriesResponse): void => {
        result = value;
      },
    });

    const request = httpTesting.expectOne(
      (req): boolean =>
        req.url === `${environment.apiUrl}/categories` && req.params.get('spaceId') === '12',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(response);

    expect(result).toEqual(response);
  });
});
