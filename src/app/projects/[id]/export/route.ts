import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const projectId = params.id;
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: true });

  if (error) return new Response(error.message, { status: 400 });

  const headers = [
    'id','type','scope','category','amount','unit','date','location','calculation_method','factor_source','factor_version','co2e_value','co2e_unit','notes'
  ];
  const rows = (data ?? []).map((e) => [
    e.id, e.type, e.scope ?? '', e.category ?? '', e.amount, e.unit, e.date, e.location ?? '', e.calculation_method ?? '', e.factor_source ?? '', e.factor_version ?? '', e.co2e_value ?? '', e.co2e_unit ?? 'kg', (e.notes ?? '').replace(/\n/g, ' ')
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="project_${projectId}_entries.csv"`
    }
  });
}


