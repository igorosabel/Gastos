import type TransactionFilters from '@model/transactions/transaction-filters.model';

export default function transactionFiltersFormInitialValue(): TransactionFilters {
  return {
    dateFrom: '',
    dateTo: '',
    type: null,
    categoryId: null,
  };
}
