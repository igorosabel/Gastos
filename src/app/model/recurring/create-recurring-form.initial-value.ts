import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';

export default function createRecurringFormInitialValue(
  today: Date = new Date(),
): CreateRecurringFormModel {
  const year: number = today.getFullYear();
  const month: string = String(today.getMonth() + 1).padStart(2, '0');
  const day: string = String(today.getDate()).padStart(2, '0');

  return {
    type: 'expense',
    categoryId: null,
    amount: '',
    concept: '',
    dayOfMonth: null,
    startDate: `${year}-${month}-${day}`,
    endDate: '',
  };
}
