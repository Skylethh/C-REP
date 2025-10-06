import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@/lib/server', () => ({
  createClient: createClientMock,
}));

const baseOpportunity = {
  id: 'opp-1',
  type: 'CONCENTRATION' as const,
  title: 'Test Opportunity',
  suggestion: 'Basit öneri',
  data: {
    category: 'Beton',
    percentage: 60,
    categoryTotalKg: 1200,
    projectTotalKg: 2000,
  },
};

function resetEnvironment() {
  delete process.env.OPPORTUNITIES_AI_ENABLED;
  delete process.env.NEXT_PUBLIC_OPPORTUNITIES_AI_ENABLED;
  delete process.env.GROQ_API_KEY;
}

describe('AI opportunities helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    resetEnvironment();
  });

  afterEach(() => {
    resetEnvironment();
  });

  it('formats time deltas into human friendly strings', async () => {
    const { formatDelta } = await import('@/app/actions/opportunities.helpers');
    const reference = new Date('2025-10-06T12:00:00Z');
    expect(formatDelta(new Date('2025-10-06T12:00:20Z'), reference)).toBe('20 saniye');
    expect(formatDelta(new Date('2025-10-06T12:03:00Z'), reference)).toBe('3 dakika');
    expect(formatDelta(new Date('2025-10-06T15:00:00Z'), reference)).toBe('3 saat');
    expect(formatDelta(new Date('2025-10-08T12:00:00Z'), reference)).toBe('2 gün');
  });

  it('produces stable opportunity signatures', async () => {
    const { computeOpportunitySignature } = await import('@/app/actions/opportunities.helpers');
    const first = computeOpportunitySignature(baseOpportunity);
    const second = computeOpportunitySignature({
      ...baseOpportunity,
      suggestion: 'Basit öneri',
      data: { ...baseOpportunity.data },
    });
    const third = computeOpportunitySignature({
      ...baseOpportunity,
      suggestion: 'Farklı öneri',
    });
    expect(first.opportunityKey).toBe(second.opportunityKey);
    expect(first.baseHash).toBe(second.baseHash);
    expect(first.baseHash).not.toBe(third.baseHash);
  });

  it('short-circuits when AI feature flag is disabled', async () => {
    process.env.OPPORTUNITIES_AI_ENABLED = 'false';
    const module = await import('@/app/actions/opportunities');
    const result = await module.getAIEnrichmentForOpportunity(baseOpportunity, 'project-123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('unsupported');
    }
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
