import { describe, it, expect } from 'vitest';

// This is a minimal smoke test for shared expectations used by unified flow.
// It doesn't hit Supabase; it just validates our kg normalization logic.

function normalizeToKg(raw: number, unitOut: string): number {
  if (unitOut === 'g') return raw / 1000;
  if (unitOut === 't' || unitOut === 'ton' || unitOut === 'tons') return raw * 1000;
  return raw; // assume kg
}

describe('normalizeToKg', () => {
  it('converts grams to kg', () => {
    expect(normalizeToKg(5000, 'g')).toBe(5);
  });
  it('converts tons to kg', () => {
    expect(normalizeToKg(3, 't')).toBe(3000);
    expect(normalizeToKg(2, 'ton')).toBe(2000);
    expect(normalizeToKg(1.5, 'tons')).toBe(1500);
  });
  it('passes through kg', () => {
    expect(normalizeToKg(12.34, 'kg')).toBe(12.34);
  });
});
