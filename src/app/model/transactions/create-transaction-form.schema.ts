import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type CreateTransactionFormModel from '@model/transactions/create-transaction-form.model';
import normalizeTransactionAmount from '@model/transactions/normalize-transaction-amount';

export default function createTransactionFormSchema(
  path: SchemaPathTree<CreateTransactionFormModel>,
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
      // required() mostrará el error correspondiente.
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

  validate(path.concept, ({ value }) => {
    const concept: string = value().trim();

    if (Array.from(concept).length > 255) {
      return {
        kind: 'conceptTooLong',
        message: 'El concepto no puede superar los 255 caracteres.',
      };
    }

    return undefined;
  });

  required(path.date, {
    message: 'La fecha es obligatoria.',
  });

  validate(path.date, ({ value }) => {
    const date: string = value();

    if (date === '') {
      return undefined;
    }

    const match: RegExpMatchArray | null = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match === null) {
      return {
        kind: 'invalidDate',
        message: 'Introduce una fecha válida.',
      };
    }

    const year: number = Number(match[1]);
    const month: number = Number(match[2]);
    const day: number = Number(match[3]);

    const parsed: Date = new Date(0);
    parsed.setFullYear(year, month - 1, day);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() + 1 !== month ||
      parsed.getDate() !== day
    ) {
      return {
        kind: 'invalidDate',
        message: 'Introduce una fecha válida.',
      };
    }

    return undefined;
  });
}
