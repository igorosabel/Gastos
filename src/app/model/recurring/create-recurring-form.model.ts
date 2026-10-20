export default interface CreateRecurringFormModel {
  type: 'income' | 'expense';
  categoryId: number | null;
  amount: string;
  concept: string;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string;
}
