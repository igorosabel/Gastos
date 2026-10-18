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
import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import type CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';
import CreateCategory from '@modules/categories/create-category/create-category';
import EditCategory from '@modules/categories/edit-category/edit-category';
import CategoriesService from '@services/categories.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-categories',
  imports: [ButtonDirective, CreateCategory, EditCategory],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export default class Categories {
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);

  readonly categories: WritableSignal<Category[]> = signal<Category[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly editingCategory: WritableSignal<Category | null> = signal<Category | null>(null);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);

  readonly rows: Signal<CategoryRow[]> = computed((): CategoryRow[] =>
    categoriesToRows(this.categories()),
  );

  readonly creatingCategory: WritableSignal<boolean> = signal<boolean>(false);

  readonly creationMessage: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Abre el formulario de creación.
   */
  openCreateCategory(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.loading() ||
      this.error() !== null ||
      this.editingCategory() !== null
    ) {
      return;
    }

    this.creationMessage.set(null);
    this.creatingCategory.set(true);
  }

  /**
   * Cancela la creación.
   */
  cancelCreateCategory(): void {
    this.creatingCategory.set(false);
  }

  /**
   * Actualiza el listado después de crear una categoría.
   */

  onCategoryCreated(category: Category): void {
    if (category.space_id !== this.spaceStore.selectedId()) {
      this.creatingCategory.set(false);
      return;
    }

    this.creatingCategory.set(false);
    this.reload();

    this.creationMessage.set(`Se ha creado la categoría «${category.name}».`);
  }

  /**
   * Abre la edición de una categoría existente.
   */
  openEditCategory(category: Category): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.creatingCategory() ||
      this.editingCategory() !== null ||
      category.space_id !== this.spaceStore.selectedId() ||
      !this.categories().some((item: Category): boolean => item.id === category.id)
    ) {
      return;
    }

    this.creationMessage.set(null);
    this.editingCategory.set(category);
  }

  /**
   * Cancela la edición.
   */
  cancelEditCategory(): void {
    this.editingCategory.set(null);
  }

  /**
   * Actualiza el listado tras editar una categoría.
   */
  onCategorySaved(category: Category): void {
    if (
      category.space_id !== this.spaceStore.selectedId() ||
      this.editingCategory()?.id !== category.id
    ) {
      this.editingCategory.set(null);
      return;
    }

    this.editingCategory.set(null);
    this.reload();

    this.creationMessage.set(`Se ha actualizado la categoría «${category.name}».`);
  }

  constructor() {
    effect((): void => {
      this.spaceStore.selectedId();
      this.authStore.token();

      this.creatingCategory.set(false);
      this.editingCategory.set(null);
      this.creationMessage.set(null);
    });

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

    this.creatingCategory.set(false);
    this.editingCategory.set(null);

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
