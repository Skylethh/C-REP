import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const projectId = String(body?.projectId || '');
    if (!projectId) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    const { error } = await supabase
      .from('dismissed_opportunities')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ ok: true, ignored: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, ignored: true });
  }
}
