import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  FormRoot,
  type TreeValidationResult,
} from '@angular/forms/signals';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type UpdateCategoryResponse from '@interfaces/categories/update-category-response.interface';
import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import type CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';
import editCategoryFormInitialValue from '@model/categories/edit-category-form.initial-value';
import editCategoryFormMapper from '@model/categories/edit-category-form.mapper';
import type EditCategoryFormModel from '@model/categories/edit-category-form.model';
import editCategoryFormSchema from '@model/categories/edit-category-form.schema';
import CategoriesService from '@services/categories.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-category',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, SelectModule],
  templateUrl: './edit-category.html',
  styleUrl: './edit-category.scss',
})
export default class EditCategory {
  private readonly categoriesService: CategoriesService = inject(CategoriesService);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly spaceStore: SpaceStore = inject(SpaceStore);

  readonly category: InputSignal<Category> = input.required<Category>();

  readonly categories: InputSignal<Category[]> = input.required<Category[]>();

  readonly saved: OutputEmitterRef<Category> = output<Category>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly editModel: WritableSignal<EditCategoryFormModel> = signal<EditCategoryFormModel>({
    name: '',
    parentId: null,
  });

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  /**
   * Identificadores que no pueden utilizarse como padre:
   * la propia categoría y todos sus descendientes.
   */
  readonly excludedIds: Signal<Set<number>> = computed((): Set<number> => {
    const excluded: Set<number> = new Set<number>([this.category().id]);

    let changed: boolean = true;

    while (changed) {
      changed = false;

      for (const item of this.categories()) {
        if (
          item.space_id === this.category().space_id &&
          item.parent_id !== null &&
          excluded.has(item.parent_id) &&
          !excluded.has(item.id)
        ) {
          excluded.add(item.id);
          changed = true;
        }
      }
    }

    return excluded;
  });

  readonly parentOptions: Signal<
    {
      label: string;
      value: number | null;
      depth: number;
    }[]
  > = computed(
    (): {
      label: string;
      value: number | null;
      depth: number;
    }[] => {
      const category: Category = this.category();
      const excluded: Set<number> = this.excludedIds();

      const available: Category[] = this.categories().filter(
        (item: Category): boolean =>
          item.space_id === category.space_id &&
          item.default_type === category.default_type &&
          !excluded.has(item.id),
      );

      const rows: CategoryRow[] = categoriesToRows(available);

      const options: {
        label: string;
        value: number | null;
        depth: number;
      }[] = [
        {
          label: 'Categoría principal',
          value: null,
          depth: 0,
        },
      ];

      for (const row of rows) {
        options.push({
          label: row.category.name,
          value: row.category.id,
          depth: row.depth,
        });
      }

      return options;
    },
  );

  readonly editForm: FieldTree<EditCategoryFormModel> = form(
    this.editModel,
    editCategoryFormSchema,
    {
      submission: {
        action: async (field: FieldTree<EditCategoryFormModel>): Promise<TreeValidationResult> => {
          const category: Category = this.category();
          const token: string | null = this.authStore.token();
          const userId: number | undefined = this.authStore.user()?.id;

          const model: EditCategoryFormModel = field().value();

          const categoryExists: boolean = this.categories().some(
            (item: Category): boolean =>
              item.id === category.id && item.space_id === category.space_id,
          );

          const validParent: boolean =
            model.parentId === null ||
            this.parentOptions().some((option): boolean => option.value === model.parentId);

          if (
            token === null ||
            userId === undefined ||
            !categoryExists ||
            !validParent ||
            this.spaceStore.selectedId() !== category.space_id
          ) {
            return {
              kind: 'serverError',
              message: 'La categoría, su padre o la sesión no son válidos.',
            };
          }

          try {
            const response: UpdateCategoryResponse = await firstValueFrom(
              this.categoriesService.updateCategory(editCategoryFormMapper(model, category)),
            );

            if (!this.isCurrentContext(category, token, userId)) {
              return undefined;
            }

            if (!response.success || response.category === null) {
              return {
                kind: 'serverError',
                message: 'No se ha podido actualizar la categoría.',
              };
            }

            this.saved.emit(response.category);
            return undefined;
          } catch (error: unknown) {
            if (!this.isCurrentContext(category, token, userId)) {
              return undefined;
            }

            if (error instanceof HttpErrorResponse) {
              switch (error.status) {
                case 400:
                  return {
                    kind: 'serverError',
                    message: 'Los datos de la categoría no son válidos.',
                  };

                case 401:
                  return {
                    kind: 'serverError',
                    message: 'Tu sesión ha caducado.',
                  };

                case 403:
                  return {
                    kind: 'serverError',
                    message: 'No tienes permiso para editar esta categoría.',
                  };

                case 404:
                  return {
                    kind: 'serverError',
                    message: 'La categoría ya no está disponible.',
                  };

                case 409:
                  return {
                    kind: 'serverError',
                    message: 'La jerarquía propuesta no es válida.',
                  };

                case 0:
                  return {
                    kind: 'serverError',
                    message: 'No se ha podido conectar con el servidor.',
                  };
              }
            }

            return {
              kind: 'serverError',
              message: 'No se ha podido actualizar la categoría.',
            };
          }
        },
      },
    },
  );

  constructor() {
    effect((): void => {
      this.editModel.set(editCategoryFormInitialValue(this.category()));
    });

    afterNextRender((): void => {
      this.nameInput()?.nativeElement.focus();
    });
  }

  /**
   * Comprueba que no ha cambiado el contexto de edición.
   */
  private isCurrentContext(category: Category, token: string, userId: number): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.category().id === category.id &&
      this.category().space_id === category.space_id &&
      this.spaceStore.selectedId() === category.space_id &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }

  /**
   * Cancela la edición.
   */
  cancel(): void {
    if (this.editForm().submitting()) {
      return;
    }

    this.cancelled.emit();
  }
}
