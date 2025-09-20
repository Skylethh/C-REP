import { NextRequest } from 'next/server';
import { renderToBuffer, Font } from '@react-pdf/renderer';
import ReportDocument from '../../../components/reports/ReportDocument';
import { createClient } from '@/lib/server';
import { generateReportTitle } from '@/lib/utils';
import { findDataAnomalies, generateSmartSummary, generateLLMSummaryGroq } from '@/lib/analysis';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs'; // ensure Node runtime for buffer rendering

type Body = {
  projectId?: string;
  projectName?: string; // optional; when missing we fetch from DB
  dateStart?: string; // yyyy-mm-dd
  dateEnd?: string; // yyyy-mm-dd
  type?: string;
  scope?: string;
  title?: string;
};
export async function POST(req: NextRequest) {
  let phase: string = 'init';
  try {
    const body = (await req.json()) as Body;
    const toAbsPath = (p: string) => {
      if (!p) return '';
      // allow /public/... shorthand
      if (p.startsWith('/public/')) return path.join(process.cwd(), p.substring(1));
      if (path.isAbsolute(p)) return p;
      return path.join(process.cwd(), p);
    };
    // Try to ensure a Turkish-capable font is available by overriding the default 'Helvetica'
    phase = 'load-fonts';
    try {
      if (process.env.REPORT_PDF_CUSTOM_FONT === 'true') {
        const regularPath = toAbsPath(process.env.REPORT_PDF_FONT_PATH || 'public/fonts/DejaVuSans.ttf');
        const boldPath = toAbsPath(process.env.REPORT_PDF_FONT_BOLD_PATH || 'public/fonts/DejaVuSans-Bold.ttf');
        const fonts = [] as Array<{ src: string; fontWeight?: number }>;
        if (fs.existsSync(regularPath)) {
          const b64 = fs.readFileSync(regularPath).toString('base64');
          fonts.push({ src: `data:font/ttf;base64,${b64}` });
        }
        if (fs.existsSync(boldPath)) {
          const b64 = fs.readFileSync(boldPath).toString('base64');
          fonts.push({ src: `data:font/ttf;base64,${b64}`, fontWeight: 700 });
        }
        if (fonts.length) {
          Font.register({ family: 'Helvetica', fonts });
        }
      } else if (process.platform === 'win32') {
        // Automatic fallback on Windows: use installed system fonts if present
        const pickFirstExisting = (paths: string[]) => paths.find((p) => fs.existsSync(p));
        const regularCandidate = pickFirstExisting([
          'C:\\Windows\\Fonts\\segoeui.ttf',
          'C:\\Windows\\Fonts\\arialuni.ttf',
          'C:\\Windows\\Fonts\\arial.ttf',
        ]);
        const boldCandidate = pickFirstExisting([
          'C:\\Windows\\Fonts\\segoeuib.ttf',
          'C:\\Windows\\Fonts\\arialbd.ttf',
        ]);
        const fonts = [] as Array<{ src: string; fontWeight?: number }>;
        if (regularCandidate) {
          const b64 = fs.readFileSync(regularCandidate).toString('base64');
          fonts.push({ src: `data:font/ttf;base64,${b64}` });
        }
        if (boldCandidate) {
          const b64 = fs.readFileSync(boldCandidate).toString('base64');
          fonts.push({ src: `data:font/ttf;base64,${b64}`, fontWeight: 700 });
        }
        if (fonts.length) {
          Font.register({ family: 'Helvetica', fonts });
        }
      }
    } catch {
      // If font loading fails, continue with defaults; text may degrade for some glyphs
    }
  const { projectId, projectName, dateStart, dateEnd } = body;

    if (!projectId || !dateStart || !dateEnd) {
      return new Response(JSON.stringify({ error: 'projectId, dateStart, dateEnd gerekli' }), { status: 400 });
    }

    phase = 'create-client';
    const supabase = await createClient();
    // Fetch project details (name if needed) and organization logo for branding
    let effectiveProjectName = projectName || `Proje ${projectId}`;
    let logoUrl: string | undefined = undefined;
    {
      phase = 'fetch-project';
      const { data: proj } = await supabase
        .from('projects')
        .select('name, organizations(logo_url)')
        .eq('id', projectId)
        .maybeSingle();
      if (!projectName && proj?.name) effectiveProjectName = proj.name;
      const org = (proj as any)?.organizations;
      if (org?.logo_url) logoUrl = String(org.logo_url);
    }

    // Pre-fetch logo and embed as data URL to avoid network fetch during PDF render
    phase = 'embed-logo';
    let embeddedLogo: string | undefined = undefined;
    if (logoUrl) {
      try {
        const resp = await fetch(logoUrl);
        if (resp.ok) {
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          // Only embed supported raster types for PDF (png/jpeg)
          const isPng = ct.includes('png');
          const isJpeg = ct.includes('jpeg') || ct.includes('jpg');
          if (isPng || isJpeg) {
            const buf = await resp.arrayBuffer();
            const b64 = Buffer.from(buf).toString('base64');
            const mime = isJpeg ? 'image/jpeg' : 'image/png';
            embeddedLogo = `data:${mime};base64,${b64}`;
          }
        }
      } catch {
        // ignore logo fetch errors; proceed without watermark/logo
      }
    }

    // Build filtered entries query for KPI compute
    phase = 'query-entries';
    const q = supabase
      .from('entries')
      .select('date, type, amount, unit, co2e_value, scope, category, activities(name, key)', { count: 'exact' })
      .eq('project_id', projectId);
    if (dateStart) q.gte('date', dateStart);
    if (dateEnd) q.lte('date', dateEnd);
    if (body.type && ['energy','transport','materials','other'].includes(body.type)) q.eq('type', body.type);
    if (body.scope && ['scope1','scope2','scope3'].includes(body.scope)) q.eq('scope', body.scope);
    const { data, count } = await q;
    const totalEmissions = (data || []).reduce((sum, r) => sum + (Number((r as any).co2e_value) || 0), 0);
    const byType = (data || []).reduce<Record<string, number>>((acc, r) => {
      const t = (r as any).type || 'other';
      acc[t] = (acc[t] || 0) + (Number((r as any).co2e_value) || 0);
      return acc;
    }, {});
    const topSource = Object.entries(byType).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null;
    // anomaly detection & smart summary (same logic as preview)
    const values = (data || []).map((r) => Number((r as any).co2e_value) || 0);
  const anomalyCount = findDataAnomalies(values, 3).length;
  let summary = generateSmartSummary(totalEmissions, count ?? (data?.length || 0), byType, anomalyCount);
  try {
    const topSourcePair = Object.entries(byType).sort((a,b) => b[1]-a[1])[0];
    const llm = await generateLLMSummaryGroq({
      projectName: effectiveProjectName,
      totalEmissions,
      entryCount: count ?? (data?.length || 0),
      topSource: topSourcePair ? { name: topSourcePair[0], percentage: (topSourcePair[1] / Math.max(totalEmissions,1)) * 100 } : null,
      dateStart: dateStart!,
      dateEnd: dateEnd!,
    });
    if (llm) summary = llm;
  } catch {}
    const kpis = { totalEmissions, topSource, entryCount: count ?? (data?.length || 0), anomalyCount, summary };

    // Charts data: scope and category breakdowns
    const byScope = (data || []).reduce<Record<string, number>>((acc, r: any) => {
      const key = r.scope || 'scope3';
      acc[key] = (acc[key] || 0) + (Number(r.co2e_value) || 0);
      return acc;
    }, {});
    const byCategory = (data || []).reduce<Record<string, number>>((acc, r: any) => {
      const key = r.category || r.type || 'Diğer';
      acc[key] = (acc[key] || 0) + (Number(r.co2e_value) || 0);
      return acc;
    }, {});

    // Normalize entries for PDF table
    const entries = (data || []).map((r: any) => ({
      date: r.date,
      activityName: r.activities?.name || r.type || '',
      category: r.category || r.type || 'Diğer',
      amount: typeof r.amount === 'number' ? r.amount : (r.amount ? Number(r.amount) : null),
      unit: r.unit || '',
      co2e_value: Number(r.co2e_value) || 0,
    }));

    phase = 'render';
    const buffer = await renderToBuffer(
      <ReportDocument
        projectName={effectiveProjectName}
        dateStart={dateStart}
        dateEnd={dateEnd}
        reportTitle={body.title || undefined}
        logoUrl={embeddedLogo || undefined}
        kpis={kpis}
        entries={entries}
        charts={{ byScope, byCategory }}
      />
    );
  // Convert Buffer -> pure ArrayBuffer (avoid SharedArrayBuffer union)
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  const arrayBuffer: ArrayBuffer = copy.buffer;

  const reportTitle = body.title || generateReportTitle(effectiveProjectName, { from: dateStart, to: dateEnd });
  const safeName = reportTitle.replace(/[^a-zA-Z0-9-_]+/g, '_');
  const fileName = `${safeName}.pdf`;

    phase = 'respond';
    return new Response(arrayBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (err) {
    console.error('Report generation failed', err);
    let message = 'Report generation failed';
    try {
      if (err instanceof Error) message = err.message;
      else if (typeof err === 'string') message = err;
    } catch {}
    // phase may not be in scope if an early parse error occurred; guard it
    const safePhase = ((): string | undefined => {
      try {
        return typeof (phase as any) === 'string' ? (phase as any) : undefined;
      } catch {
        return undefined;
      }
    })();
    return new Response(JSON.stringify({ error: message, phase: safePhase }), { status: 500 });
  }
}
