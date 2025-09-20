import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// DELETE /api/reports/archive/delete?id=<generated_reports.id>
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from('generated_reports')
      .select('id, file_path, project_id')
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Remove storage object (ignore error, proceed to DB delete if RLS allows)
  const storageKey = String(row.file_path);
  await supabase.storage.from('project-reports').remove([storageKey]);

    const { error: delErr } = await supabase.from('generated_reports').delete().eq('id', id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
