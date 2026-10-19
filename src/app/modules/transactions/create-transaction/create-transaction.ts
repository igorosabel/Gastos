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
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type CreateTransactionResponse from '@interfaces/transactions/create-transaction-response.interface';
import type Category from '@model/categories/category.model';
import createTransactionFormInitialValue from '@model/transactions/create-transaction-form.initial-value';
import createTransactionFormMapper from '@model/transactions/create-transaction-form.mapper';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import createTransactionFormSchema from '@model/transactions/create-transaction-form.schema';
import type TransactionCategoryOption from '@model/transactions/transaction-category-option.model';
import transactionCategoryOptions from '@model/transactions/transaction-category-options.mapper';
import type Transaction from '@model/transactions/transaction.model';
import TransactionsService from '@services/transactions.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-transaction',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, SelectModule],
  templateUrl: './create-transaction.html',
  styleUrl: './create-transaction.scss',
})
export default class CreateTransaction {
  private readonly transactionsService: TransactionsService = inject(TransactionsService);

  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly spaceId: InputSignal<number> = input.required<number>();
  readonly categories: InputSignal<Category[]> = input.required<Category[]>();

  readonly created: OutputEmitterRef<Transaction> = output<Transaction>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly transactionModel: WritableSignal<CreateTransactionFormModel> =
    signal<CreateTransactionFormModel>(createTransactionFormInitialValue());
  readonly showErrors: WritableSignal<boolean> = signal<boolean>(false);

  readonly typeOptions: {
    label: string;
    value: 'income' | 'expense';
  }[] = [
    { label: 'Gasto', value: 'expense' },
    { label: 'Ingreso', value: 'income' },
  ];

  readonly categoryOptions: Signal<TransactionCategoryOption[]> = computed(
    (): TransactionCategoryOption[] =>
      transactionCategoryOptions(this.categories(), this.spaceId(), this.transactionModel().type),
  );

  private readonly amountInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('amountInput');

  readonly transactionForm: FieldTree<CreateTransactionFormModel> = form(
    this.transactionModel,
    createTransactionFormSchema,
    {
      submission: {
        onInvalid: (): void => {
          this.showErrors.set(true);
        },
        action: async (
          field: FieldTree<CreateTransactionFormModel>,
        ): Promise<TreeValidationResult> => {
          const spaceId: number = this.spaceId();
          const token: string | null = this.authStore.token();
          const userId: number | undefined = this.authStore.user()?.id;
          const model: CreateTransactionFormModel = field().value();

          const validCategory: boolean = this.categories().some(
            (category: Category): boolean =>
              category.id === model.categoryId &&
              category.space_id === spaceId &&
              category.default_type === model.type,
          );

          if (
            token === null ||
            userId === undefined ||
            this.spaceStore.selectedId() !== spaceId ||
            !validCategory
          ) {
            return {
              kind: 'serverError',
              message: 'La categoría, el espacio o la sesión no son válidos.',
            };
          }

          try {
            const response: CreateTransactionResponse = await firstValueFrom(
              this.transactionsService.createTransaction(
                createTransactionFormMapper(model, spaceId),
              ),
            );

            if (!this.isCurrentContext(spaceId, token, userId)) {
              return undefined;
            }

            if (!response.success || response.transaction === null) {
              return {
                kind: 'serverError',
                message: 'No se ha podido crear el movimiento.',
              };
            }

            this.created.emit(response.transaction);
            return undefined;
          } catch (error: unknown) {
            if (!this.isCurrentContext(spaceId, token, userId)) {
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
                    message: 'No tienes permiso para crear movimientos.',
                  };

                case 404:
                  return {
                    kind: 'serverError',
                    message: 'La categoría seleccionada ya no está disponible.',
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
              message: 'No se ha podido crear el movimiento.',
            };
          }
        },
      },
    },
  );

  constructor() {
    afterNextRender((): void => {
      this.amountInput()?.nativeElement.focus();
    });
  }

  /**
   * Al cambiar el tipo se invalida la categoría seleccionada.
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

  /**
   * Cancela el formulario.
   */
  cancel(): void {
    if (this.transactionForm().submitting()) {
      return;
    }

    this.cancelled.emit();
  }

  /**
   * Evita utilizar resultados de otro espacio o sesión.
   */
  private isCurrentContext(spaceId: number, token: string, userId: number): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.spaceId() === spaceId &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }
}
