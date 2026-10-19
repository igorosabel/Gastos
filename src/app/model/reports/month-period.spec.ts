import { getCurrentMonth, monthLabel, shiftMonth } from '@model/reports/month-period';
import { describe, expect, it } from 'vitest';

describe('Periodos mensuales de informes', (): void => {
  it('calcula el mes local actual', (): void => {
    const date: Date = new Date(2026, 9, 19);

    expect(getCurrentMonth(date)).toBe('2026-10');
  });

  it('desplaza meses dentro del mismo año', (): void => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09');
    expect(shiftMonth('2026-10', -11)).toBe('2025-11');
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
  });

  it('gestiona los cambios de año', (): void => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-10', -12)).toBe('2025-10');
  });

  it('genera etiquetas de mes en español', (): void => {
    expect(monthLabel('2026-10')).toContain('octubre');
    expect(monthLabel('2026-10')).toContain('2026');
  });
});
