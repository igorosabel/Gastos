import type { ApiResponse } from '@interfaces/auth.interfaces';
import type Recurring from '@model/recurring/recurring.model';

export default interface SetRecurringStatusResponse extends ApiResponse {
  recurring: Recurring | null;
}
