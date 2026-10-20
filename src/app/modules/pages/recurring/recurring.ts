import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type RecurringResponse from '@interfaces/recurring/recurring-response.interface';
import type Category from '@model/categories/category.model';
import type RecurringModel from '@model/recurring/recurring.model';
import { formatMoney } from '@model/reports/money';
import CreateRecurring from '@modules/recurring/create-recurring/create-recurring';
import { Refresh } from '@primeicons/angular';
import CategoriesService from '@services/categories.service';
import RecurringService from '@services/recurring.service';
import { ButtonDirective } from 'primeng/button';
import { forkJoin, type Subscription } from 'rxjs';

@Component({
  selector: 'app-recurring',
  imports: [RouterLink, ButtonDirective, Refresh, CreateRecurring],
  templateUrl: './recurring.html',
  styleUrl: './recurring.scss',
})
export default class Recurring {
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly recurringService: RecurringService = inject(RecurringService);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly recurring: WritableSignal<RecurringModel[]> = signal<RecurringModel[]>([]);
  readonly categories: WritableSignal<Category[]> = signal<Category[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);
  readonly creatingRecurring: WritableSignal<boolean> = signal<boolean>(false);
  readonly creationMessage: WritableSignal<string | null> = signal<string | null>(null);
  private creationMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly activeCount: Signal<number> = computed(
    (): number => this.recurring().filter((item: RecurringModel): boolean => item.active).length,
  );

  readonly inactiveCount: Signal<number> = computed(
    (): number => this.recurring().length - this.activeCount(),
  );

  readonly formatMoney: (amount: string) => string = formatMoney;
  private previousSpaceId: number | null = null;
  private previousToken: string | null = null;
  private previousUserId: number | null = null;

  constructor() {
    this.destroyRef.onDestroy((): void => {
      this.cancelCreationMessageTimeout();
    });

    effect((): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | null = this.authStore.user()?.id ?? null;

      if (
        spaceId === this.previousSpaceId &&
        token === this.previousToken &&
        userId === this.previousUserId
      ) {
        return;
      }

      this.previousSpaceId = spaceId;
      this.previousToken = token;
      this.previousUserId = userId;

      this.creatingRecurring.set(false);
      this.clearCreationMessage();
    });

    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | undefined = this.authStore.user()?.id;

      this.refreshVersion();

      this.recurring.set([]);
      this.categories.set([]);
      this.loading.set(false);
      this.error.set(null);

      if (spaceId === null || token === null || userId === undefined) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = forkJoin({
        recurring: this.recurringService.getRecurring(spaceId),
        categories: this.categoriesService.getCategories(spaceId),
      }).subscribe({
        next: (response: {
          recurring: RecurringResponse;
          categories: CategoriesResponse;
        }): void => {
          if (!this.isCurrentContext(spaceId, token, userId)) {
            return;
          }

          if (
            !response.recurring.success ||
            !response.categories.success ||
            response.recurring.recurring.some(
              (item: RecurringModel): boolean => item.space_id !== spaceId,
            ) ||
            response.categories.categories.some(
              (category: Category): boolean => category.space_id !== spaceId,
            )
          ) {
            this.error.set('No se han podido obtener los movimientos recurrentes.');
            this.loading.set(false);
            return;
          }

          this.recurring.set(response.recurring.recurring);
          this.categories.set(response.categories.categories);
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
   * Devuelve el nombre de la categoría o una referencia
   * identificable si ya no existe en el listado.
   */
  categoryName(categoryId: number): string {
    const category: Category | undefined = this.categories().find(
      (item: Category): boolean =>
        item.id === categoryId && item.space_id === this.spaceStore.selectedId(),
    );

    return category?.name ?? `Categoría ${categoryId}`;
  }

  /**
   * Vuelve a consultar las plantillas y categorías.
   */
  reload(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.authStore.token() === null ||
      this.loading() ||
      this.creatingRecurring()
    ) {
      return;
    }

    this.refreshVersion.update((version: number): number => version + 1);
  }

  openCreateRecurring(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.loading() ||
      this.error() !== null ||
      this.creatingRecurring() ||
      this.categories().length === 0
    ) {
      return;
    }

    this.clearCreationMessage();
    this.creatingRecurring.set(true);
  }

  cancelCreateRecurring(): void {
    this.creatingRecurring.set(false);
  }

  onRecurringCreated(item: RecurringModel): void {
    if (!this.creatingRecurring() || item.space_id !== this.spaceStore.selectedId()) {
      return;
    }

    this.creatingRecurring.set(false);

    this.showCreationMessage(`Se ha creado el recurrente «${item.concept}».`);

    this.refreshVersion.update((version: number): number => version + 1);
  }

  private cancelCreationMessageTimeout(): void {
    if (this.creationMessageTimeout !== null) {
      clearTimeout(this.creationMessageTimeout);
      this.creationMessageTimeout = null;
    }
  }

  private clearCreationMessage(): void {
    this.cancelCreationMessageTimeout();
    this.creationMessage.set(null);
  }

  private showCreationMessage(message: string): void {
    this.clearCreationMessage();

    this.creationMessage.set(message);

    this.creationMessageTimeout = setTimeout((): void => {
      this.creationMessageTimeout = null;
      this.creationMessage.set(null);
    }, 4000);
  }

  /**
   * Comprueba que el resultado pertenece al mismo
   * espacio y a la misma sesión.
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
          return 'El espacio solicitado no es válido.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para consultar los recurrentes de este espacio.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se han podido obtener los movimientos recurrentes.';
  }
}
