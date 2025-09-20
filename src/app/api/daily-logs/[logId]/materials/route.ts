import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(req: Request, context: { params: Promise<{ logId: string }> }) {
  try {
    const { logId } = await context.params;
    const body = await req.json();
    const activity_id = String(body.activity_id || '');
    const quantity = Number(body.quantity || 0);
    const unit = String(body.unit || '');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('daily_log_materials')
      .insert({ log_id: logId, activity_id, quantity, unit })
      .select('*, activities(name, default_unit, units)')
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
    const { error } = await supabase.from('daily_log_materials').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
