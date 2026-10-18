import type { ApiResponse } from '@interfaces/auth.interfaces';
import type Transaction from '@model/transactions/transaction.model';

export default interface TransactionsResponse extends ApiResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
