import type { ApiResponse } from '@interfaces/auth.interfaces';
import type Recurring from '@model/recurring/recurring.model';

export default interface RecurringResponse extends ApiResponse {
  recurring: Recurring[];
}
