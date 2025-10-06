import { describe, it, expect } from 'vitest';
import { generateOpportunitiesFromEntries, type RuleEntry } from '@/lib/opportunitiesEngine';

const NOW = new Date('2025-10-06T00:00:00Z');

let counter = 0;
function entry(partial: Partial<RuleEntry>): RuleEntry {
  counter += 1;
  return {
    id: partial.id ?? `entry-${counter}`,
    co2eKg: partial.co2eKg ?? 0,
    date: partial.date ?? NOW,
    rawCategory: partial.rawCategory ?? 'beton',
    normalizedCategory: partial.normalizedCategory ?? 'beton',
  } satisfies RuleEntry;
}

describe('opportunities engine (new spec)', () => {
  it('detects concentration opportunities', () => {
    const entries: RuleEntry[] = [
      entry({ co2eKg: 600, rawCategory: 'Beton C25', normalizedCategory: 'beton' }),
      entry({ co2eKg: 150, rawCategory: 'Çelik', normalizedCategory: 'celik' }),
      entry({ co2eKg: 120, rawCategory: 'Taşıma', normalizedCategory: 'tasima' }),
    ];

    const opportunities = generateOpportunitiesFromEntries(entries, NOW);
    const concentration = opportunities.find((opp) => opp.type === 'CONCENTRATION');
    expect(concentration).toBeDefined();
    expect(concentration?.data?.percentage).toBeGreaterThan(50);
    expect(typeof concentration?.id).toBe('string');
  });

  it('detects upward trends over 20%', () => {
    const entries: RuleEntry[] = [
      entry({ co2eKg: 500, date: new Date('2025-09-20T00:00:00Z') }),
      entry({ co2eKg: 420, date: new Date('2025-09-26T00:00:00Z') }),
      entry({ co2eKg: 200, date: new Date('2025-08-18T00:00:00Z') }),
      entry({ co2eKg: 190, date: new Date('2025-08-22T00:00:00Z') }),
    ];

    const opportunities = generateOpportunitiesFromEntries(entries, NOW);
    const trend = opportunities.find((opp) => opp.type === 'TREND_INCREASE');
    expect(trend).toBeDefined();
    expect(trend?.data?.increasePercentage).toBeGreaterThanOrEqual(20);
  });

  it('flags anomalies when entry is beyond 3 std deviations', () => {
    const values = [90, 92, 95, 94, 96, 93, 91, 92, 800];
    const entries = values.map((value, idx) => entry({
      co2eKg: value,
      rawCategory: 'Beton C25',
      normalizedCategory: 'beton_c25',
      date: new Date(`2025-09-${String(idx + 1).padStart(2, '0')}T00:00:00Z`),
    }));

    const opportunities = generateOpportunitiesFromEntries(entries, NOW);
    const anomaly = opportunities.find((opp) => opp.type === 'ANOMALY_DETECTED');
    expect(anomaly).toBeDefined();
    expect(anomaly?.data?.ratio).toBeGreaterThan(3);
  });

  it('assigns unique IDs to every opportunity', () => {
    const entries: RuleEntry[] = [
      entry({ co2eKg: 700, rawCategory: 'Beton', normalizedCategory: 'beton' }),
      entry({ co2eKg: 500, date: new Date('2025-09-22T00:00:00Z') }),
      entry({ co2eKg: 200, date: new Date('2025-08-22T00:00:00Z') }),
      entry({ co2eKg: 90, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
      entry({ co2eKg: 820, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
      entry({ co2eKg: 93, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
      entry({ co2eKg: 92, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
      entry({ co2eKg: 94, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
      entry({ co2eKg: 96, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
      entry({ co2eKg: 97, rawCategory: 'Beton C25', normalizedCategory: 'beton_c25' }),
    ];

    const opportunities = generateOpportunitiesFromEntries(entries, NOW);
    const ids = opportunities.map((opp) => opp.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
