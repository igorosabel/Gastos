import createTransactionFormInitialValue from '@model/transactions/create-transaction-form.initial-value';
import createTransactionFormMapper from '@model/transactions/create-transaction-form.mapper';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import { describe, expect, it } from 'vitest';

describe('Formulario de creación de movimientos', (): void => {
  it('inicializa un gasto con la fecha local', (): void => {
    const date: Date = new Date(2026, 9, 18);

    expect(createTransactionFormInitialValue(date)).toEqual({
      type: 'expense',
      categoryId: null,
      amount: '',
      concept: '',
      date: '2026-10-18',
    });
  });

  it('prepara la petición conservando el importe decimal', (): void => {
    const model: CreateTransactionFormModel = {
      type: 'expense',
      categoryId: 7,
      amount: ' 95.40 ',
      concept: ' Electricidad ',
      date: '2026-10-20',
    };

    expect(createTransactionFormMapper(model, 12)).toEqual({
      spaceId: 12,
      categoryId: 7,
      type: 'expense',
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-20',
    });
  });

  it('convierte el concepto vacío en null', (): void => {
    const model: CreateTransactionFormModel = {
      type: 'income',
      categoryId: 8,
      amount: '100.00',
      concept: '   ',
      date: '2026-10-20',
    };

    expect(createTransactionFormMapper(model, 12).concept).toBeNull();
  });

  it('rechaza preparar una petición sin categoría', (): void => {
    const model: CreateTransactionFormModel = {
      type: 'expense',
      categoryId: null,
      amount: '10.00',
      concept: '',
      date: '2026-10-20',
    };

    expect((): void => {
      createTransactionFormMapper(model, 12);
    }).toThrow('La categoría es obligatoria.');
  });
});
