import { createClient } from '@/lib/server';
import { normalizeCategory } from '@/lib/categoryAliases';
import { OPPORTUNITY_THRESHOLDS as CFG } from '@/lib/opportunities.config';

export type OpportunityImpact = {
  co2eKg: number; // estimated potential saving in kg CO2e
  co2eTons: number; // convenience for UI
  note?: string;
};

export type Opportunity = {
  id: string;
  ruleId: 'high-concentration' | 'self-benchmark-trend' | 'rebar-alternative';
  title: string;
  finding: string;
  suggestion: string;
  impact: OpportunityImpact;
  severity?: 'info' | 'warning' | 'critical';
  meta?: Record<string, any>;
  cta?: { detailsHref?: string };
};

type EntryLite = {
  date: string | null;
  co2e_value: number | null;
  category: string | null;
  activities?: { key?: string | null } | null;
};

function formatPercent(n: number) {
  return (n * 100).toFixed(0);
}

function toTons(kg: number) {
  return kg / 1000;
}

function safeDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function groupByCategory(entries: EntryLite[]) {
  const map = new Map<string, { total: number; keys: Set<string>; rawCats: Set<string> }>();
  for (const e of entries) {
    const keyRaw = e.activities?.key || e.category || 'unknown';
    const key = normalizeCategory(String(keyRaw)) || String(keyRaw);
    const v = Number(e.co2e_value) || 0;
    if (!v) continue;
    const prev = map.get(key) || { total: 0, keys: new Set<string>(), rawCats: new Set<string>() };
    prev.total += v;
    if (e.activities?.key) prev.keys.add(String(e.activities.key));
    if (e.category) prev.rawCats.add(String(e.category));
    map.set(key, prev);
  }
  return map;
}

function findTopCategoryShare(catMap: Map<string, { total: number; keys: Set<string>; rawCats: Set<string> }>) {
  let topKey = '';
  let topVal = 0;
  let total = 0;
  for (const [, v] of catMap) total += v.total;
  for (const [k, v] of catMap) {
    if (v.total > topVal) { topVal = v.total; topKey = k; }
  }
  const share = total > 0 ? topVal / total : 0;
  return { topKey, topVal, total, share };
}

function computeHighConcentrationOpportunity(catMap: Map<string, { total: number; keys: Set<string>; rawCats: Set<string> }>): Opportunity | null {
  const { topKey, topVal, total, share } = findTopCategoryShare(catMap);
  const THRESHOLD = CFG.HIGH_CONC_SHARE; // default 60%
  if (!total || share < THRESHOLD) return null;
  const percentStr = formatPercent(share);
  const impactKg = topVal * CFG.HIGH_CONC_IMPACT; // 15% default
  const title = `${prettyLabel(topKey)} Emisyonunu Düşürme Fırsatı`;
  const finding = `Toplam emisyonun %${percentStr}'i ${prettyLabel(topKey)} kaynaklı.`;
  const suggestion = `Tedarikçinizle görüşerek düşük karbonlu alternatifleri değerlendirin. Örn: düşük klinker oranlı veya kalsine kil içeren karışımlar.`;
  const info = catMap.get(topKey);
  const firstKey = info?.keys.values().next().value as string | undefined;
  const firstRaw = info?.rawCats.values().next().value as string | undefined;
  return {
    id: `high-concentration:${topKey}`,
    ruleId: 'high-concentration',
    title,
    finding,
    suggestion,
    impact: { co2eKg: impactKg, co2eTons: toTons(impactKg) },
    severity: 'warning',
    meta: { category: topKey, categoryRaw: firstRaw, activityKey: firstKey, share, total },
  };
}

function computeSelfBenchmarkOpportunity(last30Kg: number, prev30Kg: number): Opportunity | null {
  if (!last30Kg || !prev30Kg) return null;
  const increase = last30Kg - prev30Kg;
  if (increase <= 0) return null;
  const ratio = prev30Kg > 0 ? increase / prev30Kg : 0;
  const THRESHOLD = CFG.TREND_INCREASE; // 20% default
  if (ratio < THRESHOLD) return null;
  const percentStr = formatPercent(ratio);
  const finding = `Son 30 gündeki emisyon, önceki 30 güne göre %${percentStr} arttı.`;
  const suggestion = `Artışın kaynağını inceleyin: tarih, kategori ve tedarikçi kırılımlarını kontrol ederek hızlı iyileştirme alanlarını belirleyin.`;
  // Impact is informative; we can present increase itself as potential saving if mitigated next period
  const impactKg = increase * CFG.TREND_RECOVERABLE; // default 50% recoverable
  return {
    id: 'self-benchmark-trend',
    ruleId: 'self-benchmark-trend',
    title: 'Artan Emisyon Trendi',
    finding,
    suggestion,
    impact: { co2eKg: impactKg, co2eTons: toTons(impactKg), note: 'Önümüzdeki dönemde alınacak aksiyonlarla azaltılabilir.' },
    severity: 'info',
  };
}

function computeRebarAlternativeOpportunity(catMap: Map<string, { total: number; keys: Set<string>; rawCats: Set<string> }>, totalKg: number): Opportunity | null {
  // Consider both 'steel_rebar' and common aliases if present in keys
  const keys = Array.from(catMap.keys());
  const rebarKey = keys.find(k => k.includes('steel_rebar') || k.includes('rebar') || k.includes('hasir_celik'));
  if (!rebarKey) return null;
  const val = catMap.get(rebarKey)?.total || 0;
  // Thresholds: at least 2 tCO2e or 10% of project total
  const MIN_KG = CFG.REBAR_MIN_KG;
  const MIN_SHARE = CFG.REBAR_MIN_SHARE;
  if (val < MIN_KG && (totalKg > 0 && (val / totalKg) < MIN_SHARE)) return null;
  const impactKg = val * CFG.REBAR_IMPACT; // default 25%
  return {
    id: `rebar-alternative:${rebarKey}`,
    ruleId: 'rebar-alternative',
    title: 'Çelik Donatıda (Rebar) Alternatif',
    finding: `Projede çelik donatı kaynaklı emisyonlar belirgin seviyede.`,
    suggestion: 'Geri dönüştürülmüş çelik veya sertifikalı düşük emisyonlu tedarik seçeneklerini değerlendirin.',
    impact: { co2eKg: impactKg, co2eTons: toTons(val * 0.25) },
    severity: 'info',
    meta: { category: rebarKey, categoryRaw: catMap.get(rebarKey)?.rawCats.values().next().value, activityKey: catMap.get(rebarKey)?.keys.values().next().value, share: totalKg > 0 ? val / totalKg : 0 },
  };
}

function prettyLabel(slug: string) {
  const s = (slug || '').toLowerCase().replace(/_/g, ' ');
  // Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function analyzeProjectForOpportunities(projectId: string, opts?: { userId?: string }): Promise<Opportunity[]> {
  const supabase = await createClient();
  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(now.getDate() - 30);
  const prev30Start = new Date(now);
  prev30Start.setDate(now.getDate() - 60);

  const last30Str = safeDateStr(last30Start);
  const prev30Str = safeDateStr(prev30Start);
  const nowStr = safeDateStr(now);

  const [allRes, last30Res, prev30Res] = await Promise.all([
    supabase
      .from('entries')
      .select('date, co2e_value, category, activities(key)')
      .eq('project_id', projectId),
    supabase
      .from('entries')
      .select('co2e_value, category, activities(key), date')
      .eq('project_id', projectId)
      .gte('date', last30Str),
    supabase
      .from('entries')
      .select('co2e_value, category, activities(key), date')
      .eq('project_id', projectId)
      .gte('date', prev30Str)
      .lt('date', last30Str),
  ]);

  const allEntries = (allRes.data || []) as EntryLite[];
  if (!allEntries.length) return [];

  const catMapAll = groupByCategory(allEntries);
  const totalAll = Array.from(catMapAll.values()).reduce((s, v) => s + v.total, 0);

  const last30Entries = (last30Res.data || []) as EntryLite[];
  const prev30Entries = (prev30Res.data || []) as EntryLite[];
  const last30Kg = last30Entries.reduce((s, e) => s + (Number(e.co2e_value) || 0), 0);
  const prev30Kg = prev30Entries.reduce((s, e) => s + (Number(e.co2e_value) || 0), 0);

  let opps: Opportunity[] = [];
  const hc = computeHighConcentrationOpportunity(catMapAll);
  if (hc) opps.push(hc);
  const sb = computeSelfBenchmarkOpportunity(last30Kg, prev30Kg);
  if (sb) opps.push(sb);
  const rb = computeRebarAlternativeOpportunity(catMapAll, totalAll);
  if (rb) opps.push(rb);

  // Deduplicate by category: keep highest-impact per category (self-benchmark has no category)
  const byCategory = new Map<string, Opportunity>();
  const withoutCategory: Opportunity[] = [];
  for (const o of opps) {
    const cat = o.meta?.category as string | undefined;
    if (!cat) { withoutCategory.push(o); continue; }
    const prev = byCategory.get(cat);
    if (!prev || (o.impact.co2eKg || 0) > (prev.impact.co2eKg || 0)) byCategory.set(cat, o);
  }
  opps = [...byCategory.values(), ...withoutCategory];

  // Attach period info for trend for better details links
  for (const o of opps) {
    if (o.ruleId === 'self-benchmark-trend') {
      o.meta = { ...(o.meta || {}), period: { start: last30Str, end: nowStr } };
    }
  }

  // Filter out dismissed by this user if table exists
  if (opts?.userId) {
    try {
      const { data: dismissed } = await supabase
        .from('dismissed_opportunities')
        .select('opportunity_key')
        .eq('project_id', projectId)
        .eq('user_id', opts.userId);
      const set = new Set<string>((dismissed || []).map((d: any) => String(d.opportunity_key)));
      const filtered = opps.filter((o) => !set.has(o.id));
      // Order by estimated impact descending
      filtered.sort((a, b) => (b.impact.co2eKg || 0) - (a.impact.co2eKg || 0));
      return filtered;
    } catch {
      // table may not exist yet; ignore
    }
  }

  // Order by estimated impact descending
  opps.sort((a, b) => (b.impact.co2eKg || 0) - (a.impact.co2eKg || 0));
  return opps;
}
