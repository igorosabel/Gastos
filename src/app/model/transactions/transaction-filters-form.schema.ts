import { validate, type SchemaPathTree } from '@angular/forms/signals';
import type TransactionFilters from '@model/transactions/transaction-filters.model';

export default function transactionFiltersFormSchema(
  path: SchemaPathTree<TransactionFilters>,
): void {
  validate(path.dateFrom, ({ value }) => {
    const date: string = value();

    if (date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        kind: 'invalidDate',
        message: 'La fecha inicial no es válida.',
      };
    }

    return undefined;
  });

  validate(path.dateTo, ({ value }) => {
    const date: string = value();

    if (date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        kind: 'invalidDate',
        message: 'La fecha final no es válida.',
      };
    }

    return undefined;
  });
}
