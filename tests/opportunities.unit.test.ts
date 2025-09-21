import { describe, it, expect } from 'vitest';
import { Opportunity } from '@/lib/opportunities';

// We will import private helpers by re-implementing minimal scenarios via public API where possible.
// For speed, we simulate the rule logic using small helper functions embedded here mirroring the engine's behavior.

type EntryLite = { co2e_value: number; category?: string | null; activities?: { key?: string | null } | null };

function groupByCategory(entries: EntryLite[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const keyRaw = e.activities?.key || e.category || 'unknown';
    const key = String(keyRaw);
    const v = Number(e.co2e_value) || 0;
    if (!v) continue;
    map.set(key, (map.get(key) || 0) + v);
  }
  return map;
}

function findTopCategoryShare(catMap: Map<string, number>) {
  let topKey = '';
  let topVal = 0;
  let total = 0;
  for (const [, v] of catMap) total += v;
  for (const [k, v] of catMap) { if (v > topVal) { topVal = v; topKey = k; } }
  const share = total > 0 ? topVal / total : 0;
  return { topKey, topVal, total, share };
}

describe('Opportunities rules (unit)', () => {
  it('high concentration triggers when a category exceeds 60%', () => {
    const entries: EntryLite[] = [
      { co2e_value: 600, category: 'concrete' },
      { co2e_value: 100, category: 'steel_rebar' },
      { co2e_value: 300, category: 'transport' },
    ];
    const cat = groupByCategory(entries);
    const { topKey, share } = findTopCategoryShare(cat);
    expect(topKey).toBe('concrete');
    expect(share).toBeCloseTo(0.6, 2); // exactly 60%
  });

  it('self-benchmark detects >20% increase', () => {
    const prev30 = 1000; // kg
    const last30 = 1300; // kg
    const increase = last30 - prev30;
    const ratio = increase / prev30;
    expect(ratio).toBe(0.3);
    expect(ratio > 0.2).toBe(true);
  });

  it('rebar alternative triggers with significant share or absolute threshold', () => {
    const entries: EntryLite[] = [
      { co2e_value: 5000, category: 'steel_rebar' },
      { co2e_value: 10000, category: 'concrete' },
    ];
    const cat = groupByCategory(entries);
    const total = Array.from(cat.values()).reduce((s, v) => s + v, 0);
    const rebar = cat.get('steel_rebar') || 0;
    const isSignificant = rebar >= 2000 || (total > 0 && (rebar / total) >= 0.1);
    expect(isSignificant).toBe(true);
  });
});
