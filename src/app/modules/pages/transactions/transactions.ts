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
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import type Category from '@model/categories/category.model';
import type Transaction from '@model/transactions/transaction.model';
import CategoriesService from '@services/categories.service';
import TransactionsService from '@services/transactions.service';
import { ButtonDirective } from 'primeng/button';
import { forkJoin, type Subscription } from 'rxjs';

@Component({
  selector: 'app-transactions',
  imports: [ButtonDirective],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export default class Transactions {
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly transactionsService: TransactionsService = inject(TransactionsService);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);

  readonly transactions: WritableSignal<Transaction[]> = signal<Transaction[]>([]);

  readonly categories: WritableSignal<Category[]> = signal<Category[]>([]);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly total: WritableSignal<number> = signal<number>(0);
  readonly pageSize: WritableSignal<number> = signal<number>(20);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly categoryNames: Signal<Map<number, string>> = computed((): Map<number, string> => {
    const names: Map<number, string> = new Map<number, string>();

    for (const category of this.categories()) {
      names.set(category.id, category.name);
    }

    return names;
  });

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();

      this.refreshVersion();

      this.transactions.set([]);
      this.categories.set([]);
      this.total.set(0);
      this.pageSize.set(20);
      this.error.set(null);
      this.loading.set(false);

      if (spaceId === null || token === null) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = forkJoin({
        transactions: this.transactionsService.getTransactions(spaceId),
        categories: this.categoriesService.getCategories(spaceId),
      }).subscribe({
        next: (response: {
          transactions: TransactionsResponse;
          categories: CategoriesResponse;
        }): void => {
          if (!this.isCurrentContext(spaceId, token)) {
            return;
          }

          if (!response.transactions.success || !response.categories.success) {
            this.error.set('No se han podido consultar los movimientos.');
          } else {
            this.transactions.set(response.transactions.transactions);
            this.categories.set(response.categories.categories);
            this.total.set(response.transactions.total);
            this.pageSize.set(response.transactions.page_size);
          }

          this.loading.set(false);
        },
        error: (error: unknown): void => {
          if (!this.isCurrentContext(spaceId, token)) {
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
   * Vuelve a consultar los movimientos del espacio activo.
   */
  reload(): void {
    if (this.spaceStore.selectedId() === null || this.loading()) {
      return;
    }

    this.refreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Obtiene el nombre de una categoría del espacio activo.
   */
  categoryName(categoryId: number): string {
    return this.categoryNames().get(categoryId) ?? `Categoría ${categoryId}`;
  }

  /**
   * Comprueba el espacio y la sesión de la respuesta.
   */
  private isCurrentContext(spaceId: number, token: string): boolean {
    return this.spaceStore.selectedId() === spaceId && this.authStore.token() === token;
  }

  /**
   * Traduce errores de consulta en mensajes legibles.
   */
  private getLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para consultar estos movimientos.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se han podido consultar los movimientos.';
  }
}
