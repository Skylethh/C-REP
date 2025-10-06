import { describe, it, expect } from 'vitest';
import { generateOpportunitiesFromEntries, type OpportunityRuleEntry } from '@/lib/opportunities';

const NOW = new Date('2025-10-06T00:00:00Z');

let counter = 0;
function makeEntry(partial: Partial<OpportunityRuleEntry>): OpportunityRuleEntry {
  counter += 1;
  return {
    id: partial.id ?? `entry-${counter}`,
    co2eKg: partial.co2eKg ?? 0,
    date: partial.date ?? NOW,
    rawCategory: partial.rawCategory ?? 'beton',
    normalizedCategory: partial.normalizedCategory ?? 'beton',
    amountTons: partial.amountTons ?? null,
  };
}

describe('Opportunities engine rules', () => {
  it('creates a concentration opportunity when a category exceeds 50% of emissions', () => {
    const entries: OpportunityRuleEntry[] = [
      makeEntry({ co2eKg: 600, rawCategory: 'concrete_c25_30', normalizedCategory: 'concrete_c25_30' }),
      makeEntry({ co2eKg: 100, rawCategory: 'steel_rebar', normalizedCategory: 'steel_rebar' }),
      makeEntry({ co2eKg: 200, rawCategory: 'transport', normalizedCategory: 'transport' }),
    ];

    const opps = generateOpportunitiesFromEntries(entries, NOW);
    const concentration = opps.find((o) => o.type === 'CONCENTRATION');
    expect(concentration).toBeDefined();
    expect((concentration?.metadata as any)?.percentage).toBeGreaterThan(50);
  });

  it('detects upward emission trend greater than 20%', () => {
    const entries: OpportunityRuleEntry[] = [
      makeEntry({ co2eKg: 500, date: new Date('2025-09-20T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      makeEntry({ co2eKg: 400, date: new Date('2025-09-25T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      makeEntry({ co2eKg: 250, date: new Date('2025-08-18T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      makeEntry({ co2eKg: 200, date: new Date('2025-08-28T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
    ];

    const opps = generateOpportunitiesFromEntries(entries, NOW);
    const trend = opps.find((o) => o.type === 'TREND_INCREASE');
    expect(trend).toBeDefined();
    expect((trend?.metadata as any)?.increase_percentage).toBeGreaterThanOrEqual(20);
  });

  it('flags anomalies that sit above mean + 3*std for a category', () => {
    const baseDates = [
      new Date('2025-09-01T00:00:00Z'),
      new Date('2025-09-03T00:00:00Z'),
      new Date('2025-09-05T00:00:00Z'),
      new Date('2025-09-07T00:00:00Z'),
      new Date('2025-09-09T00:00:00Z'),
      new Date('2025-09-11T00:00:00Z'),
      new Date('2025-09-13T00:00:00Z'),
      new Date('2025-09-15T00:00:00Z'),
      new Date('2025-09-17T00:00:00Z'),
    ];
    const values = [95, 102, 98, 105, 97, 101, 99, 96, 820];
    const entries = values.map((value, idx) => makeEntry({
      co2eKg: value,
      date: baseDates[idx],
      rawCategory: 'beton c25',
      normalizedCategory: 'beton_c25',
    }));

    const opps = generateOpportunitiesFromEntries(entries, NOW);
    const anomaly = opps.find((o) => o.type === 'ANOMALY_DETECTED');
    expect(anomaly).toBeDefined();
    expect((anomaly?.metadata as any)?.ratio).toBeGreaterThan(3);
  });

  it('emits a best practice tip when steel usage exceeds 10 tons', () => {
    const entries: OpportunityRuleEntry[] = [
      makeEntry({ co2eKg: 1500, rawCategory: 'steel_rebar', normalizedCategory: 'steel_rebar', amountTons: 11 }),
      makeEntry({ co2eKg: 400, rawCategory: 'concrete', normalizedCategory: 'concrete' }),
    ];

    const opps = generateOpportunitiesFromEntries(entries, NOW);
    const tip = opps.find((o) => o.type === 'BEST_PRACTICE_TIP');
    expect(tip).toBeDefined();
    expect((tip?.metadata as any)?.total_tons).toBeGreaterThanOrEqual(10);
    expect(tip?.ruleId).toBe('best_practice_tip');
    expect(tip?.opportunityKey).toBe('best_practice:steel');
  });

  it('assigns stable identifiers for generated opportunities', () => {
    const entries: OpportunityRuleEntry[] = [
      makeEntry({ co2eKg: 600, rawCategory: 'concrete_c25', normalizedCategory: 'concrete_c25' }),
      makeEntry({ co2eKg: 100, rawCategory: 'steel_rebar', normalizedCategory: 'steel_rebar' }),
      makeEntry({ co2eKg: 300, rawCategory: 'transport', normalizedCategory: 'transport' }),
      makeEntry({ co2eKg: 500, date: new Date('2025-09-20T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      makeEntry({ co2eKg: 400, date: new Date('2025-09-25T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      makeEntry({ co2eKg: 250, date: new Date('2025-08-18T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      makeEntry({ co2eKg: 200, date: new Date('2025-08-28T00:00:00Z'), rawCategory: 'beton', normalizedCategory: 'beton' }),
      ...[95, 102, 98, 105, 97, 101, 99, 96].map((value, idx) => makeEntry({
        co2eKg: value,
        date: new Date(`2025-09-${String(idx * 2 + 1).padStart(2, '0')}T00:00:00Z`),
        rawCategory: 'beton c25',
        normalizedCategory: 'beton_c25',
      })),
      makeEntry({
        co2eKg: 820,
        date: new Date('2025-09-21T00:00:00Z'),
        rawCategory: 'beton c25',
        normalizedCategory: 'beton_c25',
      }),
      makeEntry({ co2eKg: 1500, rawCategory: 'steel_rebar', normalizedCategory: 'steel_rebar', amountTons: 12 }),
    ];

    const opps = generateOpportunitiesFromEntries(entries, NOW);
    expect(opps.length).toBeGreaterThan(0);
    const keys = opps.map((op) => op.opportunityKey);
    const rules = opps.map((op) => op.ruleId);
    expect(keys.every((key) => typeof key === 'string' && key.length > 0)).toBe(true);
    expect(rules.every((rule) => typeof rule === 'string' && rule.length > 0)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
