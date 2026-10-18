import type UpdateTransactionRequest from '@interfaces/transactions/update-transaction-request.interface';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import type Transaction from '@model/transactions/transaction.model';

export default function editTransactionFormMapper(
  model: CreateTransactionFormModel,
  transaction: Transaction,
): UpdateTransactionRequest {
  if (model.categoryId === null) {
    throw new Error('La categoría es obligatoria.');
  }

  return {
    spaceId: transaction.space_id,
    transactionId: transaction.id,
    categoryId: model.categoryId,
    type: model.type,
    amount: model.amount.trim(),
    concept: model.concept.trim() || null,
    date: model.date,
  };
}
