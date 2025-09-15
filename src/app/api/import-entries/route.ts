import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';

type Payload = {
  projectId: string;
  mapping: Record<string, string>;
  rows: Array<Record<string, string>>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { projectId, mapping, rows } = body;
    if (!projectId || !rows?.length) return new Response('Bad Request', { status: 400 });

    const required = ['date', 'type', 'amount', 'unit'];
    for (const f of required) {
      if (!mapping[f]) return new Response(`Eksik eşleme: ${f}`, { status: 400 });
    }

    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in small batches to avoid timeouts
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      // Map rows
      const mapped = slice.map((r) => {
        const get = (k: string) => (mapping[k] ? (r[mapping[k]] ?? '').toString().trim() : '');
        const amount = Number(get('amount'));
        return {
          project_id: projectId,
          type: (get('type') as any) || 'energy',
          date: get('date'),
          amount: isFinite(amount) ? amount : null,
          unit: get('unit'),
          category: get('category') || null,
          scope: get('scope') || null,
          notes: get('notes') || null,
          created_by: user.id,
        };
      });

      // Basic validation
      const valid = mapped.filter((m) => m.date && m.amount && m.amount > 0 && m.unit && m.type);
      const { error } = await supabase.from('entries').insert(valid);
      if (error) {
        // Best effort: try row by row to get partial success
        for (const m of valid) {
          const { error: e } = await supabase.from('entries').insert(m).select('id').maybeSingle();
          if (e) {
            failed += 1;
            errors.push(e.message);
          } else {
            inserted += 1;
          }
        }
      } else {
        inserted += valid.length;
      }
    }

    return Response.json({ inserted, failed, errors });
  } catch (e: any) {
    return new Response(e?.message || 'Import error', { status: 500 });
  }
}


