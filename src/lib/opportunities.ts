import { createClient } from '@/lib/server';
import { normalizeCategory } from '@/lib/categoryAliases';
import { OPPORTUNITY_THRESHOLDS as CFG } from '@/lib/opportunities.config';

export type Opportunity = {
  type: 'CONCENTRATION' | 'TREND_INCREASE' | 'ANOMALY_DETECTED' | 'BEST_PRACTICE_TIP';
  title: string;
  suggestion: string;
  metadata?: Record<string, unknown>;
  ruleId: string;
  opportunityKey: string;
};

export type OpportunitiesResult = {
  opportunities: Opportunity[];
  dismissedCount: number;
};

type RawEntry = {
  id: string;
  date: string | null;
  co2e_value: number | null;
  category: string | null;
  amount?: number | null;
  quantity?: number | null;
  unit?: string | null;
};

export type OpportunityRuleEntry = {
  id: string;
  co2eKg: number;
  date: Date | null;
  rawCategory: string;
  normalizedCategory: string;
  amountTons: number | null;
};

const MASS_UNIT_FACTORS: Record<string, number> = {
  ton: 1,
  tonne: 1,
  t: 1,
  't.': 1,
  tons: 1,
  kilogram: 0.001,
  kilograms: 0.001,
  kg: 0.001,
  g: 0.000001,
  gram: 0.000001,
  grams: 0.000001,
  lb: 0.000453592,
  lbs: 0.000453592,
  pound: 0.000453592,
  pounds: 0.000453592,
};

const ANOMALY_MAX_RESULTS = 3;

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, '_')
    .replace(/[^a-z0-9_]+/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'other';
}

function formatCategoryLabel(category: string): string {
  const cleaned = (category || '').replace(/_/g, ' ').trim();
  if (!cleaned) return 'Belirtilmemiş';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function convertToTons(amount: number | null, unit?: string | null): number | null {
  if (amount === null || amount === undefined) return null;
  const normalizedUnit = unit?.toLowerCase().trim() ?? '';
  if (!normalizedUnit) return null;
  const factor = MASS_UNIT_FACTORS[normalizedUnit];
  if (!factor) return null;
  return amount * factor;
}

function buildRuleEntries(rawEntries: RawEntry[]): OpportunityRuleEntry[] {
  return rawEntries.map((entry) => {
    const co2eKg = coerceNumber(entry.co2e_value) ?? 0;
    const amount = coerceNumber(entry.amount ?? entry.quantity ?? null);
    const amountTons = convertToTons(amount ?? null, entry.unit ?? null);
    const rawCategory = entry.category ?? 'Bilinmeyen';
    const normalized = normalizeCategory(rawCategory) ?? slugify(rawCategory);
    return {
      id: entry.id,
      co2eKg,
      date: toDate(entry.date),
      rawCategory,
      normalizedCategory: normalized,
      amountTons,
    } as OpportunityRuleEntry;
  });
}

function isSteelCategory(entry: OpportunityRuleEntry) {
  const haystack = `${entry.normalizedCategory} ${entry.rawCategory}`.toLowerCase();
  return ['steel', 'rebar', 'celik', 'hasir'].some((keyword) => haystack.includes(keyword));
}

function detectConcentration(entries: OpportunityRuleEntry[]): Opportunity | null {
  const catMap = new Map<string, { total: number; rawSamples: string[] }>();
  for (const entry of entries) {
    if (entry.co2eKg <= 0) continue;
    const current = catMap.get(entry.normalizedCategory) ?? { total: 0, rawSamples: [] };
    current.total += entry.co2eKg;
    if (entry.rawCategory && !current.rawSamples.includes(entry.rawCategory)) {
      current.rawSamples.push(entry.rawCategory);
    }
    catMap.set(entry.normalizedCategory, current);
  }
  if (!catMap.size) return null;

  const totals = Array.from(catMap.values()).reduce((sum, value) => sum + value.total, 0);
  if (totals <= 0) return null;

  let topCategory = '';
  let topValue = 0;
  for (const [category, agg] of catMap.entries()) {
    if (agg.total > topValue) {
      topValue = agg.total;
      topCategory = category;
    }
  }
  if (!topCategory) return null;

  const share = topValue / totals;
  if (share <= CFG.CONCENTRATION_SHARE) return null;

  const percentage = Math.round(share * 100);
  const labelSource = catMap.get(topCategory)?.rawSamples?.[0] ?? topCategory;
  const label = formatCategoryLabel(labelSource);

  return {
    type: 'CONCENTRATION',
    title: `${label} Emisyonu Yoğunlaşması`,
    suggestion: `Projenizin emisyonlarının %${percentage}’i ${label.toLowerCase()} kaynaklı. Düşük karbonlu alternatifleri araştırarak büyük bir etki yaratabilirsiniz.`,
    metadata: {
      category: topCategory,
      categoryLabel: label,
      percentage,
      category_total_kg: topValue,
      project_total_kg: totals,
    },
    ruleId: 'concentration',
    opportunityKey: `concentration:${topCategory}`,
  } satisfies Opportunity;
}

function detectTrend(entries: OpportunityRuleEntry[], now: Date): Opportunity | null {
  const windowDays = Math.max(1, Math.floor(CFG.TREND_WINDOW_DAYS || 30));
  const currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentStart = new Date(currentEnd);
  currentStart.setUTCDate(currentEnd.getUTCDate() - windowDays + 1);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(currentStart.getUTCDate() - windowDays);

  let currentTotal = 0;
  let previousTotal = 0;

  for (const entry of entries) {
    if (!entry.date) continue;
    const dateUTC = new Date(Date.UTC(entry.date.getUTCFullYear(), entry.date.getUTCMonth(), entry.date.getUTCDate()));
    if (dateUTC >= currentStart && dateUTC <= currentEnd) {
      currentTotal += Math.max(0, entry.co2eKg);
    } else if (dateUTC >= previousStart && dateUTC < currentStart) {
      previousTotal += Math.max(0, entry.co2eKg);
    }
  }

  if (currentTotal <= 0) return null;

  if (previousTotal <= 0) {
    const increasePercentage = 100;
    return {
      type: 'TREND_INCREASE',
      title: 'Son Dönemde Emisyon Artışı',
      suggestion: `Son ${windowDays} gündeki emisyonlarınız bir önceki döneme göre %${increasePercentage} arttı. Bu artışın kaynağını Raporlar sayfasından detaylı inceleyebilirsiniz.`,
      metadata: {
        increase_percentage: increasePercentage,
        current_period_total_kg: currentTotal,
        previous_period_total_kg: previousTotal,
        window_days: windowDays,
      },
      ruleId: 'trend_increase',
      opportunityKey: `trend_increase:${windowDays}`,
    } satisfies Opportunity;
  }

  const increase = currentTotal - previousTotal;
  if (increase <= 0) return null;

  const ratio = increase / previousTotal;
  if (ratio <= CFG.TREND_INCREASE) return null;

  const increasePercentage = Math.round(ratio * 100);

  return {
    type: 'TREND_INCREASE',
    title: 'Son Dönemde Emisyon Artışı',
    suggestion: `Son ${windowDays} gündeki emisyonlarınız bir önceki döneme göre %${increasePercentage} arttı. Bu artışın kaynağını Raporlar sayfasından detaylı inceleyebilirsiniz.`,
    metadata: {
      increase_percentage: increasePercentage,
      current_period_total_kg: currentTotal,
      previous_period_total_kg: previousTotal,
      window_days: windowDays,
    },
    ruleId: 'trend_increase',
    opportunityKey: `trend_increase:${windowDays}`,
  } satisfies Opportunity;
}

function detectAnomalies(entries: OpportunityRuleEntry[]): Opportunity[] {
  const grouped = new Map<string, OpportunityRuleEntry[]>();
  for (const entry of entries) {
    if (entry.co2eKg <= 0) continue;
    const key = entry.normalizedCategory || 'other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const results: Opportunity[] = [];
  const minSample = Math.max(3, Math.floor(CFG.ANOMALY_MIN_SAMPLE || 5));

  for (const [category, bucket] of grouped.entries()) {
    if (bucket.length < minSample) continue;

    for (const entry of bucket) {
      const baseline = bucket.filter((candidate) => candidate !== entry && candidate.co2eKg > 0);
      if (baseline.length < Math.max(3, minSample - 1)) continue;

      const values = baseline.map((candidate) => candidate.co2eKg);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
      const stddev = Math.sqrt(variance);
      if (!Number.isFinite(stddev) || stddev === 0) continue;

      const threshold = mean + (CFG.ANOMALY_STD_FACTOR || 3) * stddev;
      if (entry.co2eKg <= threshold) continue;

      const ratio = entry.co2eKg / (mean || 1);
      const label = formatCategoryLabel(entry.rawCategory || category);
      const dateStr = entry.date ? entry.date.toLocaleDateString('tr-TR') : 'Belirtilmeyen tarih';

      results.push({
        type: 'ANOMALY_DETECTED',
        title: 'Potansiyel Hatalı Veri Girişi',
        suggestion: `${dateStr} tarihli '${label}' kaydınız, projedeki diğer ${label.toLowerCase()} girişlerinin ortalamasından ${ratio.toFixed(1)} kat daha yüksek görünüyor. Bir yazım hatası olabilir mi?`,
        metadata: {
          entry_id: entry.id,
          category,
          categoryLabel: label,
          value_kg: Number(entry.co2eKg.toFixed(2)),
          mean_kg: Number(mean.toFixed(2)),
          stddev_kg: Number(stddev.toFixed(2)),
          threshold_kg: Number(threshold.toFixed(2)),
          ratio: Number(ratio.toFixed(2)),
          sample_size: baseline.length,
        },
        ruleId: 'anomaly_detected',
        opportunityKey: `anomaly:${entry.id}`,
      });
    }
  }

  return results.slice(0, ANOMALY_MAX_RESULTS);
}

function detectBestPractice(entries: OpportunityRuleEntry[]): Opportunity | null {
  const steelEntries = entries.filter(isSteelCategory);
  if (!steelEntries.length) return null;

  const totalTons = steelEntries.reduce((sum, entry) => sum + (entry.amountTons ?? 0), 0);
  const totalCo2 = steelEntries.reduce((sum, entry) => sum + Math.max(0, entry.co2eKg), 0);

  if (totalTons >= CFG.STEEL_TON_THRESHOLD) {
    return {
      type: 'BEST_PRACTICE_TIP',
      title: 'Geri Dönüştürülmüş Malzeme Fırsatı',
      suggestion: 'Projenizde çelik kullanımı yüksek. Tedarikçinizle görüşerek geri dönüştürülmüş çelik kullanma opsiyonlarını değerlendirdiniz mi? Bu, malzemenin gömülü karbonunu %70’e kadar azaltabilir.',
      metadata: {
        material: 'steel',
        total_tons: Number(totalTons.toFixed(2)),
      },
      ruleId: 'best_practice_tip',
      opportunityKey: 'best_practice:steel',
    } satisfies Opportunity;
  }

  if (!totalTons && totalCo2 >= 1000) {
    return {
      type: 'BEST_PRACTICE_TIP',
      title: 'Geri Dönüştürülmüş Malzeme Fırsatı',
      suggestion: 'Projenizde çelik kullanımı yüksek. Tedarikçinizle görüşerek geri dönüştürülmüş çelik kullanma opsiyonlarını değerlendirdiniz mi? Bu, malzemenin gömülü karbonunu %70’e kadar azaltabilir.',
      metadata: {
        material: 'steel',
        total_co2e_kg: Number(totalCo2.toFixed(2)),
      },
      ruleId: 'best_practice_tip',
      opportunityKey: 'best_practice:steel',
    } satisfies Opportunity;
  }

  return null;
}

export function generateOpportunitiesFromEntries(entries: OpportunityRuleEntry[], now: Date = new Date()): Opportunity[] {
  const opportunities: Opportunity[] = [];

  const concentration = detectConcentration(entries);
  if (concentration) opportunities.push(concentration);

  const trend = detectTrend(entries, now);
  if (trend) opportunities.push(trend);

  const anomalies = detectAnomalies(entries);
  opportunities.push(...anomalies);

  const bestPractice = detectBestPractice(entries);
  if (bestPractice) opportunities.push(bestPractice);

  return opportunities;
}

export async function analyzeProjectForOpportunities(projectId: string): Promise<OpportunitiesResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { opportunities: [], dismissedCount: 0 };
  try {
    const [entriesResult, dismissedResult] = await Promise.all([
      supabase
        .from('entries')
        .select('id, date, co2e_value, category, amount, unit')
        .eq('project_id', projectId),
      supabase
        .from('dismissed_opportunities')
        .select('opportunity_key')
        .eq('project_id', projectId)
        .eq('user_id', user.id),
    ]);

    if (entriesResult.error) {
      console.error('[opportunities] Supabase error', entriesResult.error);
      return {
        opportunities: [],
        dismissedCount: (dismissedResult.data ?? []).length,
      };
    }

    const rawEntries = (entriesResult.data ?? []) as RawEntry[];
    const dismissedRows = dismissedResult.data ?? [];
    if (!rawEntries.length) {
      return {
        opportunities: [],
        dismissedCount: dismissedRows.length,
      };
    }

    const ruleEntries = buildRuleEntries(rawEntries);
    const opportunities = generateOpportunitiesFromEntries(ruleEntries);

    if (dismissedResult.error) {
      console.error('[opportunities] dismissed lookup error', dismissedResult.error);
    }

    if (!dismissedRows.length) {
      return {
        opportunities,
        dismissedCount: 0,
      };
    }
    const dismissedSet = new Set(dismissedRows.map((row: any) => row.opportunity_key));
    const filtered = opportunities.filter((opportunity) => !dismissedSet.has(opportunity.opportunityKey));
    return {
      opportunities: filtered,
      dismissedCount: dismissedRows.length,
    };
  } catch (err) {
    console.error('[opportunities] Unexpected error', err);
    return { opportunities: [], dismissedCount: 0 };
  }
}
