export default interface MonthlyCategory {
  category_id: number;
  parent_id: number | null;
  name: string;
  type: 'income' | 'expense';
  amount: string;
  transaction_count: number;
}
