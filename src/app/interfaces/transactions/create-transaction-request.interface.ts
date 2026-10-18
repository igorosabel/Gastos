export default interface CreateTransactionRequest {
  spaceId: number;
  categoryId: number;
  type: 'income' | 'expense';
  amount: string;
  concept: string | null;
  date: string;
}
