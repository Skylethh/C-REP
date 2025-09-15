import type { PostgrestSingleResponse } from '@supabase/supabase-js';

export type EmissionFactor = {
  unit_in: string;
  unit_out: string;
  value: number | string;
};

export function pickFactorByCategory<T extends { category?: string; region?: string; valid_from?: string }>(
  factors: Array<EmissionFactor & T>,
  category: string,
  region: string = 'global'
): EmissionFactor | null {
  const filtered = factors.filter((f) => (f as any).category === category && (f as any).region === region);
  if (filtered.length === 0) return null;
  // newest by valid_from desc
  filtered.sort((a: any, b: any) => (new Date(b.valid_from || 0).getTime() - new Date(a.valid_from || 0).getTime()));
  const f = filtered[0];
  return { unit_in: f.unit_in, unit_out: f.unit_out, value: Number(f.value) };
}

export function convertAmount(amount: number, fromUnit: string, toUnit: string, conversions: Array<{ from_unit: string; to_unit: string; multiplier: number | string }>): number | null {
  if (fromUnit === toUnit) return amount;
  const found = conversions.find((c) => c.from_unit === fromUnit && c.to_unit === toUnit);
  if (!found) return null;
  const mult = Number(found.multiplier);
  return amount * mult;
}

export function computeCo2e(
  amount: number,
  providedUnit: string,
  factor: EmissionFactor,
  conversions: Array<{ from_unit: string; to_unit: string; multiplier: number | string }>
): { value: number; unit: string } | null {
  let normalized = amount;
  if (providedUnit !== factor.unit_in) {
    const conv = convertAmount(amount, providedUnit, factor.unit_in, conversions);
    if (conv == null) return null;
    normalized = conv;
  }
  const value = normalized * Number(factor.value);
  return { value, unit: factor.unit_out };
}


