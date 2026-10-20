import type CreateRecurringRequest from '@interfaces/recurring/create-recurring-request.interface';

export default interface UpdateRecurringRequest extends CreateRecurringRequest {
  recurringId: number;
}
