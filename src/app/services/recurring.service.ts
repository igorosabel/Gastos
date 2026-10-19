import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type RecurringResponse from '@interfaces/recurring/recurring-response.interface';
import type { Observable } from 'rxjs';

@Service()
export default class RecurringService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Consulta todas las plantillas recurrentes de un espacio.
   * Incluye las activas y las inactivas.
   */
  getRecurring(spaceId: number): Observable<RecurringResponse> {
    return this.http.get<RecurringResponse>(`${this.apiUrl}/recurring`, {
      params: {
        spaceId: String(spaceId),
      },
    });
  }
}
