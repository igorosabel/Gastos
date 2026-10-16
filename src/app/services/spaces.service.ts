import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import CreateSpaceRequest from '@interfaces/create-space-request.interface';
import CreateSpaceResponse from '@interfaces/create-space-response.interface';
import type SpacesResponse from '@interfaces/spaces-response.interface';
import type { Observable } from 'rxjs';

@Service()
export default class SpacesService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Obtiene los espacios accesibles para el usuario autenticado.
   */
  getSpaces(): Observable<SpacesResponse> {
    return this.http.get<SpacesResponse>(`${this.apiUrl}/spaces`);
  }

  /**
   * Crea un espacio compartido del usuario autenticado.
   */
  createSpace(data: CreateSpaceRequest): Observable<CreateSpaceResponse> {
    return this.http.post<CreateSpaceResponse>(`${this.apiUrl}/spaces`, data);
  }
}
