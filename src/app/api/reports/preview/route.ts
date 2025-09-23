import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';
import { findDataAnomalies, generateSmartSummary, generateLLMSummaryGroq } from '@/lib/analysis';
import { getReportData } from '@/app/actions/reports';

export const runtime = 'nodejs';

type Body = {
  projectId?: string;
  dateStart?: string;
  dateEnd?: string;
  type?: string;
  scope?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { projectId, dateStart, dateEnd } = body;

    if (!projectId || !dateStart || !dateEnd) {
      return new Response(
        JSON.stringify({ error: 'projectId, dateStart, dateEnd gerekli' }),
        { status: 400 }
      );
    }

    const agg = await getReportData({ projectId, dateStart, dateEnd, type: body.type as any, scope: body.scope as any });

    // We still need by-type breakdown for topSource and anomaly calc; build lightweight query to fetch type and values only
    const supabase = await createClient();
    const q2 = supabase
      .from('entries')
      .select('co2e_value, type')
      .eq('project_id', projectId)
      .gte('date', dateStart)
      .lte('date', dateEnd);
    if (body.type && ['energy','transport','materials','other'].includes(body.type)) q2.eq('type', body.type);
    if (body.scope && ['scope1','scope2','scope3'].includes(body.scope)) q2.eq('scope', body.scope);
    const { data: rows2 } = await q2;
    const byType = (rows2 || []).reduce<Record<string, number>>((acc, r: any) => {
      const t = r?.type || 'other';
      const v = Number(r?.co2e_value) || 0;
      acc[t] = (acc[t] || 0) + v;
      return acc;
    }, {});
    const topSource = Object.entries(byType).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null;
    const values = (rows2 || []).map((r: any) => Number(r?.co2e_value) || 0);
    const anomalyCount = findDataAnomalies(values, 3).length;

    // Rule-based smart summary (no external API): concise 1-2 sentences
    // Prefer LLM summary when enabled; otherwise fallback to rule-based summary
  let summary = agg.summary || generateSmartSummary(agg.totalEmissions_tCO2e * 1000, agg.entryCount, byType, anomalyCount);
    try {
      const topSourcePair = Object.entries(byType).sort((a,b) => b[1]-a[1])[0];
      const totalEmissionsKg = agg.totalEmissions_tCO2e * 1000;
      const llm = await generateLLMSummaryGroq({
        projectName: undefined,
        totalEmissions: totalEmissionsKg,
        entryCount: agg.entryCount,
        topSource: topSourcePair ? { name: topSourcePair[0], percentage: (topSourcePair[1] / Math.max(totalEmissionsKg,1)) * 100 } : null,
        dateStart: dateStart!,
        dateEnd: dateEnd!,
      });
      if (llm) summary = llm;
    } catch {}

    const result = {
  entryCount: agg.entryCount,
      totalEmissions: agg.totalEmissions_tCO2e * 1000,
      topSource,
      anomalyCount,
        summary,
      projectId,
      dateStart,
      dateEnd,
      series: (agg.timeSeries_tCO2e || []).map((x) => ({ month: x.month, totalKg: (x.total_tCO2e || 0) * 1000 })),
      byScope_tCO2e: agg.byScope_tCO2e,
      byCategory_tCO2e: agg.byCategory_tCO2e,
      topActivities_tCO2e: agg.topActivities_tCO2e,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Preview compute failed', err);
    return new Response(
      JSON.stringify({ error: 'Preview compute failed' }),
      { status: 500 }
    );
  }
}
