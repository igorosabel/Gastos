import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type EvolutionResponse from '@interfaces/reports/evolution-response.interface';
import type MonthlyCategoriesResponse from '@interfaces/reports/monthly-categories-response.interface';
import type MonthlyForecastResponse from '@interfaces/reports/monthly-forecast-response.interface';
import type { Observable } from 'rxjs';

@Service()
export default class ReportsService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Obtiene el resumen real y la previsión mensual.
   */
  getMonthlyForecast(spaceId: number, month: string): Observable<MonthlyForecastResponse> {
    return this.http.get<MonthlyForecastResponse>(`${this.apiUrl}/reports/monthly/forecast`, {
      params: {
        spaceId: String(spaceId),
        month,
      },
    });
  }

  /**
   * Obtiene el desglose mensual por categorías.
   */
  getMonthlyCategories(spaceId: number, month: string): Observable<MonthlyCategoriesResponse> {
    return this.http.get<MonthlyCategoriesResponse>(`${this.apiUrl}/reports/monthly/categories`, {
      params: {
        spaceId: String(spaceId),
        month,
      },
    });
  }

  /**
   * Obtiene la evolución económica real de un intervalo
   * de meses, incluidos ambos extremos.
   */
  getEvolution(spaceId: number, monthFrom: string, monthTo: string): Observable<EvolutionResponse> {
    return this.http.get<EvolutionResponse>(`${this.apiUrl}/reports/evolution`, {
      params: {
        spaceId: String(spaceId),
        monthFrom,
        monthTo,
      },
    });
  }
}
