export default interface TransactionFilters {
  dateFrom: string;
  dateTo: string;
  type: 'income' | 'expense' | null;
  categoryId: number | null;
}
