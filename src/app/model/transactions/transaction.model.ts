export default interface Transaction {
  id: number;
  space_id: number;
  user_id: number;
  category_id: number;
  type: 'income' | 'expense';
  amount: string;
  concept: string | null;
  date: string;
}
