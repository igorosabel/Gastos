import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type CreateRecurringFormModel from '@model/recurring/create-recurring-form.model';
import normalizeTransactionAmount from '@model/transactions/normalize-transaction-amount';

function isValidAccountingDate(value: string): boolean {
  const match: RegExpMatchArray | null = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match === null) {
    return false;
  }

  const year: number = Number(match[1]);
  const month: number = Number(match[2]);
  const day: number = Number(match[3]);

  const parsed: Date = new Date(0);
  parsed.setFullYear(year, month - 1, day);

  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  );
}

export default function createRecurringFormSchema(
  path: SchemaPathTree<CreateRecurringFormModel>,
): void {
  required(path.categoryId, {
    message: 'Selecciona una categoría.',
  });

  required(path.amount, {
    message: 'El importe es obligatorio.',
  });

  validate(path.amount, ({ value }) => {
    const amount: string = value().trim();

    if (amount === '') {
      return undefined;
    }

    const normalized: string | null = normalizeTransactionAmount(amount);

    if (normalized === null) {
      return {
        kind: 'invalidAmount',
        message: 'Introduce un importe válido, por ejemplo 33 o 33,50.',
      };
    }

    if (normalized === '0.00') {
      return {
        kind: 'zeroAmount',
        message: 'El importe debe ser mayor que cero.',
      };
    }

    return undefined;
  });

  required(path.concept, {
    message: 'El concepto es obligatorio.',
  });

  validate(path.concept, ({ value }) => {
    const concept: string = value().trim();

    if (concept === '') {
      return {
        kind: 'blankConcept',
        message: 'El concepto no puede contener solo espacios.',
      };
    }

    if (Array.from(concept).length > 255) {
      return {
        kind: 'conceptTooLong',
        message: 'El concepto no puede superar los 255 caracteres.',
      };
    }

    return undefined;
  });

  required(path.dayOfMonth, {
    message: 'Selecciona el día del mes.',
  });

  validate(path.dayOfMonth, ({ value }) => {
    const day: number | null = value();

    if (day === null) {
      return undefined;
    }

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return {
        kind: 'invalidDayOfMonth',
        message: 'El día del mes debe estar entre 1 y 31.',
      };
    }

    return undefined;
  });

  required(path.startDate, {
    message: 'La fecha de inicio es obligatoria.',
  });

  validate(path.startDate, ({ value }) => {
    const date: string = value();

    if (date === '') {
      return undefined;
    }

    if (!isValidAccountingDate(date)) {
      return {
        kind: 'invalidStartDate',
        message: 'Introduce una fecha de inicio válida.',
      };
    }

    return undefined;
  });

  validate(path.endDate, ({ value, valueOf }) => {
    const endDate: string = value();
    const startDate: string = valueOf(path.startDate);

    if (endDate === '') {
      return undefined;
    }

    if (!isValidAccountingDate(endDate)) {
      return {
        kind: 'invalidEndDate',
        message: 'Introduce una fecha de fin válida.',
      };
    }

    if (isValidAccountingDate(startDate) && endDate < startDate) {
      return {
        kind: 'invalidDateRange',
        message: 'La fecha de fin no puede ser anterior a la de inicio.',
      };
    }

    return undefined;
  });
}
