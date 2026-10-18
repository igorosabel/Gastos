import type TransactionFilters from '@model/transactions/transaction-filters.model';

export default function transactionFiltersFormMapper(
  model: TransactionFilters,
): TransactionFilters {
  return {
    dateFrom: model.dateFrom.trim(),
    dateTo: model.dateTo.trim(),
    type: model.type,
    categoryId: model.categoryId,
  };
}
