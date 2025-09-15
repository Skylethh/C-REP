export function formatCo2eKg(valueKg: number): { value: string; unit: 'g'|'kg'|'t' } {
  if (!Number.isFinite(valueKg)) return { value: '-', unit: 'kg' } as any;
  if (valueKg < 1) return { value: (valueKg * 1000).toFixed(3), unit: 'g' };
  if (valueKg >= 1000) return { value: (valueKg / 1000).toFixed(3), unit: 't' };
  return { value: valueKg.toFixed(3), unit: 'kg' };
}


