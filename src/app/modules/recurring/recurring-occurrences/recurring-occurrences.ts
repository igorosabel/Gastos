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
import type GenerateRecurringSpaceResponse from '@interfaces/recurring/generate-recurring-space-response.interface';
import type RecurringOccurrencesResponse from '@interfaces/recurring/recurring-occurrences-response.interface';
import type Category from '@model/categories/category.model';
import type RecurringOccurrence from '@model/recurring/recurring-occurrence.model';
import { formatMoney } from '@model/reports/money';
import { getCurrentMonth, monthLabel, shiftMonth } from '@model/reports/month-period';
import RecurringService from '@services/recurring.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-recurring-occurrences',
  imports: [ButtonDirective],
  templateUrl: './recurring-occurrences.html',
  styleUrl: './recurring-occurrences.scss',
})
export default class RecurringOccurrences {
  private readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly recurringService: RecurringService = inject(RecurringService);

  readonly spaceId: InputSignal<number> = input.required<number>();
  readonly categories: InputSignal<Category[]> = input.required<Category[]>();

  readonly month: WritableSignal<string> = signal<string>(getCurrentMonth());
  readonly period: Signal<string> = computed((): string => `${this.month()}-01`);

  readonly statusFilter: WritableSignal<'all' | 'pending' | 'confirmed' | 'skipped'> = signal<
    'all' | 'pending' | 'confirmed' | 'skipped'
  >('all');

  readonly page: WritableSignal<number> = signal<number>(1);
  readonly pageSize: number = 20;

  readonly occurrences: WritableSignal<RecurringOccurrence[]> = signal<RecurringOccurrence[]>([]);

  readonly total: WritableSignal<number> = signal<number>(0);
  readonly totalPages: WritableSignal<number> = signal<number>(0);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly monthLabel: (month: string) => string = monthLabel;
  readonly formatMoney: (amount: string) => string = formatMoney;

  readonly confirmingGeneration: WritableSignal<boolean> = signal<boolean>(false);
  readonly generating: WritableSignal<boolean> = signal<boolean>(false);
  readonly generationResult: WritableSignal<GenerateRecurringSpaceResponse | null> =
    signal<GenerateRecurringSpaceResponse | null>(null);
  readonly generationError: WritableSignal<string | null> = signal<string | null>(null);

  private generationSubscription: Subscription | null = null;

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number = this.spaceId();
      const selectedId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | undefined = this.authStore.user()?.id;
      const period: string = this.period();

      if (
        selectedId !== spaceId ||
        token === null ||
        userId === undefined ||
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(period)
      ) {
        this.confirmingGeneration.set(false);
      }

      onCleanup((): void => {
        this.generationSubscription?.unsubscribe();
        this.generationSubscription = null;

        this.generating.set(false);
        this.confirmingGeneration.set(false);
        this.generationResult.set(null);
        this.generationError.set(null);
      });
    });

    effect((onCleanup): void => {
      const spaceId: number = this.spaceId();
      const token: string | null = this.authStore.token();
      const userId: number | undefined = this.authStore.user()?.id;
      const period: string = this.period();
      const status: 'all' | 'pending' | 'confirmed' | 'skipped' = this.statusFilter();
      const page: number = this.page();

      this.refreshVersion();

      this.occurrences.set([]);
      this.total.set(0);
      this.totalPages.set(0);
      this.loading.set(false);
      this.error.set(null);

      if (token === null || userId === undefined || this.spaceStore.selectedId() !== spaceId) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = this.recurringService
        .getOccurrences({
          spaceId,
          periodFrom: period,
          periodTo: period,
          page,
          pageSize: this.pageSize,
          ...(status === 'all' ? {} : { status }),
        })
        .subscribe({
          next: (response: RecurringOccurrencesResponse): void => {
            if (!this.isCurrentContext(spaceId, token, userId, period, status, page)) {
              return;
            }

            if (
              !response.success ||
              !Array.isArray(response.occurrences) ||
              response.page !== page ||
              response.page_size !== this.pageSize ||
              response.total < 0 ||
              response.total_pages < 0 ||
              response.occurrences.some(
                (item: RecurringOccurrence): boolean =>
                  item.space_id !== spaceId ||
                  item.period !== period ||
                  (status !== 'all' && item.status !== status),
              )
            ) {
              this.error.set('No se han podido obtener las ocurrencias.');
              this.loading.set(false);
              return;
            }

            this.occurrences.set(response.occurrences);
            this.total.set(response.total);
            this.totalPages.set(response.total_pages);
            this.loading.set(false);
          },
          error: (error: unknown): void => {
            if (!this.isCurrentContext(spaceId, token, userId, period, status, page)) {
              return;
            }

            this.error.set(this.getLoadError(error));
            this.loading.set(false);
          },
        });

      onCleanup((): void => subscription.unsubscribe());
    });
  }

  categoryName(categoryId: number): string {
    const category: Category | undefined = this.categories().find(
      (item: Category): boolean => item.id === categoryId && item.space_id === this.spaceId(),
    );

    return category?.name ?? `Categoría ${categoryId}`;
  }

  previousMonth(): void {
    if (this.generating() || this.confirmingGeneration()) {
      return;
    }

    this.page.set(1);
    this.month.update((month: string): string => shiftMonth(month, -1));
  }

  nextMonth(): void {
    if (this.generating() || this.confirmingGeneration()) {
      return;
    }

    this.page.set(1);
    this.month.update((month: string): string => shiftMonth(month, 1));
  }

  setStatus(status: 'all' | 'pending' | 'confirmed' | 'skipped'): void {
    if (this.statusFilter() === status || this.generating() || this.confirmingGeneration()) {
      return;
    }

    this.page.set(1);
    this.statusFilter.set(status);
  }

  previousPage(): void {
    if (this.loading() || this.page() <= 1 || this.generating() || this.confirmingGeneration()) {
      return;
    }

    this.page.update((page: number): number => page - 1);
  }

  nextPage(): void {
    if (
      this.loading() ||
      this.page() >= this.totalPages() ||
      this.generating() ||
      this.confirmingGeneration()
    ) {
      return;
    }

    this.page.update((page: number): number => page + 1);
  }

  reload(): void {
    if (
      this.loading() ||
      this.spaceStore.selectedId() !== this.spaceId() ||
      this.authStore.token() === null ||
      this.generating() ||
      this.confirmingGeneration()
    ) {
      return;
    }

    this.refreshVersion.update((version: number): number => version + 1);
  }

  requestGeneration(): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.generating() ||
      this.confirmingGeneration() ||
      !this.hasCurrentContext()
    ) {
      return;
    }

    this.generationError.set(null);
    this.generationResult.set(null);
    this.confirmingGeneration.set(true);
  }

  cancelGeneration(): void {
    if (this.generating()) {
      return;
    }

    this.confirmingGeneration.set(false);
  }

  confirmGeneration(): void {
    const token: string | null = this.authStore.token();
    const userId: number | undefined = this.authStore.user()?.id;

    if (
      !this.confirmingGeneration() ||
      this.generating() ||
      this.loading() ||
      this.error() !== null ||
      !this.hasCurrentContext() ||
      token === null ||
      userId === undefined
    ) {
      return;
    }

    const spaceId: number = this.spaceId();
    const period: string = this.period();

    this.confirmingGeneration.set(false);
    this.generating.set(true);
    this.generationError.set(null);
    this.generationResult.set(null);

    this.generationSubscription = this.recurringService
      .generateSpace({
        spaceId,
        period,
      })
      .subscribe({
        next: (response: GenerateRecurringSpaceResponse): void => {
          if (!this.isGenerationContext(spaceId, token, userId, period)) {
            return;
          }

          this.generating.set(false);
          this.generationSubscription = null;

          if (!this.isValidGenerationResponse(response)) {
            this.generationError.set(
              'No se ha podido verificar el resultado de la generación. ' +
                'Algunas ocurrencias pueden haberse guardado. ' +
                'Comprueba el listado antes de reintentar.',
            );
          } else {
            this.generationResult.set(response);
          }

          this.reloadAfterGeneration();
        },
        error: (error: unknown): void => {
          if (!this.isGenerationContext(spaceId, token, userId, period)) {
            return;
          }

          this.generating.set(false);
          this.generationSubscription = null;

          this.generationError.set(this.getGenerationError(error));

          this.reloadAfterGeneration();
        },
      });
  }

  private hasCurrentContext(): boolean {
    return (
      this.spaceStore.selectedId() === this.spaceId() &&
      this.authStore.token() !== null &&
      this.authStore.user()?.id !== undefined &&
      /^\d{4}-(0[1-9]|1[0-2])-01$/.test(this.period())
    );
  }

  private isGenerationContext(
    spaceId: number,
    token: string,
    userId: number,
    period: string,
  ): boolean {
    return (
      this.spaceId() === spaceId &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId &&
      this.period() === period &&
      this.generating()
    );
  }

  private isValidGenerationResponse(response: GenerateRecurringSpaceResponse): boolean {
    const values: number[] = [
      response.created,
      response.existing,
      response.skipped,
      response.total,
    ];

    return (
      response.success === true &&
      values.every((value: number): boolean => Number.isSafeInteger(value) && value >= 0) &&
      response.created + response.existing + response.skipped === response.total
    );
  }

  private reloadAfterGeneration(): void {
    this.page.set(1);
    this.statusFilter.set('all');

    this.refreshVersion.update((version: number): number => version + 1);
  }

  private getGenerationError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'El periodo de generación no es válido.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para generar mensualidades en este espacio.';
      }
    }

    return (
      'No se ha podido completar la generación. ' +
      'Algunas mensualidades pueden haberse generado antes del error. ' +
      'Revisa el listado y, si es necesario, reintenta manualmente el mismo mes.'
    );
  }

  private isCurrentContext(
    spaceId: number,
    token: string,
    userId: number,
    period: string,
    status: 'all' | 'pending' | 'confirmed' | 'skipped',
    page: number,
  ): boolean {
    return (
      this.spaceId() === spaceId &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId &&
      this.period() === period &&
      this.statusFilter() === status &&
      this.page() === page
    );
  }

  private getLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Los filtros de ocurrencias no son válidos.';
        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
        case 403:
          return 'No tienes permiso para consultar estas ocurrencias.';
        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se han podido obtener las ocurrencias.';
  }
}
