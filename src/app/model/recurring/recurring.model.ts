export default interface Recurring {
  id: number;
  space_id: number;
  category_id: number;
  type: 'income' | 'expense';
  amount: string;
  concept: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
}
