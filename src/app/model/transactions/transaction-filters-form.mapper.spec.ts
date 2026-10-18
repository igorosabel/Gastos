import transactionFiltersFormInitialValue from '@model/transactions/transaction-filters-form.initial-value';
import transactionFiltersFormMapper from '@model/transactions/transaction-filters-form.mapper';
import type TransactionFilters from '@model/transactions/transaction-filters.model';
import { describe, expect, it } from 'vitest';

describe('Filtros de movimientos', (): void => {
  it('inicializa todos los filtros vacíos', (): void => {
    expect(transactionFiltersFormInitialValue()).toEqual({
      dateFrom: '',
      dateTo: '',
      type: null,
      categoryId: null,
    });
  });

  it('prepara los filtros para la API', (): void => {
    const model: TransactionFilters = {
      dateFrom: ' 2026-10-01 ',
      dateTo: ' 2026-10-31 ',
      type: 'expense',
      categoryId: 7,
    };

    expect(transactionFiltersFormMapper(model)).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      type: 'expense',
      categoryId: 7,
    });
  });

  it('no modifica el modelo original', (): void => {
    const model: TransactionFilters = {
      dateFrom: ' 2026-10-01 ',
      dateTo: '',
      type: null,
      categoryId: null,
    };

    const result: TransactionFilters = transactionFiltersFormMapper(model);

    expect(result).not.toBe(model);
    expect(model.dateFrom).toBe(' 2026-10-01 ');
  });
});
