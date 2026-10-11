/** Parses a number typed with either a decimal point or a decimal comma. */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}
