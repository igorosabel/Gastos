import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import type { Observable } from 'rxjs';

@Service()
export default class TransactionsService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Obtiene una página de movimientos del espacio indicado.
   */
  getTransactions(spaceId: number, page: number = 1): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${this.apiUrl}/transactions`, {
      params: {
        spaceId: String(spaceId),
        page: String(page),
      },
    });
  }
}
