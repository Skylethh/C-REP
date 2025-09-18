export function formatCo2eKg(valueKg: number): { value: string; unit: 'g'|'kg'|'t' } {
  if (!Number.isFinite(valueKg)) return { value: '-', unit: 'kg' } as any;
  if (valueKg < 1) return { value: (valueKg * 1000).toFixed(3), unit: 'g' };
  if (valueKg >= 1000) return { value: (valueKg / 1000).toFixed(3), unit: 't' };
  return { value: valueKg.toFixed(3), unit: 'kg' };
}

// Always display in tons of CO2 equivalent (tCO2e) given a value in kilograms (kg)
export function formatCo2eTons(valueKg: number, fractionDigits = 3): { value: string; unit: 'tCO2e' } {
  if (!Number.isFinite(valueKg)) return { value: '-', unit: 'tCO2e' } as const;
  const t = valueKg / 1000;
  return { value: t.toFixed(fractionDigits), unit: 'tCO2e' } as const;
}



