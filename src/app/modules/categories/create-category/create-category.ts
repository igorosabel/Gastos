import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
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
import AuthStore from '@auth/auth.store';
import type CreateCategoryResponse from '@interfaces/categories/create-category-response.interface';
import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';
import createCategoryFormInitialValue from '@model/categories/create-category-form.initial-value';
import createCategoryRequest from '@model/categories/create-category-form.mapper';
import type CreateCategoryFormModel from '@model/categories/create-category-form.model';
import createCategoryFormSchema from '@model/categories/create-category-form.schema';
import CategoriesService from '@services/categories.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-category',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, SelectModule],
  templateUrl: './create-category.html',
  styleUrl: './create-category.scss',
})
export default class CreateCategory {
  private readonly categoriesService: CategoriesService = inject(CategoriesService);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly spaceId: InputSignal<number> = input.required<number>();
  readonly categories: InputSignal<Category[]> = input.required<Category[]>();

  readonly created: OutputEmitterRef<Category> = output<Category>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly categoryModel: WritableSignal<CreateCategoryFormModel> = signal<CreateCategoryFormModel>(
    createCategoryFormInitialValue(),
  );

  readonly categoryTypes: {
    label: string;
    value: 'income' | 'expense';
  }[] = [
    { label: 'Gasto', value: 'expense' },
    { label: 'Ingreso', value: 'income' },
  ];

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
      const type: 'income' | 'expense' = this.categoryModel().defaultType;

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

      const rows: CategoryRow[] = categoriesToRows(
        this.categories().filter(
          (category: Category): boolean =>
            category.space_id === this.spaceId() && category.default_type === type,
        ),
      );

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

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly categoryForm: FieldTree<CreateCategoryFormModel> = form(
    this.categoryModel,
    createCategoryFormSchema,
    {
      submission: {
        action: async (
          field: FieldTree<CreateCategoryFormModel>,
        ): Promise<TreeValidationResult> => {
          const spaceId: number = this.spaceId();
          const token: string | null = this.authStore.token();
          const userId: number | undefined = this.authStore.user()?.id;

          const model: CreateCategoryFormModel = field().value();

          const validParent: boolean =
            model.parentId === null ||
            this.categories().some(
              (category: Category): boolean =>
                category.id === model.parentId &&
                category.space_id === spaceId &&
                category.default_type === model.defaultType,
            );

          if (token === null || userId === undefined || !validParent) {
            return {
              kind: 'serverError',
              message: 'La categoría padre o la sesión no es válida.',
            };
          }

          try {
            const response: CreateCategoryResponse = await firstValueFrom(
              this.categoriesService.createCategory(createCategoryRequest(model, spaceId)),
            );

            if (
              this.destroyRef.destroyed ||
              this.spaceId() !== spaceId ||
              this.authStore.token() !== token ||
              this.authStore.user()?.id !== userId
            ) {
              return undefined;
            }

            if (!response.success || response.category === null) {
              return {
                kind: 'serverError',
                message: 'No se ha podido crear la categoría.',
              };
            }

            this.created.emit(response.category);
            return undefined;
          } catch (error: unknown) {
            if (
              this.destroyRef.destroyed ||
              this.spaceId() !== spaceId ||
              this.authStore.token() !== token ||
              this.authStore.user()?.id !== userId
            ) {
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
                    message: 'No tienes permiso para crear esta categoría.',
                  };

                case 409:
                  return {
                    kind: 'serverError',
                    message: 'La categoría entra en conflicto con otra existente.',
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
              message: 'No se ha podido crear la categoría. Inténtalo de nuevo.',
            };
          }
        },
      },
    },
  );

  constructor() {
    afterNextRender((): void => {
      this.nameInput()?.nativeElement.focus();
    });
  }

  /**
   * Cambia el tipo y elimina cualquier padre seleccionado
   * que ya no sería compatible.
   */
  changeType(type: 'income' | 'expense'): void {
    this.categoryModel.update(
      (model: CreateCategoryFormModel): CreateCategoryFormModel => ({
        ...model,
        defaultType: type,
        parentId: null,
      }),
    );
  }

  /**
   * Cancela el formulario sin enviar datos.
   */
  cancel(): void {
    if (this.categoryForm().submitting()) {
      return;
    }

    this.cancelled.emit();
  }
}
