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
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type { ApiResponse, AuthUser } from '@interfaces/auth.interfaces';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import type CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';
import CreateCategory from '@modules/categories/create-category/create-category';
import EditCategory from '@modules/categories/edit-category/edit-category';
import { Refresh } from '@primeicons/angular';
import CategoriesService from '@services/categories.service';
import { ButtonDirective } from 'primeng/button';
import type { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-categories',
  imports: [ButtonDirective, CreateCategory, EditCategory, Refresh],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export default class Categories {
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private contextVersion: number = 0;

  readonly confirmationId: WritableSignal<number | null> = signal<number | null>(null);
  readonly deletingId: WritableSignal<number | null> = signal<number | null>(null);
  readonly deleteError: WritableSignal<string | null> = signal<string | null>(null);
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
      this.editingCategory() !== null ||
      this.deletingId() !== null ||
      this.confirmationId() !== null
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
      !this.categories().some((item: Category): boolean => item.id === category.id) ||
      this.deletingId() !== null ||
      this.confirmationId() !== null
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

  /**
   * Solicita confirmación para eliminar una categoría.
   */
  requestDelete(category: Category): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.creatingCategory() ||
      this.editingCategory() !== null ||
      this.deletingId() !== null ||
      category.space_id !== this.spaceStore.selectedId() ||
      !this.categories().some((item: Category): boolean => item.id === category.id)
    ) {
      return;
    }

    this.confirmationId.set(category.id);
    this.deleteError.set(null);
    this.creationMessage.set(null);
  }

  /**
   * Cancela una eliminación pendiente.
   */
  cancelDelete(): void {
    if (this.deletingId() !== null) {
      return;
    }

    this.confirmationId.set(null);
    this.deleteError.set(null);
  }

  /**
   * Elimina una categoría después de recibir confirmación.
   */
  async confirmDelete(): Promise<void> {
    const categoryId: number | null = this.confirmationId();
    const spaceId: number | null = this.spaceStore.selectedId();
    const token: string | null = this.authStore.token();
    const user: AuthUser | null = this.authStore.user();
    const version: number = this.contextVersion;

    if (
      categoryId === null ||
      spaceId === null ||
      token === null ||
      user === null ||
      this.loading() ||
      this.deletingId() !== null
    ) {
      return;
    }

    const category: Category | undefined = this.categories().find(
      (item: Category): boolean => item.id === categoryId && item.space_id === spaceId,
    );

    if (category === undefined) {
      this.cancelDelete();
      return;
    }

    this.deletingId.set(categoryId);
    this.deleteError.set(null);

    try {
      const response: ApiResponse = await firstValueFrom(
        this.categoriesService.deleteCategory({
          spaceId,
          categoryId,
        }),
      );

      if (!this.isCurrentDeleteContext(spaceId, token, user.id, version)) {
        return;
      }

      if (!response.success) {
        this.deleteError.set('No se ha podido eliminar la categoría.');
        return;
      }

      this.confirmationId.set(null);
      this.deletingId.set(null);
      this.reload();

      this.creationMessage.set(`Se ha eliminado la categoría «${category.name}».`);
    } catch (error: unknown) {
      if (!this.isCurrentDeleteContext(spaceId, token, user.id, version)) {
        return;
      }

      this.deleteError.set(this.getDeleteError(error));
    } finally {
      if (this.isCurrentDeleteContext(spaceId, token, user.id, version)) {
        this.deletingId.set(null);
      }
    }
  }

  /**
   * Comprueba que la eliminación sigue asociada
   * a la misma sesión y contexto de categorías.
   */
  private isCurrentDeleteContext(
    spaceId: number,
    token: string,
    userId: number,
    version: number,
  ): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.contextVersion === version &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }

  /**
   * Traduce los errores de eliminación.
   */
  private getDeleteError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Los identificadores de la categoría no son válidos.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para eliminar esta categoría.';

        case 404:
          return 'La categoría ya no está disponible. Actualiza el listado.';

        case 409:
          return 'No se puede eliminar esta categoría porque tiene dependencias.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido eliminar la categoría. Inténtalo de nuevo.';
  }

  constructor() {
    effect((): void => {
      this.spaceStore.selectedId();
      this.authStore.token();

      this.creatingCategory.set(false);
      this.editingCategory.set(null);
      this.creationMessage.set(null);

      this.contextVersion += 1;
      this.confirmationId.set(null);
      this.deletingId.set(null);
      this.deleteError.set(null);
    });

    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();

      this.refreshVersion();

      this.contextVersion += 1;
      this.confirmationId.set(null);
      this.deleteError.set(null);

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
    if (this.spaceStore.selectedId() === null || this.deletingId() !== null) {
      return;
    }

    this.creatingCategory.set(false);
    this.editingCategory.set(null);
    this.confirmationId.set(null);
    this.deleteError.set(null);

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
