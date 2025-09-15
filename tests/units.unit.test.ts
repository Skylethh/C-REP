import { describe, it, expect } from 'vitest';
import { formatCo2eKg } from '../src/lib/units';

describe('formatCo2eKg', () => {
  it('formats grams for <1 kg', () => {
    expect(formatCo2eKg(0.5)).toEqual({ value: '500.000', unit: 'g' });
  });
  it('formats kg in range', () => {
    expect(formatCo2eKg(123.4567)).toEqual({ value: '123.457', unit: 'kg' });
  });
  it('formats tonnes for >=1000 kg', () => {
    expect(formatCo2eKg(28000)).toEqual({ value: '28.000', unit: 't' });
  });
});


