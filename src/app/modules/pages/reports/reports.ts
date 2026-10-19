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
import { FormsModule } from '@angular/forms';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type EvolutionResponse from '@interfaces/reports/evolution-response.interface';
import { formatMoney } from '@model/reports/money';
import { getCurrentMonth, monthLabel, shiftMonth } from '@model/reports/month-period';
import type MonthlySummary from '@model/reports/monthly-summary.model';
import MonthlyCategories from '@modules/reports/monthly-categories/monthly-categories';
import { Refresh } from '@primeicons/angular';
import ReportsService from '@services/reports.service';
import TransactionRefreshService from '@services/transaction-refresh.service';
import { ButtonDirective } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-reports',
  imports: [ButtonDirective, Refresh, FormsModule, SelectModule, MonthlyCategories],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export default class Reports {
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly reportsService: ReportsService = inject(ReportsService);
  private readonly transactionRefresh: TransactionRefreshService =
    inject(TransactionRefreshService);

  readonly currentMonth: string = getCurrentMonth();

  readonly periodEnd: WritableSignal<string> = signal<string>(this.currentMonth);
  readonly activeView: WritableSignal<'evolution' | 'categories'> = signal<
    'evolution' | 'categories'
  >('evolution');
  readonly categoryMonth: WritableSignal<string> = signal<string>(this.currentMonth);

  readonly categoryMonthOptions: Signal<
    {
      label: string;
      value: string;
    }[]
  > = computed(
    (): {
      label: string;
      value: string;
    }[] =>
      Array.from(
        { length: 12 },
        (
          _: unknown,
          index: number,
        ): {
          label: string;
          value: string;
        } => {
          const month: string = shiftMonth(this.periodEnd(), -index);

          return {
            label: monthLabel(month),
            value: month,
          };
        },
      ),
  );

  readonly selectedSummary: Signal<MonthlySummary | null> = computed(
    (): MonthlySummary | null =>
      this.months().find(
        (summary: MonthlySummary): boolean => summary.month === this.categoryMonth(),
      ) ?? null,
  );

  readonly periodStart: Signal<string> = computed((): string => shiftMonth(this.periodEnd(), -11));

  readonly periodLabel: Signal<string> = computed(
    (): string => `${monthLabel(this.periodStart())} — ${monthLabel(this.periodEnd())}`,
  );

  readonly months: WritableSignal<MonthlySummary[]> = signal<MonthlySummary[]>([]);

  readonly orderedMonths: Signal<MonthlySummary[]> = computed((): MonthlySummary[] =>
    [...this.months()].sort((a: MonthlySummary, b: MonthlySummary): number =>
      b.month.localeCompare(a.month),
    ),
  );

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly formatMoney: (amount: string) => string = formatMoney;
  readonly monthLabel: (month: string) => string = monthLabel;

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | undefined = this.authStore.user()?.id;

      const monthFrom: string = this.periodStart();
      const monthTo: string = this.periodEnd();

      this.refreshVersion();
      this.transactionRefresh.version();

      this.months.set([]);
      this.loading.set(false);
      this.error.set(null);

      if (spaceId === null || token === null || userId === undefined) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = this.reportsService
        .getEvolution(spaceId, monthFrom, monthTo)
        .subscribe({
          next: (response: EvolutionResponse): void => {
            if (!this.isCurrentContext(spaceId, token, userId, monthFrom, monthTo)) {
              return;
            }

            if (
              !response.success ||
              response.report.space_id !== spaceId ||
              response.report.month_from !== monthFrom ||
              response.report.month_to !== monthTo ||
              response.report.months.some(
                (month: MonthlySummary): boolean =>
                  month.space_id !== spaceId || month.month < monthFrom || month.month > monthTo,
              )
            ) {
              this.error.set('No se ha podido obtener la evolución económica.');
              this.loading.set(false);
              return;
            }

            this.months.set(response.report.months);
            this.loading.set(false);
          },
          error: (error: unknown): void => {
            if (!this.isCurrentContext(spaceId, token, userId, monthFrom, monthTo)) {
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
   * Consulta el periodo anterior de doce meses.
   */
  previousPeriod(): void {
    if (this.spaceStore.selectedId() === null || this.loading()) {
      return;
    }

    const previous: string = shiftMonth(this.periodEnd(), -12);

    this.periodEnd.set(previous);
    this.categoryMonth.set(previous);
  }

  /**
   * Avanza un periodo sin consultar meses futuros.
   */
  nextPeriod(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.loading() ||
      this.periodEnd() >= this.currentMonth
    ) {
      return;
    }

    const next: string = shiftMonth(this.periodEnd(), 12);

    const target: string = next > this.currentMonth ? this.currentMonth : next;

    this.periodEnd.set(target);
    this.categoryMonth.set(target);
  }

  /**
   * Actualiza los datos del periodo seleccionado.
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
   * Cambia entre evolución y desglose por categorías.
   */
  selectView(view: 'evolution' | 'categories'): void {
    this.activeView.set(view);
  }

  /**
   * Selecciona un mes perteneciente al periodo visible.
   */
  selectCategoryMonth(month: string): void {
    const valid: boolean = this.categoryMonthOptions().some(
      (option: { label: string; value: string }): boolean => option.value === month,
    );

    if (!valid) {
      return;
    }

    this.categoryMonth.set(month);
  }

  /**
   * Evita aplicar resultados de otro espacio,
   * sesión o intervalo de meses.
   */
  private isCurrentContext(
    spaceId: number,
    token: string,
    userId: number,
    monthFrom: string,
    monthTo: string,
  ): boolean {
    return (
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId &&
      this.periodStart() === monthFrom &&
      this.periodEnd() === monthTo
    );
  }

  private getLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'El periodo solicitado no es válido.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para consultar los informes de este espacio.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido obtener la evolución económica.';
  }
}
