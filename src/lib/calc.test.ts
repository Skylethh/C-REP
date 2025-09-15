import { describe, it, expect } from 'vitest';
import { pickFactorByCategory, convertAmount, computeCo2e } from './calc';

describe('calc utils', () => {
  it('picks latest factor by category and region', () => {
    const factors = [
      { category: 'energy', region: 'global', unit_in: 'kWh', unit_out: 'kg', value: 0.2, valid_from: '2023-01-01' },
      { category: 'energy', region: 'global', unit_in: 'kWh', unit_out: 'kg', value: 0.25, valid_from: '2024-01-01' },
      { category: 'transport', region: 'global', unit_in: 'km', unit_out: 'kg', value: 0.12, valid_from: '2024-01-01' },
    ];
    const f = pickFactorByCategory(factors as any, 'energy', 'global');
    expect(f).toBeTruthy();
    expect(f!.value).toBe(0.25);
  });

  it('converts units using conversions table', () => {
    const convs = [
      { from_unit: 'g', to_unit: 'kg', multiplier: 0.001 },
      { from_unit: 'kg', to_unit: 'g', multiplier: 1000 },
    ];
    expect(convertAmount(1000, 'g', 'kg', convs)).toBeCloseTo(1);
    expect(convertAmount(2, 'kg', 'g', convs)).toBe(2000);
    expect(convertAmount(1, 'L', 'kg', convs)).toBeNull();
  });

  it('computes co2e with normalization', () => {
    const factor = { unit_in: 'kWh', unit_out: 'kg', value: 0.25 };
    const convs: any[] = [];
    const res = computeCo2e(10, 'kWh', factor, convs);
    expect(res).toBeTruthy();
    expect(res!.value).toBeCloseTo(2.5);
    expect(res!.unit).toBe('kg');
  });

  it('computes co2e with conversion', () => {
    const factor = { unit_in: 'kg', unit_out: 'kg', value: 1.3 };
    const convs = [{ from_unit: 'g', to_unit: 'kg', multiplier: 0.001 }];
    const res = computeCo2e(500, 'g', factor, convs);
    expect(res).toBeTruthy();
    expect(res!.value).toBeCloseTo(0.65);
    expect(res!.unit).toBe('kg');
  });

  it('returns null if missing conversion', () => {
    const factor = { unit_in: 'kg', unit_out: 'kg', value: 1 };
    const res = computeCo2e(1, 'L', factor, []);
    expect(res).toBeNull();
  });
});


