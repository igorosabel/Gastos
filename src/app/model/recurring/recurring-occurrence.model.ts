export default interface RecurringOccurrence {
  id: number;
  space_id: number;
  recurring_id: number;
  period: string;
  scheduled_date: string;
  status: 'pending' | 'confirmed' | 'skipped';
  category_id: number;
  type: 'income' | 'expense';
  concept: string;
  amount: string;
  transaction_id: number | null;
  resolved_at: string | null;
}
