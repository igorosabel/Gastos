import { formatMoney, percentageOf } from '@model/reports/money';
import { describe, expect, it } from 'vitest';

describe('Utilidades monetarias', (): void => {
  it.each([
    ['0.00', '0,00 €'],
    ['95.40', '95,40 €'],
    ['2500.00', '2.500,00 €'],
    ['1234567.89', '1.234.567,89 €'],
    ['-1234.56', '-1.234,56 €'],
  ])('formatea %s como %s', (input: string, expected: string): void => {
    expect(formatMoney(input)).toBe(expected);
  });

  it('no interpreta importes mal formados', (): void => {
    expect(formatMoney('95,40')).toBe('—');
    expect(formatMoney('95.4')).toBe('—');
  });

  it('calcula porcentajes exactos con bigint', (): void => {
    expect(percentageOf('425.60', '1800.00')).toBe(23);
    expect(percentageOf('50.00', '200.00')).toBe(25);
    expect(percentageOf('200.00', '200.00')).toBe(100);
  });

  it('controla importes y totales cero', (): void => {
    expect(percentageOf('0.00', '200.00')).toBe(0);
    expect(percentageOf('100.00', '0.00')).toBe(0);
  });

  it('limita visualmente el porcentaje al cien por cien', (): void => {
    expect(percentageOf('300.00', '200.00')).toBe(100);
  });

  it('admite importes superiores al rango seguro de number', (): void => {
    expect(formatMoney('9007199254740993.25')).toBe('9.007.199.254.740.993,25 €');

    expect(percentageOf('9007199254740993.25', '18014398509481986.50')).toBe(50);
  });
});
