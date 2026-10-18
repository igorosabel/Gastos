import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
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
import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import type CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';
import CategoriesService from '@services/categories.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-categories',
  imports: [ButtonDirective],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Categories {
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);

  readonly categories: WritableSignal<Category[]> = signal<Category[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly rows: Signal<CategoryRow[]> = computed((): CategoryRow[] =>
    categoriesToRows(this.categories()),
  );

  constructor() {
    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();

      this.refreshVersion();

      this.categories.set([]);
      this.error.set(null);
      this.loading.set(false);

      if (spaceId === null || token === null) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = this.categoriesService.getCategories(spaceId).subscribe({
        next: (response: CategoriesResponse): void => {
          if (!this.isCurrentContext(spaceId, token)) {
            return;
          }

          if (!response.success) {
            this.error.set('No se han podido consultar las categorías.');
          } else {
            this.categories.set(response.categories);
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
   * Vuelve a consultar las categorías del espacio activo.
   */
  reload(): void {
    if (this.spaceStore.selectedId() === null) {
      return;
    }

    this.refreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Comprueba que la respuesta corresponde al contexto actual.
   */
  private isCurrentContext(spaceId: number, token: string): boolean {
    return this.spaceStore.selectedId() === spaceId && this.authStore.token() === token;
  }

  /**
   * Traduce los errores de consulta.
   */
  private getLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para consultar estas categorías.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se han podido consultar las categorías.';
  }
}
