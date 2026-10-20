import type { ApiResponse } from '@interfaces/auth.interfaces';
import type RecurringOccurrence from '@model/recurring/recurring-occurrence.model';

export default interface RecurringOccurrencesResponse extends ApiResponse {
  occurrences: RecurringOccurrence[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
