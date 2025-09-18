import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(req: Request, { params }: { params: { logId: string } }) {
  try {
    const { logId } = params;
    const body = await req.json();
    const equipment_name = String(body.equipment_name || '');
    const hours = Number(body.hours || 0);

  const supabase = await createClient();

    const { data, error } = await supabase
      .from('daily_log_equipment')
      .insert({ log_id: logId, equipment_name, hours })
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
    const { error } = await supabase.from('daily_log_equipment').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
