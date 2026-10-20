import createRecurringFormInitialValue from '@model/recurring/create-recurring-form.initial-value';
import createRecurringFormMapper from '@model/recurring/create-recurring-form.mapper';
import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';
import { describe, expect, it } from 'vitest';

describe('Formulario de recurrentes', (): void => {
  const validModel: CreateRecurringFormModel = {
    type: 'expense',
    categoryId: 20,
    amount: '33',
    concept: ' Electricidad ',
    dayOfMonth: 20,
    startDate: '2026-10-01',
    endDate: '',
  };

  it('inicializa una plantilla mensual vacía', (): void => {
    expect(createRecurringFormInitialValue(new Date(2026, 9, 19))).toEqual({
      type: 'expense',
      categoryId: null,
      amount: '',
      concept: '',
      dayOfMonth: null,
      startDate: '2026-10-19',
      endDate: '',
    });
  });

  it('normaliza el importe y la descripción', (): void => {
    expect(createRecurringFormMapper(validModel, 2)).toEqual({
      spaceId: 2,
      categoryId: 20,
      type: 'expense',
      amount: '33.00',
      concept: 'Electricidad',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: null,
    });
  });

  it('acepta un importe decimal con coma', (): void => {
    expect(createRecurringFormMapper({ ...validModel, amount: '33,5' }, 2).amount).toBe('33.50');
  });

  it('conserva una fecha final informada', (): void => {
    expect(createRecurringFormMapper({ ...validModel, endDate: '2027-12-31' }, 2).endDate).toBe(
      '2027-12-31',
    );
  });

  it('no modifica el modelo original', (): void => {
    createRecurringFormMapper(validModel, 2);

    expect(validModel.amount).toBe('33');
    expect(validModel.concept).toBe(' Electricidad ');
    expect(validModel.endDate).toBe('');
  });

  it('rechaza una categoría ausente', (): void => {
    expect((): void => {
      createRecurringFormMapper({ ...validModel, categoryId: null }, 2);
    }).toThrow('La categoría es obligatoria.');
  });

  it.each([0, 32, 2.5])('rechaza el día del mes %i', (day: number): void => {
    expect((): void => {
      createRecurringFormMapper({ ...validModel, dayOfMonth: day }, 2);
    }).toThrow('El día del mes no es válido.');
  });

  it('rechaza un importe cero', (): void => {
    expect((): void => {
      createRecurringFormMapper({ ...validModel, amount: '0.00' }, 2);
    }).toThrow('El importe no es válido.');
  });

  it('rechaza un concepto vacío', (): void => {
    expect((): void => {
      createRecurringFormMapper({ ...validModel, concept: '   ' }, 2);
    }).toThrow('El concepto es obligatorio.');
  });
});
