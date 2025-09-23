import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'id gerekli' }), { status: 400 });
    }
    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    if (!job) return new Response(JSON.stringify({ error: 'job bulunamadı' }), { status: 404 });

    let signedUrl: string | null = null;
    if (job.status === 'complete' && job.output_path) {
      // output_path is like: "project-reports/<project_id>/<file>.pdf"
      const fp: string = String(job.output_path);
      const slash = fp.indexOf('/');
      if (slash > 0) {
        const bucket = fp.slice(0, slash);
        const path = fp.slice(slash + 1);
        const { data: signed, error: signErr } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 10); // 10 minutes
        if (!signErr) signedUrl = signed?.signedUrl || null;
      }
    }

    return new Response(
      JSON.stringify({
        id: job.id,
        status: job.status,
        error: job.error || null,
        output_path: job.output_path || null,
        signedUrl,
        project_id: job.project_id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('job status failed', err);
    return new Response(JSON.stringify({ error: 'job status failed' }), { status: 500 });
  }
}
