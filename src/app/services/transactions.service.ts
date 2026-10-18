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
   * Obtiene la primera página de movimientos de un espacio.
   * ApiGastos utiliza por defecto 20 resultados por página.
   */
  getTransactions(spaceId: number): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${this.apiUrl}/transactions`, {
      params: {
        spaceId: String(spaceId),
        page: '1',
      },
    });
  }
}
