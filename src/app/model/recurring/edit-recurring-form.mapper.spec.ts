import editRecurringFormInitialValue from '@model/recurring/edit-recurring-form.initial-value';
import editRecurringFormMapper from '@model/recurring/edit-recurring-form.mapper';
import type Recurring from '@model/recurring/recurring.model';
import { describe, expect, it } from 'vitest';

describe('Mapper de edición de recurrentes', (): void => {
  const recurring: Recurring = {
    id: 50,
    space_id: 2,
    category_id: 20,
    type: 'expense',
    amount: '95.40',
    concept: 'Electricidad',
    day_of_month: 20,
    start_date: '2026-10-01',
    end_date: null,
    active: false,
  };

  it('inicializa el formulario con los datos existentes', (): void => {
    expect(editRecurringFormInitialValue(recurring)).toEqual({
      type: 'expense',
      categoryId: 20,
      amount: '95.40',
      concept: 'Electricidad',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: '',
    });
  });

  it('conserva la fecha final cuando existe', (): void => {
    expect(
      editRecurringFormInitialValue({
        ...recurring,
        end_date: '2027-12-31',
      }).endDate,
    ).toBe('2027-12-31');
  });

  it('genera el contrato de actualización', (): void => {
    expect(
      editRecurringFormMapper(
        {
          ...editRecurringFormInitialValue(recurring),
          amount: '33,5',
          concept: ' Electricidad nueva ',
        },
        recurring,
      ),
    ).toEqual({
      spaceId: 2,
      recurringId: 50,
      categoryId: 20,
      type: 'expense',
      amount: '33.50',
      concept: 'Electricidad nueva',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: null,
    });
  });

  it('no envía el estado activo', (): void => {
    const request = editRecurringFormMapper(editRecurringFormInitialValue(recurring), recurring);

    expect(request).not.toHaveProperty('active');
  });

  it('rechaza un importe inválido', (): void => {
    expect((): void => {
      editRecurringFormMapper(
        {
          ...editRecurringFormInitialValue(recurring),
          amount: '0',
        },
        recurring,
      );
    }).toThrow('El importe no es válido.');
  });

  it('rechaza un día fuera del intervalo', (): void => {
    expect((): void => {
      editRecurringFormMapper(
        {
          ...editRecurringFormInitialValue(recurring),
          dayOfMonth: 32,
        },
        recurring,
      );
    }).toThrow('El día del mes no es válido.');
  });
});
