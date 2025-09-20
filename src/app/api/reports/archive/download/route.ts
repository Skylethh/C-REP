import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// GET /api/reports/archive/download?id=<generated_reports.id>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from('generated_reports')
      .select('id, file_path, title, project_id')
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // file_path like 'project-reports/{projectId}/...pdf'
  const bucket = 'project-reports';
  // Objects are stored with a leading 'project-reports/' folder in their name (by design).
  // createSignedUrl expects the key relative to the bucket root, which includes that folder segment.
  const storageKey = String(row.file_path);
  const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(storageKey, 60 * 5);
    if (signErr || !signed?.signedUrl) return NextResponse.json({ error: signErr?.message || 'cannot sign' }, { status: 400 });

    return NextResponse.redirect(signed.signedUrl);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
