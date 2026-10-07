export function formatCode(prefix: 'EMP' | 'MB' | 'BRK', num: number): string {
  const padded = num.toString().padStart(6, '0');
  return `${prefix}-${padded}`;
}
