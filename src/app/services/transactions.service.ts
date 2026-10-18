import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type CreateTransactionRequest from '@interfaces/transactions/create-transaction-request.interface';
import type CreateTransactionResponse from '@interfaces/transactions/create-transaction-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import type UpdateTransactionRequest from '@interfaces/transactions/update-transaction-request.interface';
import type UpdateTransactionResponse from '@interfaces/transactions/update-transaction-response.interface';
import type TransactionFilters from '@model/transactions/transaction-filters.model';
import type { Observable } from 'rxjs';

@Service()
export default class TransactionsService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Consulta movimientos de un espacio con paginación y filtros.
   */
  getTransactions(
    spaceId: number,
    page: number = 1,
    filters: TransactionFilters | null = null,
  ): Observable<TransactionsResponse> {
    let params: HttpParams = new HttpParams()
      .set('spaceId', String(spaceId))
      .set('page', String(page));

    if (filters !== null) {
      if (filters.dateFrom !== '') {
        params = params.set('dateFrom', filters.dateFrom);
      }

      if (filters.dateTo !== '') {
        params = params.set('dateTo', filters.dateTo);
      }

      if (filters.type !== null) {
        params = params.set('type', filters.type);
      }

      if (filters.categoryId !== null) {
        params = params.set('categoryId', String(filters.categoryId));
      }
    }

    return this.http.get<TransactionsResponse>(`${this.apiUrl}/transactions`, { params });
  }

  /**
   * Registra un ingreso o gasto real en ApiGastos.
   */
  createTransaction(data: CreateTransactionRequest): Observable<CreateTransactionResponse> {
    return this.http.post<CreateTransactionResponse>(`${this.apiUrl}/transactions`, data);
  }

  /**
   * Actualiza un movimiento independiente existente.
   */
  updateTransaction(data: UpdateTransactionRequest): Observable<UpdateTransactionResponse> {
    return this.http.post<UpdateTransactionResponse>(`${this.apiUrl}/transactions/update`, data);
  }
}
