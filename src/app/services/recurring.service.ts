import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type CreateRecurringRequest from '@interfaces/recurring/create-recurring-request.interface';
import type CreateRecurringResponse from '@interfaces/recurring/create-recurring-response.interface';
import type GenerateRecurringSpaceRequest from '@interfaces/recurring/generate-recurring-space-request.interface';
import type GenerateRecurringSpaceResponse from '@interfaces/recurring/generate-recurring-space-response.interface';
import type RecurringOccurrencesRequest from '@interfaces/recurring/recurring-occurrences-request.interface';
import type RecurringOccurrencesResponse from '@interfaces/recurring/recurring-occurrences-response.interface';
import type RecurringResponse from '@interfaces/recurring/recurring-response.interface';
import type ResolveRecurringOccurrenceRequest from '@interfaces/recurring/resolve-recurring-occurrence-request.interface';
import type ResolveRecurringOccurrenceResponse from '@interfaces/recurring/resolve-recurring-occurrence-response.interface';
import type SetRecurringStatusRequest from '@interfaces/recurring/set-recurring-status-request.interface';
import type SetRecurringStatusResponse from '@interfaces/recurring/set-recurring-status-response.interface';
import type UpdateRecurringRequest from '@interfaces/recurring/update-recurring-request.interface';
import type UpdateRecurringResponse from '@interfaces/recurring/update-recurring-response.interface';
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

  /**
   * Crea una plantilla mensual recurrente activa.
   */
  createRecurring(data: CreateRecurringRequest): Observable<CreateRecurringResponse> {
    return this.http.post<CreateRecurringResponse>(`${this.apiUrl}/recurring`, data);
  }

  /**
   * Activa o desactiva una plantilla recurrente.
   *
   * No modifica las ocurrencias existentes.
   */
  setRecurringStatus(data: SetRecurringStatusRequest): Observable<SetRecurringStatusResponse> {
    return this.http.post<SetRecurringStatusResponse>(`${this.apiUrl}/recurring/status`, data);
  }

  /**
   * Actualiza una plantilla recurrente.
   * Las ocurrencias históricas permanecen intactas.
   */
  updateRecurring(data: UpdateRecurringRequest): Observable<UpdateRecurringResponse> {
    return this.http.post<UpdateRecurringResponse>(`${this.apiUrl}/recurring/update`, data);
  }

  /**
   * Consulta ocurrencias recurrentes de un espacio
   * con filtros de periodo y estado.
   */
  getOccurrences(data: RecurringOccurrencesRequest): Observable<RecurringOccurrencesResponse> {
    const params: Record<string, string> = {
      spaceId: String(data.spaceId),
      periodFrom: data.periodFrom,
      periodTo: data.periodTo,
      page: String(data.page),
      pageSize: String(data.pageSize),
    };

    if (data.status !== undefined) {
      params['status'] = data.status;
    }

    return this.http.get<RecurringOccurrencesResponse>(`${this.apiUrl}/recurring/occurrences`, {
      params,
    });
  }

  /**
   * Genera las ocurrencias de las plantillas activas
   * del espacio para el periodo solicitado.
   *
   * La operación es idempotente por plantilla y periodo,
   * pero no es atómica para todo el lote.
   */
  generateSpace(data: GenerateRecurringSpaceRequest): Observable<GenerateRecurringSpaceResponse> {
    return this.http.post<GenerateRecurringSpaceResponse>(
      `${this.apiUrl}/recurring/generate-space`,
      data,
    );
  }

  /**
   * Confirma u omite una ocurrencia pendiente.
   *
   * Confirmar crea un movimiento contable real.
   * Omitir no crea ningún movimiento.
   */
  resolveOccurrence(
    data: ResolveRecurringOccurrenceRequest,
  ): Observable<ResolveRecurringOccurrenceResponse> {
    return this.http.post<ResolveRecurringOccurrenceResponse>(
      `${this.apiUrl}/recurring/occurrences/resolve`,
      data,
    );
  }
}
