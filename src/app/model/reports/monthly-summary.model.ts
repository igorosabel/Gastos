export default interface MonthlySummary {
  space_id: number;
  month: string;
  income: string;
  expense: string;
  balance: string;
  income_count: number;
  expense_count: number;
  transaction_count: number;
}
