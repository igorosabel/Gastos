import normalizeTransactionAmount from '@model/transactions/normalize-transaction-amount';
import { describe, expect, it } from 'vitest';

describe('normalizeTransactionAmount', (): void => {
  it.each([
    ['33', '33.00'],
    ['33.5', '33.50'],
    ['33,5', '33.50'],
    ['33,50', '33.50'],
    ['95.40', '95.40'],
    ['0.50', '0.50'],
    [' 100 ', '100.00'],
    ['1000', '1000.00'],
  ])('normaliza %s como %s', (input: string, expected: string): void => {
    expect(normalizeTransactionAmount(input)).toBe(expected);
  });

  it.each(['', '-33', '12.345', '12,345', 'abc', '1.234,56', '33.', '00'])(
    'rechaza el formato %s',
    (input: string): void => {
      expect(normalizeTransactionAmount(input)).toBeNull();
    },
  );
});
