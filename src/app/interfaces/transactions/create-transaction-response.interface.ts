import type { ApiResponse } from '@interfaces/auth.interfaces';
import type Transaction from '@model/transactions/transaction.model';

export default interface CreateTransactionResponse extends ApiResponse {
  transaction: Transaction | null;
}
