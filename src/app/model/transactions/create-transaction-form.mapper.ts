import type CreateTransactionRequest from '@interfaces/transactions/create-transaction-request.interface';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';

export default function createTransactionFormMapper(
  model: CreateTransactionFormModel,
  spaceId: number,
): CreateTransactionRequest {
  if (model.categoryId === null) {
    throw new Error('La categoría es obligatoria.');
  }

  return {
    spaceId,
    categoryId: model.categoryId,
    type: model.type,
    amount: model.amount.trim(),
    concept: model.concept.trim() || null,
    date: model.date,
  };
}
