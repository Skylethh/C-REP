import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(req: Request, context: { params: Promise<{ logId: string }> }) {
  try {
    const { logId } = await context.params;
    const body = await req.json();
    const contractor = typeof body.contractor === 'string' ? body.contractor : null;
    const trade = typeof body.trade === 'string' ? body.trade : null;
    const person_count = Number(body.person_count || 0);

  const supabase = await createClient();

    const { data, error } = await supabase
      .from('daily_log_manpower')
      .insert({ log_id: logId, contractor, trade, person_count })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
  const supabase = await createClient();

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const { error } = await supabase.from('daily_log_manpower').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
