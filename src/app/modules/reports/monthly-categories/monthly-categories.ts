import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type MonthlyCategoriesResponse from '@interfaces/reports/monthly-categories-response.interface';
import { formatMoney, percentageOf } from '@model/reports/money';
import { monthLabel } from '@model/reports/month-period';
import type MonthlyCategory from '@model/reports/monthly-category.model';
import type MonthlySummary from '@model/reports/monthly-summary.model';
import ReportsService from '@services/reports.service';
import TransactionRefreshService from '@services/transaction-refresh.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-monthly-categories',
  imports: [ButtonDirective],
  templateUrl: './monthly-categories.html',
  styleUrl: './monthly-categories.scss',
})
export default class MonthlyCategories {
  readonly spaceId: InputSignal<number> = input.required<number>();
  readonly month: InputSignal<string> = input.required<string>();
  readonly summary: InputSignal<MonthlySummary | null> = input<MonthlySummary | null>(null);

  private readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly reportsService: ReportsService = inject(ReportsService);
  private readonly transactionRefresh: TransactionRefreshService =
    inject(TransactionRefreshService);

  readonly categoryType: WritableSignal<'expense' | 'income'> = signal<'expense' | 'income'>(
    'expense',
  );

  readonly categories: WritableSignal<MonthlyCategory[]> = signal<MonthlyCategory[]>([]);

  readonly visibleCategories: Signal<MonthlyCategory[]> = computed((): MonthlyCategory[] =>
    this.categories().filter(
      (category: MonthlyCategory): boolean => category.type === this.categoryType(),
    ),
  );

  readonly total: Signal<string> = computed((): string => {
    const summary: MonthlySummary | null = this.summary();

    if (summary === null) {
      return '0.00';
    }

    return this.categoryType() === 'expense' ? summary.expense : summary.income;
  });

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly formatMoney: (amount: string) => string = formatMoney;
  readonly percentageOf: (amount: string, total: string) => number = percentageOf;
  readonly monthLabel: (month: string) => string = monthLabel;

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number = this.spaceId();
      const month: string = this.month();
      const token: string | null = this.authStore.token();
      const userId: number | undefined = this.authStore.user()?.id;

      this.refreshVersion();
      this.transactionRefresh.version();

      this.categories.set([]);
      this.loading.set(false);
      this.error.set(null);

      if (token === null || userId === undefined || this.spaceStore.selectedId() !== spaceId) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = this.reportsService
        .getMonthlyCategories(spaceId, month)
        .subscribe({
          next: (response: MonthlyCategoriesResponse): void => {
            if (!this.isCurrentContext(spaceId, month, token, userId)) {
              return;
            }

            if (
              !response.success ||
              response.report.space_id !== spaceId ||
              response.report.month !== month
            ) {
              this.error.set('No se ha podido obtener el desglose por categorías.');
            } else {
              this.categories.set(response.report.categories);
            }

            this.loading.set(false);
          },
          error: (error: unknown): void => {
            if (!this.isCurrentContext(spaceId, month, token, userId)) {
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

  setCategoryType(type: 'expense' | 'income'): void {
    this.categoryType.set(type);
  }

  reload(): void {
    if (
      this.spaceStore.selectedId() !== this.spaceId() ||
      this.authStore.token() === null ||
      this.loading()
    ) {
      return;
    }

    this.refreshVersion.update((version: number): number => version + 1);
  }

  private isCurrentContext(spaceId: number, month: string, token: string, userId: number): boolean {
    return (
      this.spaceId() === spaceId &&
      this.month() === month &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }

  private getLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'El mes solicitado no es válido.';
        case 401:
          return 'Tu sesión ha caducado.';
        case 403:
          return 'No tienes permiso para consultar estas categorías.';
        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido obtener el desglose por categorías.';
  }
}
