import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';

/**
 * Devuelve la fecha local actual en formato contable YYYY-MM-DD.
 * No utiliza toISOString() para evitar cambios de día por zona horaria.
 */
export default function createTransactionFormInitialValue(
  today: Date = new Date(),
): CreateTransactionFormModel {
  const year: number = today.getFullYear();
  const month: string = String(today.getMonth() + 1).padStart(2, '0');
  const day: string = String(today.getDate()).padStart(2, '0');

  return {
    type: 'expense',
    categoryId: null,
    amount: '',
    concept: '',
    date: `${year}-${month}-${day}`,
  };
}
