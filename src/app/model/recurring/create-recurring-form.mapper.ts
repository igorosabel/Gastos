import type CreateRecurringRequest from '@interfaces/recurring/create-recurring-request.interface';
import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';
import normalizeTransactionAmount from '@model/transactions/normalize-transaction-amount';

export default function createRecurringFormMapper(
  model: CreateRecurringFormModel,
  spaceId: number,
): CreateRecurringRequest {
  if (model.categoryId === null) {
    throw new Error('La categoría es obligatoria.');
  }

  const amount: string | null = normalizeTransactionAmount(model.amount);

  if (amount === null || amount === '0.00') {
    throw new Error('El importe no es válido.');
  }

  if (
    model.dayOfMonth === null ||
    !Number.isInteger(model.dayOfMonth) ||
    model.dayOfMonth < 1 ||
    model.dayOfMonth > 31
  ) {
    throw new Error('El día del mes no es válido.');
  }

  const concept: string = model.concept.trim();

  if (concept.length === 0) {
    throw new Error('El concepto es obligatorio.');
  }

  return {
    spaceId,
    categoryId: model.categoryId,
    type: model.type,
    amount,
    concept,
    dayOfMonth: model.dayOfMonth,
    startDate: model.startDate,
    endDate: model.endDate || null,
  };
}
