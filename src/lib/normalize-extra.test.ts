import { describe, it, expect } from 'vitest';

// Standalone utility mirroring server normalization branches used in unified flow
function normalizeToKg(raw: number, unitOut: string): number {
  if (unitOut === 'g') return raw / 1000;
  if (unitOut === 't' || unitOut === 'ton' || unitOut === 'tons') return raw * 1000;
  return raw; // already kg
}

describe('normalizeToKg (unified flow parity)', () => {
  it('g → kg', () => {
    expect(normalizeToKg(1234, 'g')).toBeCloseTo(1.234);
  });
  it('t → kg', () => {
    expect(normalizeToKg(2.5, 't')).toBe(2500);
  });
  it('kg → kg', () => {
    expect(normalizeToKg(7.89, 'kg')).toBe(7.89);
  });
});
