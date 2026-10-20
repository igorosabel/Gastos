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
import type UpdateRecurringResponse from '@interfaces/recurring/update-recurring-response.interface';
import type Category from '@model/categories/category.model';
import createRecurringFormInitialValue from '@model/recurring/create-recurring-form.initial-value';
import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';
import createRecurringFormSchema from '@model/recurring/create-recurring-form.schema';
import editRecurringFormInitialValue from '@model/recurring/edit-recurring-form.initial-value';
import editRecurringFormMapper from '@model/recurring/edit-recurring-form.mapper';
import type Recurring from '@model/recurring/recurring.model';
import type TransactionCategoryOption from '@model/transactions/transaction-category-option.model';
import transactionCategoryOptions from '@model/transactions/transaction-category-options.mapper';
import RecurringService from '@services/recurring.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-recurring',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, SelectModule],
  templateUrl: './edit-recurring.html',
  styleUrl: './edit-recurring.scss',
})
export default class EditRecurring {
  private readonly recurringService: RecurringService = inject(RecurringService);
  private readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly recurring: InputSignal<Recurring> = input.required<Recurring>();

  readonly categories: InputSignal<Category[]> = input.required<Category[]>();

  readonly saved: OutputEmitterRef<Recurring> = output<Recurring>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly recurringModel: WritableSignal<CreateRecurringFormModel> =
    signal<CreateRecurringFormModel>(createRecurringFormInitialValue());

  readonly showErrors: WritableSignal<boolean> = signal<boolean>(false);

  readonly typeOptions: {
    label: string;
    value: 'income' | 'expense';
  }[] = [
    { label: 'Gasto', value: 'expense' },
    { label: 'Ingreso', value: 'income' },
  ];

  readonly dayOptions: {
    label: string;
    value: number;
  }[] = Array.from(
    { length: 31 },
    (
      _: unknown,
      index: number,
    ): {
      label: string;
      value: number;
    } => ({
      label: String(index + 1),
      value: index + 1,
    }),
  );

  readonly categoryOptions: Signal<TransactionCategoryOption[]> = computed(
    (): TransactionCategoryOption[] =>
      transactionCategoryOptions(
        this.categories(),
        this.recurring().space_id,
        this.recurringModel().type,
      ),
  );

  private readonly conceptInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('conceptInput');

  readonly recurringForm: FieldTree<CreateRecurringFormModel> = form(
    this.recurringModel,
    createRecurringFormSchema,
    {
      submission: {
        onInvalid: (): void => {
          this.showErrors.set(true);
        },
        action: async (
          field: FieldTree<CreateRecurringFormModel>,
        ): Promise<TreeValidationResult> => {
          const recurring: Recurring = this.recurring();
          const token: string | null = this.authStore.token();
          const userId: number | undefined = this.authStore.user()?.id;
          const model: CreateRecurringFormModel = field().value();

          const validCategory: boolean = this.categories().some(
            (category: Category): boolean =>
              category.id === model.categoryId &&
              category.space_id === recurring.space_id &&
              category.default_type === model.type,
          );

          if (
            token === null ||
            userId === undefined ||
            this.spaceStore.selectedId() !== recurring.space_id ||
            !validCategory
          ) {
            return {
              kind: 'serverError',
              message: 'La categoría, el espacio o la sesión no son válidos.',
            };
          }

          try {
            const response: UpdateRecurringResponse = await firstValueFrom(
              this.recurringService.updateRecurring(editRecurringFormMapper(model, recurring)),
            );

            if (!this.isCurrentContext(recurring, token, userId)) {
              return undefined;
            }

            if (
              !response.success ||
              response.recurring === null ||
              response.recurring.id !== recurring.id ||
              response.recurring.space_id !== recurring.space_id ||
              response.recurring.active !== recurring.active
            ) {
              return {
                kind: 'serverError',
                message: 'No se ha podido actualizar el recurrente.',
              };
            }

            this.saved.emit(response.recurring);
            return undefined;
          } catch (error: unknown) {
            if (!this.isCurrentContext(recurring, token, userId)) {
              return undefined;
            }

            if (error instanceof HttpErrorResponse) {
              switch (error.status) {
                case 400:
                  return {
                    kind: 'serverError',
                    message: 'Los datos del recurrente no son válidos.',
                  };

                case 401:
                  return {
                    kind: 'serverError',
                    message: 'Tu sesión ha caducado.',
                  };

                case 403:
                  return {
                    kind: 'serverError',
                    message: 'No tienes permiso para editar este recurrente.',
                  };

                case 404:
                  return {
                    kind: 'serverError',
                    message: 'El recurrente ya no está disponible.',
                  };

                case 409:
                  return {
                    kind: 'serverError',
                    message: 'No se ha podido editar el recurrente por un conflicto.',
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
              message: 'No se ha podido actualizar el recurrente.',
            };
          }
        },
      },
    },
  );

  constructor() {
    effect((): void => {
      this.recurringModel.set(editRecurringFormInitialValue(this.recurring()));
      this.showErrors.set(false);
    });

    afterNextRender((): void => {
      this.conceptInput()?.nativeElement.focus();
    });
  }

  changeType(type: 'income' | 'expense'): void {
    this.recurringModel.update(
      (model: CreateRecurringFormModel): CreateRecurringFormModel => ({
        ...model,
        type,
        categoryId: null,
      }),
    );
  }

  cancel(): void {
    if (this.recurringForm().submitting()) {
      return;
    }

    this.cancelled.emit();
  }

  private isCurrentContext(recurring: Recurring, token: string, userId: number): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.recurring().id === recurring.id &&
      this.recurring().space_id === recurring.space_id &&
      this.spaceStore.selectedId() === recurring.space_id &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }
}
