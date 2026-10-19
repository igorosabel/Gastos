import type { ApiResponse } from '@interfaces/auth.interfaces';
import type MonthlySummary from '@model/reports/monthly-summary.model';

export default interface EvolutionResponse extends ApiResponse {
  report: {
    space_id: number;
    month_from: string;
    month_to: string;
    months: MonthlySummary[];
  };
}
