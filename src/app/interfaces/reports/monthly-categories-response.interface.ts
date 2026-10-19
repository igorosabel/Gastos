import type { ApiResponse } from '@interfaces/auth.interfaces';
import type MonthlyCategory from '@model/reports/monthly-category.model';

export default interface MonthlyCategoriesResponse extends ApiResponse {
  report: {
    space_id: number;
    month: string;
    categories: MonthlyCategory[];
  };
}
