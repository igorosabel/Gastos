import type UpdateRecurringRequest from '@interfaces/recurring/update-recurring-request.interface';
import createRecurringFormMapper from '@model/recurring/create-recurring-form.mapper';
import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';
import type Recurring from '@model/recurring/recurring.model';

export default function editRecurringFormMapper(
  model: CreateRecurringFormModel,
  recurring: Recurring,
): UpdateRecurringRequest {
  return {
    ...createRecurringFormMapper(model, recurring.space_id),
    recurringId: recurring.id,
  };
}
