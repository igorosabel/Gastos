import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import type Transaction from '@model/transactions/transaction.model';

export default function editTransactionFormInitialValue(
  transaction: Transaction,
): CreateTransactionFormModel {
  return {
    type: transaction.type,
    categoryId: transaction.category_id,
    amount: transaction.amount,
    concept: transaction.concept ?? '',
    date: transaction.date,
  };
}
