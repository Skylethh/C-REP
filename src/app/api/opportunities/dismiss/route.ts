import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const projectId = String(body?.projectId || '');
    const opportunityId = String(body?.opportunityId || '');
    const ruleId = String(body?.ruleId || '');
    if (!projectId || !opportunityId || !ruleId) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }
    // Insert if table exists; ignore errors
    const { error } = await supabase.from('dismissed_opportunities').insert({
      user_id: user.id,
      project_id: projectId,
      rule_id: ruleId,
      opportunity_key: opportunityId,
    } as any);
    if (error) {
      // Table might not exist yet or RLS blocks; treat as best-effort success
      return NextResponse.json({ ok: true, ignored: true });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, ignored: true });
  }
}
