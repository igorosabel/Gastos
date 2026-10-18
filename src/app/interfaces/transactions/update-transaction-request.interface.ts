export default interface UpdateTransactionRequest {
  spaceId: number;
  transactionId: number;
  categoryId: number;
  type: 'income' | 'expense';
  amount: string;
  concept: string | null;
  date: string;
}
