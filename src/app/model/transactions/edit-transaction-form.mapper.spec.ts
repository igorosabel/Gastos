import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import editTransactionFormInitialValue from '@model/transactions/edit-transaction-form.initial-value';
import editTransactionFormMapper from '@model/transactions/edit-transaction-form.mapper';
import type Transaction from '@model/transactions/transaction.model';
import { describe, expect, it } from 'vitest';

describe('Formulario de edición de movimientos', (): void => {
  const transaction: Transaction = {
    id: 31,
    space_id: 12,
    user_id: 1,
    category_id: 7,
    type: 'expense',
    amount: '95.40',
    concept: 'Electricidad',
    date: '2026-10-20',
  };

  it('inicializa los datos actuales', (): void => {
    expect(editTransactionFormInitialValue(transaction)).toEqual({
      type: 'expense',
      categoryId: 7,
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-20',
    });
  });

  it('convierte un concepto null en campo vacío', (): void => {
    expect(
      editTransactionFormInitialValue({
        ...transaction,
        concept: null,
      }).concept,
    ).toBe('');
  });

  it('construye la petición de actualización', (): void => {
    const model: CreateTransactionFormModel = {
      type: 'income',
      categoryId: 9,
      amount: ' 100.00 ',
      concept: ' Abono ',
      date: '2026-10-21',
    };

    expect(editTransactionFormMapper(model, transaction)).toEqual({
      spaceId: 12,
      transactionId: 31,
      categoryId: 9,
      type: 'income',
      amount: '100.00',
      concept: 'Abono',
      date: '2026-10-21',
    });
  });

  it('convierte un concepto vacío en null', (): void => {
    const model: CreateTransactionFormModel = editTransactionFormInitialValue(transaction);

    expect(editTransactionFormMapper({ ...model, concept: '   ' }, transaction).concept).toBeNull();
  });

  it('rechaza la ausencia de categoría', (): void => {
    const model: CreateTransactionFormModel = editTransactionFormInitialValue(transaction);

    expect((): void => {
      editTransactionFormMapper({ ...model, categoryId: null }, transaction);
    }).toThrow('La categoría es obligatoria.');
  });
});
