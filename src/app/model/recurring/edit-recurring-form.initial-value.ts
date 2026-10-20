import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';
import type Recurring from '@model/recurring/recurring.model';

export default function editRecurringFormInitialValue(
  recurring: Recurring,
): CreateRecurringFormModel {
  return {
    type: recurring.type,
    categoryId: recurring.category_id,
    amount: recurring.amount,
    concept: recurring.concept,
    dayOfMonth: recurring.day_of_month,
    startDate: recurring.start_date,
    endDate: recurring.end_date ?? '',
  };
}
