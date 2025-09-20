import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';
import { findDataAnomalies, generateSmartSummary, generateLLMSummaryGroq } from '@/lib/analysis';

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

    const supabase = await createClient();

    // Build filtered query similar to project page
    const q = supabase
      .from('entries')
      .select('co2e_value, type', { count: 'exact' })
      .eq('project_id', projectId);
    if (dateStart) q.gte('date', dateStart);
    if (dateEnd) q.lte('date', dateEnd);
    if (body.type && ['energy','transport','materials','other'].includes(body.type)) q.eq('type', body.type);
    if (body.scope && ['scope1','scope2','scope3'].includes(body.scope)) q.eq('scope', body.scope);

    const { data, count, error } = await q;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

  const totalEmissions = (data || []).reduce((sum, r) => sum + (Number((r as any).co2e_value) || 0), 0);
    const byType = (data || []).reduce<Record<string, number>>((acc, r) => {
      const t = (r as any).type || 'other';
      acc[t] = (acc[t] || 0) + (Number((r as any).co2e_value) || 0);
      return acc;
    }, {});
    const topSource = Object.entries(byType).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null;

    // Simple anomaly detection: z-score > 3 based on co2e_value
  const values = (data || []).map((r) => Number((r as any).co2e_value) || 0);
  const anomalyCount = findDataAnomalies(values, 3).length;

    // Rule-based smart summary (no external API): concise 1-2 sentences
    // Prefer LLM summary when enabled; otherwise fallback to rule-based summary
    let summary = generateSmartSummary(totalEmissions, count ?? (data?.length || 0), byType, anomalyCount);
    try {
      const topSourcePair = Object.entries(byType).sort((a,b) => b[1]-a[1])[0];
      const llm = await generateLLMSummaryGroq({
        projectName: undefined,
        totalEmissions,
        entryCount: count ?? (data?.length || 0),
        topSource: topSourcePair ? { name: topSourcePair[0], percentage: (topSourcePair[1] / Math.max(totalEmissions,1)) * 100 } : null,
        dateStart: dateStart!,
        dateEnd: dateEnd!,
      });
      if (llm) summary = llm;
    } catch {}

    const result = {
      entryCount: count ?? (data?.length || 0),
      totalEmissions,
      topSource,
      anomalyCount,
  summary,
      projectId,
      dateStart,
      dateEnd,
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
