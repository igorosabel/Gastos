/**
 * Convierte un importe escrito por el usuario al formato
 * decimal exigido por ApiGastos.
 *
 * No utiliza cálculos en coma flotante.
 * Devuelve null cuando el formato no es válido.
 */
export default function normalizeTransactionAmount(input: string): string | null {
  const value: string = input.trim();

  const match: RegExpExecArray | null = /^(0|[1-9]\d*)(?:[.,](\d{1,2}))?$/.exec(value);

  if (match === null) {
    return null;
  }

  const integer: string = match[1]!;
  const decimals: string = (match[2] ?? '').padEnd(2, '0');

  return `${integer}.${decimals}`;
}
