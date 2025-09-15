import { describe, it, expect } from 'vitest';
import { pickFactor, EmissionFactor } from '../src/lib/factors';

const F = (over: Partial<EmissionFactor>): EmissionFactor => ({
  category: 'x', region: 'global', unit_in: 'kg', unit_out: 'kg', value: 1, valid_from: '2020-01-01', ...over,
});

describe('pickFactor', () => {
  it('prefers activity factor when available', () => {
    const act = [F({ valid_from: '2024-01-01', value: 2 })];
    const cat = [F({ valid_from: '2024-01-01', value: 1 })];
    const f = pickFactor(act, cat, '2024-06-01');
    expect(f?.value).toBe(2);
  });
  it('falls back to category when no activity factor', () => {
    const cat = [F({ valid_from: '2023-01-01', value: 3 })];
    const f = pickFactor([], cat, '2023-05-01');
    expect(f?.value).toBe(3);
  });
  it('uses latest valid_from before date', () => {
    const cat = [F({ valid_from: '2022-01-01', value: 1 }), F({ valid_from: '2023-05-01', value: 4 })];
    const f = pickFactor([], cat, '2023-06-01');
    expect(f?.value).toBe(4);
  });
  it('returns null when nothing matches', () => {
    const f = pickFactor([], [], '2023-01-01');
    expect(f).toBeNull();
  });
});


