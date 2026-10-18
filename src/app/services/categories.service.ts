import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type CreateCategoryRequest from '@interfaces/categories/create-category-request.interface';
import type CreateCategoryResponse from '@interfaces/categories/create-category-response.interface';
import type { Observable } from 'rxjs';

@Service()
export default class CategoriesService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Obtiene las categorías accesibles de un espacio contable.
   */
  getCategories(spaceId: number): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${this.apiUrl}/categories`, {
      params: {
        spaceId: String(spaceId),
      },
    });
  }

  /**
   * Crea una categoría en el espacio contable indicado.
   */
  createCategory(data: CreateCategoryRequest): Observable<CreateCategoryResponse> {
    return this.http.post<CreateCategoryResponse>(`${this.apiUrl}/categories`, data);
  }
}
