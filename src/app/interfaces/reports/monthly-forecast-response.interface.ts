import type { ApiResponse } from '@interfaces/auth.interfaces';
import type MonthlySummary from '@model/reports/monthly-summary.model';

export default interface MonthlyForecastResponse extends ApiResponse {
  report: {
    space_id: number;
    month: string;
    actual: MonthlySummary;
    projected: {
      income: string;
      expense: string;
      balance: string;
    };
  };
}
