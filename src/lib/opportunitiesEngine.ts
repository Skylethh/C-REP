import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/server';
import { normalizeCategory } from '@/lib/categoryAliases';

export type Opportunity = {
  id: string;
  type: 'CONCENTRATION' | 'TREND_INCREASE' | 'ANOMALY_DETECTED' | 'COST_CARBON_IMBALANCE' | 'BENCHMARK_GAP';
  title: string;
  suggestion: string;
  data: Record<string, any>;
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

export type RuleEntry = {
  id: string;
  co2eKg: number;
  date: Date | null;
  rawCategory: string;
  normalizedCategory: string;
  amount: number | null;
  unit: string | null;
  isCurrency: boolean;
};

const MASS_UNIT_FACTORS: Record<string, number> = {
  ton: 1,
  tonne: 1,
  t: 1,
  kilograms: 0.001,
  kilogram: 0.001,
  kg: 0.001,
  g: 0.000001,
  gram: 0.000001,
  grams: 0.000001,
  lb: 0.000453592,
  lbs: 0.000453592,
};

const CURRENCY_UNITS = new Set([
  'try',
  'tl',
  '₺',
  'turkish lira',
  'usd',
  'eur',
  'gbp',
  'aud',
  'cad',
  'chf',
  'sar',
  'qar',
  'dollar',
  'dollars',
  'lira',
  'euro',
  'pound',
]);

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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]+/g, '')
    .replace(/[\s/]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'other';
}

export function buildRuleEntries(rawEntries: RawEntry[]): RuleEntry[] {
  return rawEntries.map((entry) => {
    const co2e = coerceNumber(entry.co2e_value) ?? 0;
    const amount = coerceNumber(entry.amount ?? entry.quantity ?? null);
    const unit = (entry.unit ?? '').toLowerCase().trim();
    const multiplier = unit ? MASS_UNIT_FACTORS[unit] ?? 1 : 1;
    const adjustedCo2e = unit && multiplier !== 1 ? co2e * multiplier : co2e;
    const rawCategory = entry.category ?? 'belirtilmemiş';
    const normalized = normalizeCategory(rawCategory) ?? slugify(rawCategory);
    return {
      id: entry.id,
      co2eKg: adjustedCo2e,
      date: toDate(entry.date),
      rawCategory,
      normalizedCategory: normalized,
      amount,
      unit: unit || null,
      isCurrency: Boolean(amount && unit && CURRENCY_UNITS.has(unit)),
    } satisfies RuleEntry;
  });
}

function detectConcentration(entries: RuleEntry[]): Opportunity | null {
  const totalsByCategory = new Map<string, { total: number; labels: Set<string> }>();
  let projectTotal = 0;

  for (const entry of entries) {
    if (entry.co2eKg <= 0) continue;
    projectTotal += entry.co2eKg;
    const bucket = totalsByCategory.get(entry.normalizedCategory) ?? { total: 0, labels: new Set<string>() };
    bucket.total += entry.co2eKg;
    if (entry.rawCategory) bucket.labels.add(entry.rawCategory);
    totalsByCategory.set(entry.normalizedCategory, bucket);
  }

  if (projectTotal <= 0 || totalsByCategory.size === 0) return null;

  let topKey = '';
  let topValue = 0;
  for (const [key, bucket] of totalsByCategory.entries()) {
    if (bucket.total > topValue) {
      topValue = bucket.total;
      topKey = key;
    }
  }

  if (!topKey) return null;
  const share = topValue / projectTotal;
  if (share <= 0.5) return null;

  const percentage = Math.round(share * 100);
  const label = Array.from(totalsByCategory.get(topKey)?.labels ?? [topKey])[0];
  const sentenceLabel = label.replace(/_/g, ' ');

  return {
    id: randomUUID(),
    type: 'CONCENTRATION',
    title: `${sentenceLabel} yoğunlaşıyor`,
    suggestion: `Emisyonlarınızın %${percentage}’i ${sentenceLabel.toLowerCase()} kaynaklı. Bu kategoride düşük karbonlu alternatifleri değerlendirerek fark yaratabilirsiniz.`,
    data: {
      category: sentenceLabel,
      categoryKey: topKey,
      percentage,
      categoryTotalKg: Number(topValue.toFixed(2)),
      projectTotalKg: Number(projectTotal.toFixed(2)),
    },
  } satisfies Opportunity;
}

function detectTrend(entries: RuleEntry[], now: Date): Opportunity | null {
  const windowDays = 30;
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
    return {
      id: randomUUID(),
      type: 'TREND_INCREASE',
      title: 'Son 30 günde ciddi artış',
      suggestion: 'Son 30 gündeki emisyonlarınız önceki döneme göre keskin şekilde arttı. Kaynağı raporlardan inceleyin.',
      data: {
        windowDays,
        currentTotalKg: Number(currentTotal.toFixed(2)),
        previousTotalKg: Number(previousTotal.toFixed(2)),
        increasePercentage: 100,
      },
    } satisfies Opportunity;
  }

  const increase = currentTotal - previousTotal;
  if (increase <= 0) return null;
  const ratio = increase / previousTotal;
  if (ratio < 0.2) return null;

  const increasePercentage = Math.round(ratio * 100);

  return {
    id: randomUUID(),
    type: 'TREND_INCREASE',
    title: 'Son 30 günde ciddi artış',
    suggestion: `Son 30 gündeki emisyonlarınız bir önceki döneme göre %${increasePercentage} yükseldi. Raporlar sayfasında detayları inceleyin.`,
    data: {
      windowDays,
      currentTotalKg: Number(currentTotal.toFixed(2)),
      previousTotalKg: Number(previousTotal.toFixed(2)),
      increasePercentage,
    },
  } satisfies Opportunity;
}

type CostBucket = {
  emission: number;
  spend: number;
  label: string;
  entries: number;
  units: Set<string>;
};

function detectCostCarbonImbalance(entries: RuleEntry[]): Opportunity | null {
  const buckets = new Map<string, CostBucket>();

  for (const entry of entries) {
    if (!entry.isCurrency || !entry.amount || entry.amount <= 0 || entry.co2eKg <= 0) continue;
    const key = entry.normalizedCategory || 'other';
    const bucket = buckets.get(key) ?? {
      emission: 0,
      spend: 0,
      label: entry.rawCategory,
      entries: 0,
      units: new Set<string>(),
    };
    bucket.emission += entry.co2eKg;
    bucket.spend += entry.amount;
    bucket.entries += 1;
    if (entry.unit) bucket.units.add(entry.unit);
    if (entry.rawCategory && !bucket.label) {
      bucket.label = entry.rawCategory;
    }
    buckets.set(key, bucket);
  }

  if (!buckets.size) return null;

  let totalEmission = 0;
  let totalSpend = 0;
  for (const bucket of buckets.values()) {
    totalEmission += bucket.emission;
    totalSpend += bucket.spend;
  }

  if (totalEmission <= 0 || totalSpend <= 0) return null;

  let best: {
    key: string;
    emissionShare: number;
    spendShare: number;
    bucket: CostBucket;
    ratio: number;
  } | null = null;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.entries < 2) continue;
    if (bucket.spend <= 0 || bucket.emission <= 0) continue;
    const emissionShare = bucket.emission / totalEmission;
    const spendShare = bucket.spend / totalSpend;
    if (emissionShare < 0.3) continue;
    const ratio = emissionShare / Math.max(spendShare, 0.01);
    if (ratio < 1.8) continue;
    if (spendShare > 0.35 && ratio < 2.2) continue;
    if (!best || ratio > best.ratio) {
      best = { key, emissionShare, spendShare, bucket, ratio };
    }
  }

  if (!best) return null;

  const label = (best.bucket.label || best.key).replace(/_/g, ' ');
  const emissionSharePct = Math.round(best.emissionShare * 1000) / 10;
  const spendSharePct = Math.round(best.spendShare * 1000) / 10;
  const currencyUnit = Array.from(best.bucket.units)[0] ?? null;
  const spendDisplay = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(best.bucket.spend);
  const spendLabel = currencyUnit ? `${spendDisplay} ${currencyUnit.toUpperCase()}` : spendDisplay;

  return {
    id: randomUUID(),
    type: 'COST_CARBON_IMBALANCE',
    title: `${label} kaleminde karbon yoğunluğu yüksek`,
    suggestion: `${label} kalemi projenin toplam emisyonunun %${emissionSharePct}’ini oluştururken bütçedeki payı yalnızca %${spendSharePct}. Tedarikçi koşullarını, alternatif malzemeleri veya kullanım miktarını gözden geçirmek karbon yoğunluğunu düşürmeye yardımcı olabilir.`,
    data: {
      category: label,
      categoryKey: best.key,
      emissionShare: emissionSharePct,
      spendShare: spendSharePct,
      emissionKg: Number(best.bucket.emission.toFixed(2)),
      spendAmount: Number(best.bucket.spend.toFixed(2)),
      currencyUnit,
      spendLabel,
      sampleSize: best.bucket.entries,
    },
  } satisfies Opportunity;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function detectBenchmarkGap(entries: RuleEntry[], peerTotalsKg: number[]): Opportunity | null {
  if (!peerTotalsKg || peerTotalsKg.length < 3) return null;

  const projectTotal = entries.reduce((sum, entry) => sum + Math.max(0, entry.co2eKg), 0);
  if (projectTotal <= 0) return null;

  const validPeers = peerTotalsKg.filter((value) => Number.isFinite(value) && value > 0);
  if (validPeers.length < 3) return null;

  const peerMedian = median(validPeers);
  if (!peerMedian || peerMedian <= 0) return null;

  const ratio = projectTotal / peerMedian;
  if (ratio <= 1.3) return null;

  const deltaPercent = Math.round((ratio - 1) * 100);
  const peerAverage = validPeers.reduce((sum, value) => sum + value, 0) / validPeers.length;

  return {
    id: randomUUID(),
    type: 'BENCHMARK_GAP',
    title: 'Benzer projelere göre yüksek emisyon',
    suggestion: `Toplam emisyonunuz benzer projelerin medyanından yaklaşık %${deltaPercent} daha yüksek görünüyor. En yoğun kategorileri gözden geçirip kısa vadede azaltım planı oluşturmayı düşünün.`,
    data: {
      projectTotalKg: Number(projectTotal.toFixed(2)),
      peerMedianKg: Number(peerMedian.toFixed(2)),
      peerAverageKg: Number(peerAverage.toFixed(2)),
      deltaPercent,
      peerCount: validPeers.length,
    },
  } satisfies Opportunity;
}

function detectAnomalies(entries: RuleEntry[]): Opportunity[] {
  const grouped = new Map<string, RuleEntry[]>();

  for (const entry of entries) {
    if (entry.co2eKg <= 0) continue;
    const key = entry.normalizedCategory || 'other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const opportunities: Opportunity[] = [];

  for (const [categoryKey, rows] of grouped.entries()) {
    if (rows.length < 5) continue;

    for (const candidate of rows) {
      const baseline = rows.filter((row) => row !== candidate);
      if (baseline.length < 4) continue;

      const values = baseline.map((row) => row.co2eKg);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
      const stddev = Math.sqrt(variance);
      if (!Number.isFinite(stddev) || stddev === 0) continue;

      const threshold = mean + 3 * stddev;
      if (candidate.co2eKg <= threshold) continue;

      const label = candidate.rawCategory.replace(/_/g, ' ');
      const ratio = candidate.co2eKg / (mean || 1);
      const dateStr = candidate.date ? candidate.date.toLocaleDateString('tr-TR') : 'Belirtilmeyen tarih';

      opportunities.push({
        id: randomUUID(),
        type: 'ANOMALY_DETECTED',
        title: 'Olası hatalı veri',
        suggestion: `${dateStr} tarihli ${label} kaydı diğer girişlerin ortalamasının ${ratio.toFixed(1)} katı. Değeri doğrulayın.`,
        data: {
          entryId: candidate.id,
          category: label,
          categoryKey,
          ratio: Number(ratio.toFixed(2)),
          valueKg: Number(candidate.co2eKg.toFixed(2)),
          meanKg: Number(mean.toFixed(2)),
          thresholdKg: Number(threshold.toFixed(2)),
          sampleSize: baseline.length,
          date: dateStr,
        },
      });
    }
  }

  return opportunities;
}

export function generateOpportunitiesFromEntries(
  entries: RuleEntry[],
  context: { now?: Date; peerTotalsKg?: number[] } = {},
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const now = context.now ?? new Date();
  const peerTotals = context.peerTotalsKg ?? [];

  const concentration = detectConcentration(entries);
  if (concentration) opportunities.push(concentration);

  const costImbalance = detectCostCarbonImbalance(entries);
  if (costImbalance) opportunities.push(costImbalance);

  const trend = detectTrend(entries, now);
  if (trend) opportunities.push(trend);

  const benchmark = detectBenchmarkGap(entries, peerTotals);
  if (benchmark) opportunities.push(benchmark);

  opportunities.push(...detectAnomalies(entries));

  return opportunities;
}

export async function analyzeProjectForOpportunities(projectId: string): Promise<Opportunity[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const sources: Array<{ table: string; columns: string }> = [
    { table: 'emission_entries', columns: 'id, date, co2e_value, category, amount, quantity, unit' },
    { table: 'entries', columns: 'id, date, co2e_value, category, amount, unit' },
  ];

  let rawEntries: RawEntry[] = [];
  for (const source of sources) {
    const { data, error } = await supabase
      .from(source.table)
      .select(source.columns)
      .eq('project_id', projectId);

    if (error) {
      console.warn(`[opportunities] ${source.table} sorgusu başarısız`, error);
      continue;
    }

    if (Array.isArray(data) && data.length > 0) {
      rawEntries = data as unknown as RawEntry[];
      break;
    }

    if (source.table === 'entries') {
      const rows = Array.isArray(data) ? data : [];
      rawEntries = rows as unknown as RawEntry[];
    }
  }

  if (!rawEntries.length) return [];

  let peerTotalsKg: number[] = [];
  const { data: peerRows, error: peerError } = await supabase
    .from('entries')
    .select('project_id, co2e_value')
    .neq('project_id', projectId);

  if (peerError) {
    console.warn('[opportunities] peer totals lookup failed', peerError);
  } else if (Array.isArray(peerRows) && peerRows.length > 0) {
    const totalsMap = new Map<string, number>();
    for (const row of peerRows as Array<{ project_id: string | null; co2e_value: number | string | null }>) {
      if (!row.project_id) continue;
      const value = coerceNumber(row.co2e_value) ?? 0;
      if (value <= 0) continue;
      totalsMap.set(row.project_id, (totalsMap.get(row.project_id) ?? 0) + value);
    }
    peerTotalsKg = Array.from(totalsMap.values()).filter((total) => total > 0);
  }

  const normalized = buildRuleEntries(rawEntries);
  return generateOpportunitiesFromEntries(normalized, { peerTotalsKg, now: new Date() });
}
