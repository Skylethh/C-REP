"use server";
import { createClient } from "@/lib/server";

export type GetReportDataParams = {
  projectId: string;
  dateStart: string; // yyyy-mm-dd
  dateEnd: string; // yyyy-mm-dd
  type?: "energy" | "transport" | "materials" | "other";
  scope?: "scope1" | "scope2" | "scope3";
};

export type ReportData = {
  totalEmissions_tCO2e: number;
  entryCount: number;
  byScope_tCO2e: Record<string, number>;
  byCategory_tCO2e: Record<string, number>;
  topActivities_tCO2e: Array<{ name: string; total_tCO2e: number }>;
  timeSeries_tCO2e: Array<{ month: string; total_tCO2e: number }>; // YYYY-MM
  // Optional, quick rule-based summary (client may also compute)
  summary?: string;
};

export async function getReportData(params: GetReportDataParams): Promise<ReportData> {
  const { projectId, dateStart, dateEnd, type, scope } = params;
  const supabase = await createClient();

  // Single entries query (RLS applies)
  const q = supabase
    .from("entries")
    .select("date, type, scope, category, co2e_value, activities(name)", { count: "exact" })
    .eq("project_id", projectId);
  if (dateStart) q.gte("date", dateStart);
  if (dateEnd) q.lte("date", dateEnd);
  if (type && ["energy", "transport", "materials", "other"].includes(type)) q.eq("type", type);
  if (scope && ["scope1", "scope2", "scope3"].includes(scope)) q.eq("scope", scope);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<{
    date: string;
    type: string;
    scope?: string | null;
    category?: string | null;
    co2e_value?: number | null;
    activities?: { name?: string | null } | null;
  }>;

  // Aggregations in-memory (keeps DB roundtrips minimal)
  let totalKg = 0;
  const byScopeKg: Record<string, number> = { };
  const byCategoryKg: Record<string, number> = { };
  const byMonthKg: Record<string, number> = { };
  const byActivityKg: Record<string, number> = { };

  const monthKey = (s: string | null | undefined) => (s ? s.slice(0, 7) : "");

  for (const r of rows) {
    const kg = Number(r.co2e_value || 0);
    totalKg += kg;
    const cat = r.category || r.type || "Diğer";
    byCategoryKg[cat] = (byCategoryKg[cat] || 0) + kg;
    const sc = r.scope || "scope3";
    byScopeKg[sc] = (byScopeKg[sc] || 0) + kg;
    const m = monthKey(r.date);
    if (m) byMonthKg[m] = (byMonthKg[m] || 0) + kg;
    const act = (r.activities?.name || r.type || "").trim() || "Bilinmeyen";
    byActivityKg[act] = (byActivityKg[act] || 0) + kg;
  }

  const toTons = (kg: number) => (kg || 0) / 1000;
  const byScope_tCO2e: Record<string, number> = Object.fromEntries(Object.entries(byScopeKg).map(([k,v]) => [k, toTons(v)]));
  const byCategory_tCO2e: Record<string, number> = Object.fromEntries(Object.entries(byCategoryKg).map(([k,v]) => [k, toTons(v)]));
  const timeSeries_tCO2e = Object.entries(byMonthKg)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([month, kg]) => ({ month, total_tCO2e: toTons(kg) }));
  const topActivities_tCO2e = Object.entries(byActivityKg)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, kg]) => ({ name, total_tCO2e: toTons(kg) }));

  // Quick textual summary (rule-based)
  const topType = Object.entries(byCategoryKg).sort((a,b) => b[1]-a[1])[0];
  const share = topType ? (topType[1] / Math.max(totalKg, 1)) * 100 : 0;
  const summary = `Seçilen dönemde ${count ?? rows.length} kayıt ile toplam ${(toTons(totalKg)).toFixed(2)} tCO2e emisyon oluştu.${topType ? ` Emisyonların ${share.toFixed(1)}%’i ${topType[0]} kaynaklıdır.` : ''}`;

  return {
    totalEmissions_tCO2e: toTons(totalKg),
    entryCount: count ?? rows.length,
    byScope_tCO2e,
    byCategory_tCO2e,
    topActivities_tCO2e,
    timeSeries_tCO2e,
    summary,
  };
}
