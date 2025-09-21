import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { normalizeCategory } from '@/lib/categoryAliases';

// Legacy endpoint upgraded to unified flow: also creates an emission entry and links entry_id
export async function POST(req: Request, context: { params: Promise<{ logId: string }> }) {
  try {
    const { logId } = await context.params;
    const body = await req.json();
    const activity_id = String(body.activity_id || '');
    const amount = Number(body.quantity || 0);
    const unit = String(body.unit || '');

    if (!activity_id || !amount || !unit) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const supabase = await createClient();

    // Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });

    // Get daily log context (project_id, date)
    const { data: log } = await supabase
      .from('daily_logs')
      .select('project_id, date')
      .eq('id', logId)
      .maybeSingle();
    if (!log?.project_id || !log?.date) {
      return NextResponse.json({ error: 'Günlük bulunamadı' }, { status: 404 });
    }

    // Enrich activity
    const { data: activity } = await supabase
      .from('activities')
      .select('id, type, scope, category, key')
      .eq('id', activity_id)
      .maybeSingle();
    if (!activity) {
      return NextResponse.json({ error: 'Aktivite bulunamadı' }, { status: 400 });
    }

    // Resolve emission factor (date-aware)
    const date = String(log.date);
    let factor: any = null;
    {
      const q = supabase
        .from('activity_factors')
        .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
        .eq('activity_id', activity.id)
        .eq('emission_factors.region', 'global')
        .neq('emission_factors.value', 0)
        .order('emission_factors.valid_from', { ascending: false })
        .limit(1);
      if (date) (q as any).lte('emission_factors.valid_from', date);
      const { data: mapped } = await q.maybeSingle();
      if ((mapped as any)?.emission_factors) factor = (mapped as any).emission_factors as any;
    }
    if (!factor) {
      const normalizedCategory = normalizeCategory(activity.category ?? activity.type) || (activity.category ?? activity.type);
      const fq = supabase
        .from('emission_factors')
        .select('unit_in, unit_out, value, valid_from')
        .eq('category', normalizedCategory)
        .eq('region', 'global')
        .neq('value', 0)
        .order('valid_from', { ascending: false })
        .limit(1);
      if (date) (fq as any).lte('valid_from', date);
      const { data: fac } = await fq.maybeSingle();
      if (fac) factor = fac as any;
      // Fallback: ignore date if none found
      if (!factor) {
        const fq2 = await supabase
          .from('emission_factors')
          .select('unit_in, unit_out, value, valid_from')
          .eq('category', normalizedCategory)
          .eq('region', 'global')
          .neq('value', 0)
          .order('valid_from', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fq2.data) factor = fq2.data as any;
      }
      // Fallback: relaxed prefix match on category
      if (!factor) {
        const fqp = await supabase
          .from('emission_factors')
          .select('unit_in, unit_out, value, valid_from')
          .ilike('category', `${normalizedCategory}%`)
          .eq('region', 'global')
          .neq('value', 0)
          .order('valid_from', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fqp.data) factor = fqp.data as any;
      }
      if (!factor && activity.key) {
        const normalizedKey = normalizeCategory(activity.key) || activity.key;
        const fk = supabase
          .from('emission_factors')
          .select('unit_in, unit_out, value, valid_from')
          .eq('category', normalizedKey)
          .eq('region', 'global')
          .neq('value', 0)
          .order('valid_from', { ascending: false })
          .limit(1);
        if (date) (fk as any).lte('valid_from', date);
        const { data: fac3 } = await fk.maybeSingle();
        if (fac3) factor = fac3 as any;
        // Fallback: ignore date
        if (!factor) {
          const fk2 = await supabase
            .from('emission_factors')
            .select('unit_in, unit_out, value, valid_from')
            .eq('category', normalizedKey)
            .eq('region', 'global')
            .neq('value', 0)
            .order('valid_from', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fk2.data) factor = fk2.data as any;
        }
        // Fallback: relaxed prefix match on key
        if (!factor) {
          const fkp = await supabase
            .from('emission_factors')
            .select('unit_in, unit_out, value, valid_from')
            .ilike('category', `${normalizedKey}%`)
            .eq('region', 'global')
            .neq('value', 0)
            .order('valid_from', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fkp.data) factor = fkp.data as any;
        }
      }
    }
    if (!factor) return NextResponse.json({ error: 'Uygun emisyon faktörü bulunamadı' }, { status: 400 });

    // Unit conversion
    let multiplier = 1;
    if (unit !== factor.unit_in) {
      const { data: conv } = await supabase
        .from('unit_conversions')
        .select('multiplier')
        .eq('from_unit', unit)
        .eq('to_unit', factor.unit_in)
        .maybeSingle();
      if (!conv?.multiplier) return NextResponse.json({ error: `'${unit}' → '${factor.unit_in}' dönüşüm bulunamadı` }, { status: 400 });
      multiplier = Number(conv.multiplier);
    }

    // Compute CO2e (normalize to kg)
    const normalized = amount * multiplier;
    const raw = normalized * Number(factor.value);
    let co2e_value: number | null = null;
    let co2e_unit: string | null = null;
    if (factor.unit_out === 'g') { co2e_value = raw / 1000; co2e_unit = 'kg'; }
    else if (factor.unit_out === 't' || factor.unit_out === 'ton' || factor.unit_out === 'tons') { co2e_value = raw * 1000; co2e_unit = 'kg'; }
    else { co2e_value = raw; co2e_unit = 'kg'; }

    // Create entry via RPC (same as unified flow)
    const { data: newId, error: rpcErr } = await supabase.rpc('create_entry_privileged', {
      p_project_id: log.project_id,
      p_user_id: user.id,
      p_type: activity.type || 'materials',
      p_date: date,
      p_amount: amount,
      p_unit: unit,
      p_scope: activity.scope || null,
      p_category: activity.category || null,
      p_activity_id: activity.id,
      p_notes: '',
      p_co2e_value: co2e_value,
      p_co2e_unit: co2e_unit,
    });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });

    // Insert daily_log_materials linked with entry_id
    const { data, error } = await supabase
      .from('daily_log_materials')
      .insert({ log_id: logId, activity_id, quantity: amount, unit, entry_id: newId })
      .select('*, activities(name, default_unit, units)')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    try {
      revalidatePath(`/projects/${log.project_id}/daily-logs/${logId}`);
      revalidatePath(`/entries`);
      revalidatePath(`/dashboard`);
    } catch {}
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
