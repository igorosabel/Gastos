/**
 * Muestra un importe decimal del backend en formato español.
 *
 * No convierte el dinero a number ni realiza redondeos.
 */
export function formatMoney(amount: string): string {
  const match: RegExpExecArray | null = /^(-?)(\d+)\.(\d{2})$/.exec(amount);

  if (match === null) {
    return '—';
  }

  const sign: string = match[1]!;
  const integer: string = match[2]!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals: string = match[3]!;

  return `${sign}${integer},${decimals} €`;
}

/**
 * Convierte una cadena decimal en céntimos exactos.
 */
function toCents(amount: string): bigint {
  if (!/^-?\d+\.\d{2}$/.test(amount)) {
    throw new Error('Importe decimal no válido.');
  }

  return BigInt(amount.replace('.', ''));
}

/**
 * Calcula un porcentaje entero sin utilizar float.
 * Se limita a 0-100 para su presentación como barra.
 */
export function percentageOf(amount: string, total: string): number {
  const amountCents: bigint = toCents(amount);
  const totalCents: bigint = toCents(total);

  if (amountCents <= 0n || totalCents <= 0n) {
    return 0;
  }

  const percentage: bigint = (amountCents * 100n) / totalCents;

  return Number(percentage > 100n ? 100n : percentage);
}
