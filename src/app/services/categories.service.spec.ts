import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import CreateCategoryResponse from '@interfaces/categories/create-category-response.interface';
import UpdateCategoryResponse from '@interfaces/categories/update-category-response.interface';
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

  it('crea una categoría en el espacio indicado', (): void => {
    const response: CreateCategoryResponse = {
      success: true,
      category: {
        id: 20,
        space_id: 8,
        parent_id: null,
        name: 'Hogar',
        default_type: 'expense',
        sort_order: 0,
      },
      error: null,
      message: null,
    };

    let result: CreateCategoryResponse | null = null;

    service
      .createCategory({
        spaceId: 8,
        name: 'Hogar',
        defaultType: 'expense',
        parentId: null,
        sortOrder: 0,
      })
      .subscribe({
        next: (value: CreateCategoryResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 8,
      name: 'Hogar',
      defaultType: 'expense',
      parentId: null,
      sortOrder: 0,
    });

    request.flush(response, {
      status: 201,
      statusText: 'Created',
    });

    expect(result).toEqual(response);
  });

  it('actualiza una categoría mediante POST', (): void => {
    const response: UpdateCategoryResponse = {
      success: true,
      category: {
        id: 7,
        space_id: 12,
        parent_id: null,
        name: 'Casa',
        default_type: 'expense',
        sort_order: 5,
      },
      error: null,
      message: null,
    };

    let result: UpdateCategoryResponse | null = null;

    service
      .updateCategory({
        spaceId: 12,
        categoryId: 7,
        name: 'Casa',
        parentId: null,
        sortOrder: 5,
      })
      .subscribe({
        next: (value: UpdateCategoryResponse): void => {
          result = value;
        },
      });

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories/update`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 12,
      categoryId: 7,
      name: 'Casa',
      parentId: null,
      sortOrder: 5,
    });

    request.flush(response);

    expect(result).toEqual(response);
  });
});
