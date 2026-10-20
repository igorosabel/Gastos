export default interface CreateRecurringRequest {
  spaceId: number;
  categoryId: number;
  type: 'income' | 'expense';
  amount: string;
  concept: string;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
}
