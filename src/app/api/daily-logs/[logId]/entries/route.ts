import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { z } from 'zod';
// Note: We intentionally inline the RPC path here instead of importing server action logic
import { revalidatePath } from 'next/cache';

const bodySchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(['energy','transport','materials','other']),
  date: z.string().min(1),
  amount: z.preprocess((v) => Number(v), z.number().positive()),
  unit: z.string().min(1).max(16),
  notes: z.string().max(1000).optional().default(''),
  activity_id: z.string().uuid().optional(),
  scope: z.enum(['scope1','scope2','scope3']).optional(),
  category: z.string().optional(),
});

export async function POST(req: Request, context: { params: Promise<{ logId: string }> }) {
  try {
    const { logId } = await context.params;
    const supabase = await createClient();
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Geçersiz veri';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const formData = new FormData();
    for (const [k, v] of Object.entries(parsed.data)) formData.append(k, String(v ?? ''));

    // Use auth and permissions like in server action
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });
    // Reuse the existing createEntry logic (this redirects in SSR action, so we run the core RPC here similarly)
    // For exact parity and validations (dup, anomaly, factor), call createEntry in a safe way:
    // We can't await createEntry directly (it triggers redirect), so we inline via the same RPC path as fallback.
    // To keep it consistent with your standalone flow, we'll pick minimal path: create_entry_privileged and rely on DB rules.

    // Fetch activity to enrich (same as server.ts pre-logic)
    let activity: any = null;
    if (parsed.data.activity_id) {
      const { data: act } = await supabase
        .from('activities')
        .select('id, type, scope, category, key')
        .eq('id', parsed.data.activity_id)
        .maybeSingle();
      activity = act;
    }

    // Compute CO2e using the same approach as standalone server.ts
    const type = activity?.type || parsed.data.type;
    const date = parsed.data.date;
    const amount = parsed.data.amount;
    const unit = parsed.data.unit;
    const factorCategory = parsed.data.category || activity?.category || type;

    // Try factor via activity_factors with date awareness
    let factor: any = null;
    if (activity?.id) {
      const q = supabase
        .from('activity_factors')
        .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
        .eq('activity_id', activity.id)
        .eq('emission_factors.region', 'global')
        .order('emission_factors.valid_from', { ascending: false })
        .limit(1);
      if (date) (q as any).lte('emission_factors.valid_from', date);
      let { data: mapped } = await q.maybeSingle();
      if ((mapped as any)?.emission_factors) {
        factor = (mapped as any).emission_factors as any;
      }
      if (!factor) {
        const q2 = supabase
          .from('activity_factors')
          .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
          .eq('activity_id', activity.id)
          .eq('emission_factors.region', 'global')
          .order('emission_factors.valid_from', { ascending: false })
          .limit(1);
        const { data: mapped2 } = await q2.maybeSingle();
        if ((mapped2 as any)?.emission_factors) {
          factor = (mapped2 as any).emission_factors as any;
        }
      }
    }
    if (!factor) {
      let fq = supabase
        .from('emission_factors')
        .select('unit_in, unit_out, value, valid_from')
        .eq('category', factorCategory)
        .eq('region', 'global')
        .order('valid_from', { ascending: false })
        .limit(1);
      if (date) (fq as any).lte('valid_from', date);
      let { data: fac } = await fq.maybeSingle();
      if (fac) factor = fac as any;
      if (!factor && activity?.key) {
        let fk = supabase
          .from('emission_factors')
          .select('unit_in, unit_out, value, valid_from')
          .eq('category', activity.key)
          .eq('region', 'global')
          .order('valid_from', { ascending: false })
          .limit(1);
        if (date) (fk as any).lte('valid_from', date);
        let { data: fac3 } = await fk.maybeSingle();
        if (fac3) factor = fac3 as any;
      }
    }
    if (!factor) {
      return NextResponse.json({ error: 'Uygun emisyon faktörü bulunamadı' }, { status: 400 });
    }

    // Unit conversion to factor.unit_in
    let multiplier = 1;
    if (unit !== factor.unit_in) {
      const { data: conv } = await supabase
        .from('unit_conversions')
        .select('multiplier')
        .eq('from_unit', unit)
        .eq('to_unit', factor.unit_in)
        .maybeSingle();
      if (!conv?.multiplier) {
        return NextResponse.json({ error: `'${unit}' biriminden '${factor.unit_in}' birimine dönüşüm bulunamadı` }, { status: 400 });
      }
      multiplier = Number(conv.multiplier);
    }
    const normalized = amount * multiplier;
    const raw = normalized * Number(factor.value);
    let co2e_value: number | null = null;
    let co2e_unit: string | null = null;
    if (factor.unit_out === 'g') {
      co2e_value = raw / 1000;
      co2e_unit = 'kg';
    } else if (factor.unit_out === 't' || factor.unit_out === 'ton' || factor.unit_out === 'tons') {
      co2e_value = raw * 1000;
      co2e_unit = 'kg';
    } else {
      co2e_value = raw;
      co2e_unit = 'kg';
    }

    const { data: newId, error } = await supabase.rpc('create_entry_privileged', {
      p_project_id: parsed.data.project_id,
      p_user_id: user.id,
      p_type: activity?.type || parsed.data.type,
      p_date: parsed.data.date,
      p_amount: parsed.data.amount,
      p_unit: parsed.data.unit,
      p_scope: parsed.data.scope || activity?.scope || null,
      p_category: parsed.data.category || activity?.category || null,
      p_activity_id: activity?.id || null,
      p_notes: parsed.data.notes || '',
      p_co2e_value: co2e_value,
      p_co2e_unit: co2e_unit,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Insert daily_log_materials summary row
    const { data: dlm, error: e2 } = await supabase
      .from('daily_log_materials')
      .insert({ log_id: logId, activity_id: parsed.data.activity_id, quantity: parsed.data.amount, unit: parsed.data.unit, entry_id: newId })
      .select('*, activities(name, default_unit, units)')
      .single();
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

    // Revalidate relevant paths
    try {
      revalidatePath(`/projects/${parsed.data.project_id}/daily-logs/${logId}`);
      revalidatePath(`/entries`);
      revalidatePath(`/dashboard`);
    } catch {}
  return NextResponse.json({ entryId: newId, dailyLogMaterialId: dlm.id, dailyLogMaterial: dlm });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
