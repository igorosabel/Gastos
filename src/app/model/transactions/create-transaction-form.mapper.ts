import type CreateTransactionRequest from '@interfaces/transactions/create-transaction-request.interface';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import normalizeTransactionAmount from '@model/transactions/normalize-transaction-amount';

export default function createTransactionFormMapper(
  model: CreateTransactionFormModel,
  spaceId: number,
): CreateTransactionRequest {
  if (model.categoryId === null) {
    throw new Error('La categoría es obligatoria.');
  }

  const amount: string | null = normalizeTransactionAmount(model.amount);

  if (amount === null || amount === '0.00') {
    throw new Error('El importe no es válido.');
  }

  return {
    spaceId,
    categoryId: model.categoryId,
    type: model.type,
    amount,
    concept: model.concept.trim() || null,
    date: model.date,
  };
}
