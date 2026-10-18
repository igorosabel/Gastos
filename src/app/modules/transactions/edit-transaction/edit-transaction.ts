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
import type UpdateTransactionResponse from '@interfaces/transactions/update-transaction-response.interface';
import type Category from '@model/categories/category.model';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import createTransactionFormSchema from '@model/transactions/create-transaction-form.schema';
import editTransactionFormInitialValue from '@model/transactions/edit-transaction-form.initial-value';
import editTransactionFormMapper from '@model/transactions/edit-transaction-form.mapper';
import type Transaction from '@model/transactions/transaction.model';
import TransactionsService from '@services/transactions.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-transaction',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, SelectModule],
  templateUrl: './edit-transaction.html',
  styleUrl: './edit-transaction.scss',
})
export default class EditTransaction {
  private readonly transactionsService: TransactionsService = inject(TransactionsService);
  private readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly transaction: InputSignal<Transaction> = input.required<Transaction>();

  readonly categories: InputSignal<Category[]> = input.required<Category[]>();

  readonly saved: OutputEmitterRef<Transaction> = output<Transaction>();

  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly transactionModel: WritableSignal<CreateTransactionFormModel> =
    signal<CreateTransactionFormModel>({
      type: 'expense',
      categoryId: null,
      amount: '',
      concept: '',
      date: '',
    });

  readonly typeOptions: {
    label: string;
    value: 'income' | 'expense';
  }[] = [
    { label: 'Gasto', value: 'expense' },
    { label: 'Ingreso', value: 'income' },
  ];

  readonly categoryOptions: Signal<
    {
      label: string;
      value: number;
    }[]
  > = computed(
    (): {
      label: string;
      value: number;
    }[] => {
      const transaction: Transaction = this.transaction();
      const type: 'income' | 'expense' = this.transactionModel().type;

      return this.categories()
        .filter(
          (category: Category): boolean =>
            category.space_id === transaction.space_id && category.default_type === type,
        )
        .map(
          (
            category: Category,
          ): {
            label: string;
            value: number;
          } => ({
            label: category.name,
            value: category.id,
          }),
        );
    },
  );

  private readonly amountInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('amountInput');

  readonly transactionForm: FieldTree<CreateTransactionFormModel> = form(
    this.transactionModel,
    createTransactionFormSchema,
    {
      submission: {
        action: async (
          field: FieldTree<CreateTransactionFormModel>,
        ): Promise<TreeValidationResult> => {
          const transaction: Transaction = this.transaction();
          const token: string | null = this.authStore.token();
          const userId: number | undefined = this.authStore.user()?.id;
          const model: CreateTransactionFormModel = field().value();

          const validCategory: boolean = this.categories().some(
            (category: Category): boolean =>
              category.id === model.categoryId &&
              category.space_id === transaction.space_id &&
              category.default_type === model.type,
          );

          if (
            token === null ||
            userId === undefined ||
            this.spaceStore.selectedId() !== transaction.space_id ||
            !validCategory
          ) {
            return {
              kind: 'serverError',
              message: 'La categoría, el espacio o la sesión no son válidos.',
            };
          }

          try {
            const response: UpdateTransactionResponse = await firstValueFrom(
              this.transactionsService.updateTransaction(
                editTransactionFormMapper(model, transaction),
              ),
            );

            if (!this.isCurrentContext(transaction, token, userId)) {
              return undefined;
            }

            if (!response.success || response.transaction === null) {
              return {
                kind: 'serverError',
                message: 'No se ha podido actualizar el movimiento.',
              };
            }

            this.saved.emit(response.transaction);
            return undefined;
          } catch (error: unknown) {
            if (!this.isCurrentContext(transaction, token, userId)) {
              return undefined;
            }

            if (error instanceof HttpErrorResponse) {
              switch (error.status) {
                case 400:
                  return {
                    kind: 'serverError',
                    message: 'Los datos del movimiento no son válidos.',
                  };

                case 401:
                  return {
                    kind: 'serverError',
                    message: 'Tu sesión ha caducado.',
                  };

                case 403:
                  return {
                    kind: 'serverError',
                    message: 'No tienes permiso para editar este movimiento.',
                  };

                case 404:
                  return {
                    kind: 'serverError',
                    message: 'El movimiento ya no está disponible.',
                  };

                case 409:
                  return {
                    kind: 'serverError',
                    message:
                      'No se puede editar un movimiento vinculado a una ocurrencia recurrente.',
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
              message: 'No se ha podido actualizar el movimiento.',
            };
          }
        },
      },
    },
  );

  constructor() {
    effect((): void => {
      this.transactionModel.set(editTransactionFormInitialValue(this.transaction()));
    });

    afterNextRender((): void => {
      this.amountInput()?.nativeElement.focus();
    });
  }

  /**
   * Cambiar el tipo elimina la categoría seleccionada.
   */
  changeType(type: 'income' | 'expense'): void {
    this.transactionModel.update(
      (model: CreateTransactionFormModel): CreateTransactionFormModel => ({
        ...model,
        type,
        categoryId: null,
      }),
    );
  }

  cancel(): void {
    if (this.transactionForm().submitting()) {
      return;
    }

    this.cancelled.emit();
  }

  private isCurrentContext(transaction: Transaction, token: string, userId: number): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.transaction().id === transaction.id &&
      this.transaction().space_id === transaction.space_id &&
      this.spaceStore.selectedId() === transaction.space_id &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }
}
