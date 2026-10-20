import type { ApiResponse } from '@interfaces/auth.interfaces';
import type RecurringOccurrence from '@model/recurring/recurring-occurrence.model';

export default interface ResolveRecurringOccurrenceResponse extends ApiResponse {
  occurrence: RecurringOccurrence | null;
}
