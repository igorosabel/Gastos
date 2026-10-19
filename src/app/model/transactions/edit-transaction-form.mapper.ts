import type UpdateTransactionRequest from '@interfaces/transactions/update-transaction-request.interface';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import normalizeTransactionAmount from '@model/transactions/normalize-transaction-amount';
import type Transaction from '@model/transactions/transaction.model';

export default function editTransactionFormMapper(
  model: CreateTransactionFormModel,
  transaction: Transaction,
): UpdateTransactionRequest {
  if (model.categoryId === null) {
    throw new Error('La categoría es obligatoria.');
  }

  const amount: string | null = normalizeTransactionAmount(model.amount);

  if (amount === null || amount === '0.00') {
    throw new Error('El importe no es válido.');
  }

  return {
    spaceId: transaction.space_id,
    transactionId: transaction.id,
    categoryId: model.categoryId,
    type: model.type,
    amount,
    concept: model.concept.trim() || null,
    date: model.date,
  };
}
