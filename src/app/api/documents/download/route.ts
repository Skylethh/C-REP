import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project');
    const path = searchParams.get('path');
    if (!projectId || !path) return NextResponse.json({ error: 'missing params' }, { status: 400 });

    const supabase = await createClient();
    // membership check via any doc in the project (cheap check using projects policy)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // Ensure the requested path is a revision under this project; relies on RLS for access control
    const { data: revRows, error: revErr } = await supabase
      .from('document_revisions')
      .select('id, document_id, file_path, documents!inner(project_id)')
      .eq('file_path', path)
      .eq('documents.project_id', projectId)
      .limit(1);
    if (revErr) return NextResponse.json({ error: revErr.message }, { status: 400 });
    if (!revRows || revRows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Generate signed URL. The storage key we stored starts with 'project-files/'
    const storageKey = path.replace(/^project-files\//, '');
    const { data, error } = await supabase.storage.from('project-files').createSignedUrl(storageKey, 60 * 5);
    if (error || !data?.signedUrl) return NextResponse.json({ error: error?.message || 'cannot sign' }, { status: 400 });
    return NextResponse.redirect(data.signedUrl);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
