import React from 'react';
import { NextRequest } from 'next/server';
import { createClient } from '../../../../lib/server';
import { renderToBuffer, Font } from '@react-pdf/renderer';
import ReportDocument from '../../../../components/reports/ReportDocument';
import { generateReportTitle } from '../../../../lib/utils';
import fs from 'node:fs';
import path from 'node:path';
import pkg from '../../../../../package.json' assert { type: 'json' };
import crypto from 'node:crypto';

export const runtime = 'nodejs';

type Body = {
  jobId?: string;
};

export async function POST(req: NextRequest) {
  let phase = 'init';
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const supabase = await createClient();

    const jobId = body?.jobId || '';
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId gerekli' }), { status: 400 });
    }

    // Load job
    phase = 'load-job';
    const { data: job, error: jobErr } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (jobErr) return new Response(JSON.stringify({ error: jobErr.message }), { status: 400 });
    if (!job) return new Response(JSON.stringify({ error: 'job bulunamadı' }), { status: 404 });
    if (job.status && job.status !== 'pending') {
      return new Response(JSON.stringify({ status: job.status, note: 'işlemde olmayan iş' }), { status: 200 });
    }

    // Mark processing
    phase = 'mark-processing';
    await supabase.from('report_jobs').update({ status: 'processing', error: null }).eq('id', jobId);

    // Try to load fonts (best-effort)
    try {
      const toAbsPath = (p: string) => (p.startsWith('/public/') ? path.join(process.cwd(), p.substring(1)) : path.join(process.cwd(), p));
      const regularLocal = toAbsPath('public/fonts/segoeui.ttf');
      const boldLocal = toAbsPath('public/fonts/segoeuib.ttf');
      const fonts: Array<{ src: string; fontWeight?: number }> = [];
      if (fs.existsSync(regularLocal)) fonts.push({ src: regularLocal });
      if (fs.existsSync(boldLocal)) fonts.push({ src: boldLocal, fontWeight: 700 });
      if (fonts.length) {
        Font.register({ family: 'TRFont', fonts });
      }
    } catch {}

    // Fetch project meta (name, logo)
    phase = 'project-meta';
    const projectId: string = job.project_id;
    let effectiveProjectName = `Proje ${projectId}`;
    let logoDataUrl: string | undefined = undefined;
    const { data: proj } = await supabase
      .from('projects')
      .select('name, organizations(logo_url)')
      .eq('id', projectId)
      .maybeSingle();
    if ((proj as any)?.name) effectiveProjectName = (proj as any).name as string;
    if (typeof job.logo_data_url === 'string' && job.logo_data_url.startsWith('data:')) {
      logoDataUrl = job.logo_data_url as string;
    } else if ((proj as any)?.organizations?.logo_url) {
      // Best-effort: try to fetch and convert org logo to data URL
      try {
        const logoUrl: string = String((proj as any).organizations.logo_url);
        const resp = await fetch(logoUrl);
        if (resp.ok) {
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          const isPng = ct.includes('png');
          const isJpeg = ct.includes('jpeg') || ct.includes('jpg');
          if (isPng || isJpeg) {
            const buf = await resp.arrayBuffer();
            const b64 = Buffer.from(buf).toString('base64');
            const mime = isJpeg ? 'image/jpeg' : 'image/png';
            logoDataUrl = `data:${mime};base64,${b64}`;
          }
        }
      } catch {}
    }

    // Query entries filtered by job
    phase = 'query-entries';
    const q = supabase
      .from('entries')
      .select('date, type, amount, unit, co2e_value, scope, category, activities(name, key)', { count: 'exact' })
      .eq('project_id', projectId);
    if (job.date_start) q.gte('date', job.date_start as string);
    if (job.date_end) q.lte('date', job.date_end as string);
    if (job.type && ['energy','transport','materials','other'].includes(job.type)) q.eq('type', job.type);
    if (job.scope && ['scope1','scope2','scope3'].includes(job.scope)) q.eq('scope', job.scope);
    const { data, count, error } = (await q) as any;
    if (error) throw new Error(error.message);

    const totalEmissions = (data || []).reduce((sum: number, r: any) => sum + (Number(r?.co2e_value) || 0), 0);
    const byScope = (data || []).reduce((acc: Record<string, number>, r: any) => {
      const key = r.scope || 'scope3';
      acc[key] = (acc[key] || 0) + (Number(r.co2e_value) || 0);
      return acc;
    }, {} as Record<string, number>);
    const byCategory = (data || []).reduce((acc: Record<string, number>, r: any) => {
      const key = r.category || r.type || 'Diğer';
      acc[key] = (acc[key] || 0) + (Number(r.co2e_value) || 0);
      return acc;
    }, {} as Record<string, number>);
    const byMonth = (data || []).reduce((acc: Record<string, number>, r: any) => {
      const d = new Date(r.date as string);
      const ym = Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : String(r.date).slice(0,7);
      acc[ym] = (acc[ym] || 0) + (Number(r.co2e_value) || 0);
      return acc;
    }, {} as Record<string, number>);
    const kpis = { totalEmissions, entryCount: count ?? (data?.length || 0), topSource: null as string | null, anomalyCount: 0, summary: '' };
    const entries = (data || []).map((r: any) => ({
      date: r.date,
      activityName: r.activities?.name || r.type || '',
      category: r.category || r.type || 'Diğer',
      amount: typeof r.amount === 'number' ? r.amount : (r.amount ? Number(r.amount) : null),
      unit: r.unit || '',
      co2e_value: Number(r.co2e_value) || 0,
    }));

    // Render buffer
    phase = 'render';
    const nowIso = new Date().toISOString();
    const reportId = `${projectId}-${nowIso.replace(/[^0-9]/g, '').slice(0, 14)}`;
    const digestInput = JSON.stringify({ projectId, dateStart: job.date_start, dateEnd: job.date_end, type: job.type, scope: job.scope, entries, kpis, charts: { byScope, byCategory } });
    const checksum = crypto.createHash('sha256').update(digestInput).digest('hex');
    const reportTitle = (job.title as string) || generateReportTitle(effectiveProjectName, { from: job.date_start as string, to: job.date_end as string });
    const safeName = reportTitle.replace(/[^a-zA-Z0-9-_]+/g, '_');

    const buffer = await renderToBuffer(
      <ReportDocument
        projectName={effectiveProjectName}
        dateStart={job.date_start as string}
        dateEnd={job.date_end as string}
        reportTitle={reportTitle}
        logoUrl={logoDataUrl}
        kpis={kpis}
        entries={entries}
        charts={{ byScope, byCategory, byMonth }}
        filters={{ type: job.type, scope: job.scope }}
        appVersion={(pkg as any)?.version || undefined}
        reportId={reportId}
        checksum={checksum}
      />
    );

    // Upload to storage
    phase = 'upload';
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const bucket = 'project-reports';
    const storageKey = `project-reports/${projectId}/${ts}_${safeName}.pdf`;
    const arrayBuffer = new Uint8Array(buffer).buffer;
    const { error: upErr } = await supabase.storage.from(bucket).upload(storageKey, arrayBuffer, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new Error(upErr.message || 'upload failed');

    // Insert into archive
    phase = 'archive-insert';
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || job.created_by || null;
    const file_path = `${bucket}/${storageKey.replace(/^project-reports\//, '')}`;
    await supabase.from('generated_reports').insert({
      project_id: projectId,
      title: reportTitle,
      file_path,
      mime: 'application/pdf',
      size: buffer.byteLength,
      created_by: userId,
      period_start: job.date_start || null,
      period_end: job.date_end || null,
      scope: job.scope || null,
      type: job.type || null,
      report_id: reportId,
      checksum_sha256: checksum,
    });

    // Mark complete
    phase = 'mark-complete';
    await supabase.from('report_jobs').update({ status: 'complete', error: null, output_path: file_path }).eq('id', jobId);
    return new Response(JSON.stringify({ ok: true, status: 'complete', output_path: file_path }), { status: 200 });
  } catch (err: any) {
    console.error('process job failed', err);
    try {
      const body = await req.json().catch(() => ({} as any));
      const jobId = (body as any)?.jobId;
      if (jobId) {
        const supabase = await createClient();
        await supabase.from('report_jobs').update({ status: 'failed', error: String(err?.message || err) }).eq('id', jobId);
      }
    } catch {}
    return new Response(JSON.stringify({ error: 'process job failed', phase: phase }), { status: 500 });
  }
}
