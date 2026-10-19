/**
 * Devuelve el mes local actual en formato YYYY-MM.
 */
export function getCurrentMonth(today: Date = new Date()): string {
  const year: number = today.getFullYear();
  const month: string = String(today.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

/**
 * Desplaza un mes una cantidad determinada
 * de meses, incluyendo cambios de año.
 */
export function shiftMonth(month: string, offset: number): string {
  const parts: string[] = month.split('-');
  const year: number = Number(parts[0]);
  const monthNumber: number = Number(parts[1]);

  const date: Date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Etiqueta legible para un mes económico.
 */
export function monthLabel(month: string): string {
  const parts: string[] = month.split('-');
  const year: number = Number(parts[0]);
  const monthNumber: number = Number(parts[1]);

  const date: Date = new Date(Date.UTC(year, monthNumber - 1, 1));

  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
