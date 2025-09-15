import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const projectId = params.id;
  const url = new URL(req.url);
  const start = url.searchParams.get('start') || '';
  const end = url.searchParams.get('end') || '';
  const type = url.searchParams.get('type') || '';
  const scope = url.searchParams.get('scope') || '';
  const category = url.searchParams.get('category') || '';

  const query = supabase
    .from('entries')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: true });
  if (start) query.gte('date', start);
  if (end) query.lte('date', end);
  if (type) query.eq('type', type);
  if (scope) query.eq('scope', scope);
  if (category) query.ilike('category', `%${category}%`);

  const { data, error } = await query;

  if (error) return new Response(error.message, { status: 400 });

  const headers = [
    'id','type','scope','category','amount','unit','date','co2e_value_kg','co2e_value_display','notes'
  ];
  const rows = (data ?? []).map((e) => {
    const valueKg = Number(e.co2e_value || 0);
    const display = valueKg >= 1000 ? `${(valueKg/1000).toFixed(3)} t` : `${valueKg.toFixed(3)} kg`;
    return [
      e.id,
      e.type,
      e.scope ?? '',
      e.category ?? '',
      e.amount,
      e.unit,
      e.date,
      valueKg.toFixed(3),
      display,
      (e.notes ?? '').replace(/\n/g, ' ')
    ];
  });
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="project_${projectId}_entries.csv"`
    }
  });
}


