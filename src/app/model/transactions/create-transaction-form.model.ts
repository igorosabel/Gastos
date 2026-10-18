export default interface CreateTransactionFormModel {
  type: 'income' | 'expense';
  categoryId: number | null;
  amount: string;
  concept: string;
  date: string;
}
