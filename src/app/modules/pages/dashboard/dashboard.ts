import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type MonthlyCategoriesResponse from '@interfaces/reports/monthly-categories-response.interface';
import type MonthlyForecastResponse from '@interfaces/reports/monthly-forecast-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import { formatMoney, percentageOf } from '@model/reports/money';
import type MonthlyCategory from '@model/reports/monthly-category.model';
import type Transaction from '@model/transactions/transaction.model';
import { Refresh } from '@primeicons/angular';
import ReportsService from '@services/reports.service';
import TransactionsService from '@services/transactions.service';
import { ButtonDirective } from 'primeng/button';
import { forkJoin, type Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ButtonDirective, Refresh],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export default class Dashboard {
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly reportsService: ReportsService = inject(ReportsService);
  private readonly transactionsService: TransactionsService = inject(TransactionsService);

  private readonly today: Date = new Date();

  readonly month: string = `${this.today.getFullYear()}-${String(
    this.today.getMonth() + 1,
  ).padStart(2, '0')}`;

  readonly monthLabel: string = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(this.today);

  readonly forecast: WritableSignal<MonthlyForecastResponse['report'] | null> = signal<
    MonthlyForecastResponse['report'] | null
  >(null);

  readonly categories: WritableSignal<MonthlyCategory[]> = signal<MonthlyCategory[]>([]);

  readonly latestTransactions: WritableSignal<Transaction[]> = signal<Transaction[]>([]);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly expenseCategories: Signal<MonthlyCategory[]> = computed((): MonthlyCategory[] =>
    this.categories().filter((category: MonthlyCategory): boolean => category.type === 'expense'),
  );

  readonly formatMoney: (amount: string) => string = formatMoney;
  readonly percentageOf: (amount: string, total: string) => number = percentageOf;

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | undefined = this.authStore.user()?.id;

      this.refreshVersion();

      this.forecast.set(null);
      this.categories.set([]);
      this.latestTransactions.set([]);
      this.error.set(null);
      this.loading.set(false);

      if (spaceId === null || token === null || userId === undefined) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = forkJoin({
        forecast: this.reportsService.getMonthlyForecast(spaceId, this.month),
        categories: this.reportsService.getMonthlyCategories(spaceId, this.month),
        transactions: this.transactionsService.getTransactions(spaceId),
      }).subscribe({
        next: (response: {
          forecast: MonthlyForecastResponse;
          categories: MonthlyCategoriesResponse;
          transactions: TransactionsResponse;
        }): void => {
          if (!this.isCurrentContext(spaceId, token, userId)) {
            return;
          }

          if (
            !response.forecast.success ||
            !response.categories.success ||
            !response.transactions.success ||
            response.forecast.report.space_id !== spaceId ||
            response.forecast.report.month !== this.month ||
            response.forecast.report.actual.space_id !== spaceId ||
            response.forecast.report.actual.month !== this.month ||
            response.categories.report.space_id !== spaceId ||
            response.categories.report.month !== this.month ||
            response.transactions.transactions.some(
              (item: Transaction): boolean => item.space_id !== spaceId,
            )
          ) {
            this.error.set('No se ha podido obtener el resumen económico.');
            this.loading.set(false);
            return;
          }

          this.forecast.set(response.forecast.report);
          this.categories.set(response.categories.report.categories);
          this.latestTransactions.set(response.transactions.transactions.slice(0, 5));

          this.loading.set(false);
        },
        error: (error: unknown): void => {
          if (!this.isCurrentContext(spaceId, token, userId)) {
            return;
          }

          this.error.set(this.getLoadError(error));
          this.loading.set(false);
        },
      });

      onCleanup((): void => {
        subscription.unsubscribe();
      });
    });
  }

  /**
   * Vuelve a consultar el resumen del espacio activo.
   */
  reload(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.authStore.token() === null ||
      this.loading()
    ) {
      return;
    }

    this.refreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Evita mostrar respuestas de otro espacio o sesión.
   */
  private isCurrentContext(spaceId: number, token: string, userId: number): boolean {
    return (
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }

  private getLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'No se ha podido consultar el mes seleccionado.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para consultar este espacio.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido obtener el resumen económico.';
  }
}
