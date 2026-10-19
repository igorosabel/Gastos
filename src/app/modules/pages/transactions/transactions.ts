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
import { form, FormField, type FieldTree } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type { ApiResponse } from '@interfaces/auth.interfaces';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type TransactionsResponse from '@interfaces/transactions/transactions-response.interface';
import type Category from '@model/categories/category.model';
import transactionFiltersFormInitialValue from '@model/transactions/transaction-filters-form.initial-value';
import transactionFiltersFormMapper from '@model/transactions/transaction-filters-form.mapper';
import transactionFiltersFormSchema from '@model/transactions/transaction-filters-form.schema';
import type TransactionFilters from '@model/transactions/transaction-filters.model';
import type Transaction from '@model/transactions/transaction.model';
import CreateTransaction from '@modules/transactions/create-transaction/create-transaction';
import EditTransaction from '@modules/transactions/edit-transaction/edit-transaction';
import { Refresh } from '@primeicons/angular';
import CategoriesService from '@services/categories.service';
import TransactionRefreshService from '@services/transaction-refresh.service';
import TransactionsService from '@services/transactions.service';
import { ButtonDirective } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { firstValueFrom, forkJoin, type Subscription } from 'rxjs';

@Component({
  selector: 'app-transactions',
  imports: [
    ButtonDirective,
    FormField,
    SelectModule,
    CreateTransaction,
    EditTransaction,
    Refresh,
    RouterLink,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export default class Transactions {
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly transactionsService: TransactionsService = inject(TransactionsService);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly transactionRefresh: TransactionRefreshService =
    inject(TransactionRefreshService);

  readonly transactions: WritableSignal<Transaction[]> = signal<Transaction[]>([]);
  readonly categories: WritableSignal<Category[]> = signal<Category[]>([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly total: WritableSignal<number> = signal<number>(0);
  readonly pageSize: WritableSignal<number> = signal<number>(20);
  private readonly refreshVersion: WritableSignal<number> = signal<number>(0);
  readonly page: WritableSignal<number> = signal<number>(1);
  readonly totalPages: WritableSignal<number> = signal<number>(0);
  readonly filtersModel: WritableSignal<TransactionFilters> = signal<TransactionFilters>(
    transactionFiltersFormInitialValue(),
  );
  readonly creatingTransaction: WritableSignal<boolean> = signal<boolean>(false);
  readonly creationMessage: WritableSignal<string | null> = signal<string | null>(null);
  readonly editingTransaction: WritableSignal<Transaction | null> = signal<Transaction | null>(
    null,
  );
  readonly confirmationId: WritableSignal<number | null> = signal<number | null>(null);
  readonly deletingId: WritableSignal<number | null> = signal<number | null>(null);
  readonly deleteError: WritableSignal<string | null> = signal<string | null>(null);

  readonly filtersForm: FieldTree<TransactionFilters> = form(
    this.filtersModel,
    transactionFiltersFormSchema,
  );

  readonly appliedFilters: WritableSignal<TransactionFilters> = signal<TransactionFilters>(
    transactionFiltersFormInitialValue(),
  );

  readonly filtersError: WritableSignal<string | null> = signal<string | null>(null);

  readonly typeOptions: {
    label: string;
    value: 'income' | 'expense' | null;
  }[] = [
    { label: 'Todos', value: null },
    { label: 'Gastos', value: 'expense' },
    { label: 'Ingresos', value: 'income' },
  ];

  readonly categoryOptions: Signal<
    {
      label: string;
      value: number | null;
    }[]
  > = computed(
    (): {
      label: string;
      value: number | null;
    }[] => {
      const options: {
        label: string;
        value: number | null;
      }[] = [{ label: 'Todas las categorías', value: null }];

      const selectedType: 'income' | 'expense' | null = this.filtersModel().type;

      for (const category of this.categories()) {
        if (
          category.space_id === this.spaceStore.selectedId() &&
          (selectedType === null || category.default_type === selectedType)
        ) {
          options.push({
            label: category.name,
            value: category.id,
          });
        }
      }

      return options;
    },
  );

  readonly categoryNames: Signal<Map<number, string>> = computed((): Map<number, string> => {
    const names: Map<number, string> = new Map<number, string>();

    for (const category of this.categories()) {
      names.set(category.id, category.name);
    }

    return names;
  });

  private previousSpaceId: number | null = null;
  private previousToken: string | null = null;

  constructor() {
    effect((): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();

      if (this.previousSpaceId !== spaceId || this.previousToken !== token) {
        this.previousSpaceId = spaceId;
        this.previousToken = token;

        this.page.set(1);
        this.filtersModel.set(transactionFiltersFormInitialValue());
        this.appliedFilters.set(transactionFiltersFormInitialValue());
        this.creatingTransaction.set(false);
        this.editingTransaction.set(null);
        this.creationMessage.set(null);
        this.filtersError.set(null);
        this.confirmationId.set(null);
        this.deletingId.set(null);
        this.deleteError.set(null);
      }
    });

    effect((onCleanup): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const page: number = this.page();
      const filters: TransactionFilters = this.appliedFilters();

      this.refreshVersion();
      this.transactionRefresh.version();

      this.confirmationId.set(null);
      this.deleteError.set(null);
      this.transactions.set([]);
      this.categories.set([]);
      this.total.set(0);
      this.totalPages.set(0);
      this.pageSize.set(20);
      this.error.set(null);
      this.loading.set(false);

      if (spaceId === null || token === null) {
        return;
      }

      this.loading.set(true);

      const subscription: Subscription = forkJoin({
        transactions: this.transactionsService.getTransactions(spaceId, page, filters),
        categories: this.categoriesService.getCategories(spaceId),
      }).subscribe({
        next: (response: {
          transactions: TransactionsResponse;
          categories: CategoriesResponse;
        }): void => {
          if (!this.isCurrentContext(spaceId, token, page)) {
            return;
          }

          if (!response.transactions.success || !response.categories.success) {
            this.error.set('No se han podido consultar los movimientos.');
          } else {
            this.transactions.set(response.transactions.transactions);
            this.categories.set(response.categories.categories);
            this.total.set(response.transactions.total);
            this.totalPages.set(response.transactions.total_pages);
            this.pageSize.set(response.transactions.page_size);
          }

          this.loading.set(false);
        },
        error: (error: unknown): void => {
          if (!this.isCurrentContext(spaceId, token, page)) {
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
    if (this.spaceStore.selectedId() === null || this.loading() || this.deletingId() !== null) {
      return;
    }

    this.editingTransaction.set(null);

    this.refreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Obtiene el nombre de una categoría del espacio activo.
   */
  categoryName(categoryId: number): string {
    return this.categoryNames().get(categoryId) ?? `Categoría ${categoryId}`;
  }

  /**
   * Muestra la página anterior, si existe.
   */
  previousPage(): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.spaceStore.selectedId() === null ||
      this.page() <= 1 ||
      this.deletingId() !== null
    ) {
      return;
    }

    this.page.update((page: number): number => page - 1);
  }

  /**
   * Muestra la página siguiente, si existe.
   */
  nextPage(): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.spaceStore.selectedId() === null ||
      this.page() >= this.totalPages() ||
      this.deletingId() !== null
    ) {
      return;
    }

    this.page.update((page: number): number => page + 1);
  }

  /**
   * Aplica los filtros introducidos y vuelve a la primera página.
   */
  applyFilters(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.loading() ||
      this.filtersForm().invalid() ||
      this.deletingId() !== null
    ) {
      return;
    }

    const filters: TransactionFilters = transactionFiltersFormMapper(this.filtersModel());

    if (filters.dateFrom !== '' && filters.dateTo !== '' && filters.dateFrom > filters.dateTo) {
      this.filtersError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    const selectedCategory: Category | undefined = this.categories().find(
      (category: Category): boolean =>
        category.id === filters.categoryId && category.space_id === this.spaceStore.selectedId(),
    );

    if (
      filters.categoryId !== null &&
      (selectedCategory === undefined ||
        (filters.type !== null && selectedCategory.default_type !== filters.type))
    ) {
      this.filtersError.set('La categoría seleccionada no es válida para este filtro.');
      return;
    }

    this.filtersError.set(null);
    this.page.set(1);
    this.appliedFilters.set(filters);
  }

  /**
   * Limpia todos los filtros y consulta de nuevo la primera página.
   */
  clearFilters(): void {
    if (this.spaceStore.selectedId() === null || this.loading() || this.deletingId() !== null) {
      return;
    }

    this.filtersModel.set(transactionFiltersFormInitialValue());
    this.appliedFilters.set(transactionFiltersFormInitialValue());
    this.filtersError.set(null);
    this.page.set(1);
  }

  /**
   * Impide conservar una categoría incompatible con el tipo elegido.
   */
  changeFilterType(type: 'income' | 'expense' | null): void {
    this.filtersModel.update(
      (model: TransactionFilters): TransactionFilters => ({
        ...model,
        type,
        categoryId: null,
      }),
    );
  }

  /**
   * Abre el formulario de creación.
   */
  openCreateTransaction(): void {
    if (
      this.spaceStore.selectedId() === null ||
      this.loading() ||
      this.error() !== null ||
      this.creatingTransaction() ||
      this.editingTransaction() !== null ||
      this.confirmationId() !== null ||
      this.deletingId() !== null
    ) {
      return;
    }

    this.creationMessage.set(null);
    this.creatingTransaction.set(true);
  }

  /**
   * Cancela la creación del movimiento.
   */
  cancelCreateTransaction(): void {
    this.creatingTransaction.set(false);
  }

  /**
   * Actualiza el listado después de crear el movimiento.
   */
  onTransactionCreated(transaction: Transaction): void {
    if (!this.creatingTransaction() || transaction.space_id !== this.spaceStore.selectedId()) {
      return;
    }

    this.creatingTransaction.set(false);
    this.page.set(1);

    // Si ya estábamos en la primera página, forzamos igualmente
    // una consulta. Los filtros aplicados se conservan.
    this.refreshVersion.update((version: number): number => version + 1);

    this.creationMessage.set(
      `Se ha creado el movimiento «${transaction.concept || transaction.amount + ' €'}».`,
    );
  }

  /**
   * Abre el formulario de edición del movimiento.
   */
  openEditTransaction(transaction: Transaction): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.creatingTransaction() ||
      this.editingTransaction() !== null ||
      this.confirmationId() !== null ||
      this.deletingId() !== null ||
      transaction.space_id !== this.spaceStore.selectedId() ||
      !this.transactions().some(
        (item: Transaction): boolean =>
          item.id === transaction.id && item.space_id === transaction.space_id,
      )
    ) {
      return;
    }

    this.creationMessage.set(null);
    this.editingTransaction.set(transaction);
  }

  /**
   * Cancela la edición.
   */
  cancelEditTransaction(): void {
    this.editingTransaction.set(null);
  }

  /**
   * Vuelve a consultar los movimientos tras guardar los cambios.
   */
  onTransactionSaved(transaction: Transaction): void {
    if (
      transaction.space_id !== this.spaceStore.selectedId() ||
      this.editingTransaction()?.id !== transaction.id
    ) {
      this.editingTransaction.set(null);
      return;
    }

    this.editingTransaction.set(null);

    // Conserva la página y los filtros aplicados.
    this.refreshVersion.update((version: number): number => version + 1);

    this.creationMessage.set(
      `Se ha actualizado el movimiento «${transaction.concept || transaction.amount + ' €'}».`,
    );
  }

  /**
   * Abre la confirmación de eliminación.
   */
  requestDelete(transaction: Transaction): void {
    if (
      this.loading() ||
      this.error() !== null ||
      this.creatingTransaction() ||
      this.editingTransaction() !== null ||
      this.deletingId() !== null ||
      transaction.space_id !== this.spaceStore.selectedId() ||
      !this.transactions().some(
        (item: Transaction): boolean =>
          item.id === transaction.id && item.space_id === transaction.space_id,
      )
    ) {
      return;
    }

    this.confirmationId.set(transaction.id);
    this.deleteError.set(null);
    this.creationMessage.set(null);
  }

  /**
   * Cancela una confirmación, sin enviar ninguna petición.
   */
  cancelDelete(): void {
    if (this.deletingId() !== null) {
      return;
    }

    this.confirmationId.set(null);
    this.deleteError.set(null);
  }

  /**
   * Ejecuta la eliminación confirmada.
   */
  async confirmDelete(): Promise<void> {
    const transactionId: number | null = this.confirmationId();
    const spaceId: number | null = this.spaceStore.selectedId();
    const token: string | null = this.authStore.token();
    const userId: number | undefined = this.authStore.user()?.id;
    const page: number = this.page();
    const filters: TransactionFilters = this.appliedFilters();

    if (
      transactionId === null ||
      spaceId === null ||
      token === null ||
      userId === undefined ||
      this.loading() ||
      this.error() !== null ||
      this.deletingId() !== null
    ) {
      return;
    }

    const transaction: Transaction | undefined = this.transactions().find(
      (item: Transaction): boolean => item.id === transactionId && item.space_id === spaceId,
    );

    if (transaction === undefined) {
      this.cancelDelete();
      return;
    }

    this.deletingId.set(transactionId);
    this.deleteError.set(null);

    try {
      const response: ApiResponse = await firstValueFrom(
        this.transactionsService.deleteTransaction({
          spaceId,
          transactionId,
        }),
      );

      if (!this.isCurrentDeleteContext(spaceId, token, userId, page, filters)) {
        return;
      }

      if (!response.success) {
        this.deleteError.set('No se ha podido eliminar el movimiento.');
        return;
      }

      this.confirmationId.set(null);
      this.deletingId.set(null);

      if (page > 1 && this.transactions().length === 1) {
        // Era el último resultado de una página posterior.
        // Cambiar page ya desencadena la nueva consulta.
        this.page.set(page - 1);
      } else {
        // Conservamos la página y los filtros actuales.
        this.refreshVersion.update((version: number): number => version + 1);
      }

      this.creationMessage.set(
        `Se ha eliminado el movimiento «${transaction.concept || transaction.amount + ' €'}».`,
      );
    } catch (error: unknown) {
      if (!this.isCurrentDeleteContext(spaceId, token, userId, page, filters)) {
        return;
      }

      this.deleteError.set(this.getDeleteError(error));
    } finally {
      if (this.isCurrentDeleteContext(spaceId, token, userId, page, filters)) {
        this.deletingId.set(null);
      }
    }
  }

  /**
   * Comprueba que sigue vigente el contexto de la petición.
   */
  private isCurrentDeleteContext(
    spaceId: number,
    token: string,
    userId: number,
    page: number,
    filters: TransactionFilters,
  ): boolean {
    return (
      !this.destroyRef.destroyed &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId &&
      this.page() === page &&
      this.appliedFilters() === filters
    );
  }

  /**
   * Mensajes para los errores de eliminación.
   */
  private getDeleteError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Los identificadores del movimiento no son válidos.';

        case 401:
          return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';

        case 403:
          return 'No tienes permiso para eliminar este movimiento.';

        case 404:
          return 'El movimiento ya no está disponible. Actualiza el listado.';

        case 409:
          return 'No se puede eliminar un movimiento vinculado a una ocurrencia recurrente.';

        case 0:
          return 'No se ha podido conectar con el servidor.';
      }
    }

    return 'No se ha podido eliminar el movimiento. Inténtalo de nuevo.';
  }

  /**
   * Comprueba el espacio y la sesión de la respuesta.
   */
  private isCurrentContext(spaceId: number, token: string, page: number): boolean {
    return (
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.page() === page
    );
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
