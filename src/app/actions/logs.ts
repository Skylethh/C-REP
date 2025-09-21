"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { normalizeCategory } from '@/lib/categoryAliases';

// Unified server action: create entry and append to daily_log_materials
export async function addActivityToDailyLog(dailyLogId: string, formData: FormData) {
  const projectId = String(formData.get('project_id') || '');
  const type = String(formData.get('type') || '');
  const date = String(formData.get('date') || '');
  const amount = Number(formData.get('amount') || 0);
  const unit = String(formData.get('unit') || '');
  const notes = String(formData.get('notes') || '');
  const activity_id = String(formData.get('activity_id') || '') || null;
  const scope = (String(formData.get('scope') || '') || null) as any;
  const category = (String(formData.get('category') || '') || null) as any;

  if (!projectId || !date || !unit || !amount || !type) {
    return { error: 'Eksik bilgi' } as const;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'login_required' } as const;
  }

  // Enrich with activity attributes if available
  let activity: any = null;
  if (activity_id) {
    const { data: act } = await supabase
      .from('activities')
      .select('id, type, scope, category, key, units, default_unit')
      .eq('id', activity_id)
      .maybeSingle();
    activity = act;
  }

  // Compute CO2e similar to standalone
  const chosenType = activity?.type || type;
  const factorCategory = category || activity?.category || chosenType;
  const normalizedCategory = normalizeCategory(factorCategory) || factorCategory;
  let factor: any = null;
  if (activity?.id) {
    const q = supabase
      .from('activity_factors')
      .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
      .eq('activity_id', activity.id)
      .eq('emission_factors.region', 'global')
      .neq('emission_factors.value', 0)
      .order('emission_factors.valid_from', { ascending: false })
      .limit(1);
    if (date) (q as any).lte('emission_factors.valid_from', date);
    let { data: mapped } = await q.maybeSingle();
    if ((mapped as any)?.emission_factors) factor = (mapped as any).emission_factors as any;
    if (!factor) {
      const q2 = supabase
        .from('activity_factors')
        .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
        .eq('activity_id', activity.id)
        .eq('emission_factors.region', 'global')
        .neq('emission_factors.value', 0)
        .order('emission_factors.valid_from', { ascending: false })
        .limit(1);
      const { data: mapped2 } = await q2.maybeSingle();
      if ((mapped2 as any)?.emission_factors) factor = (mapped2 as any).emission_factors as any;
    }
  }
  if (!factor) {
    let fq = supabase
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
    if (!factor && activity?.key) {
      const normalizedKey = normalizeCategory(activity.key) || activity.key;
      let fk = supabase
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
    }
  }
  if (!factor) {
    return { error: 'Uygun emisyon faktörü bulunamadı' } as const;
  }

  // Unit conversion
  let multiplier = 1;
  if (unit !== factor.unit_in) {
    const { data: conv } = await supabase
      .from('unit_conversions')
      .select('multiplier')
      .eq('from_unit', unit)
      .eq('to_unit', factor.unit_in)
      .maybeSingle();
    if (!conv?.multiplier) {
      return { error: `'${unit}' biriminden '${factor.unit_in}' birimine dönüşüm bulunamadı` } as const;
    }
    multiplier = Number(conv.multiplier);
  }
  const normalized = amount * multiplier;
  const raw = normalized * Number(factor.value);
  let co2e_value: number | null = null;
  let co2e_unit: string | null = null;
  if (factor.unit_out === 'g') { co2e_value = raw / 1000; co2e_unit = 'kg'; }
  else if (factor.unit_out === 't' || factor.unit_out === 'ton' || factor.unit_out === 'tons') { co2e_value = raw * 1000; co2e_unit = 'kg'; }
  else { co2e_value = raw; co2e_unit = 'kg'; }

  // Create the detailed entry via privileged RPC (same path as standalone flow)
  const { data: newId, error } = await supabase.rpc('create_entry_privileged', {
    p_project_id: projectId,
    p_user_id: user.id,
    p_type: activity?.type || type,
    p_date: date,
    p_amount: amount,
    p_unit: unit,
    p_scope: scope || activity?.scope || null,
    p_category: category || activity?.category || null,
    p_activity_id: activity?.id || null,
    p_notes: notes,
    p_co2e_value: co2e_value,
    p_co2e_unit: co2e_unit,
  });
  if (error) {
    return { error: error.message } as const;
  }

  // Append a material summary row to the daily log
  const { data: dlm, error: e2 } = await supabase
    .from('daily_log_materials')
    .insert({ log_id: dailyLogId, activity_id, quantity: amount, unit, entry_id: newId })
    .select('*, activities(name, default_unit, units)')
    .single();
  if (e2) {
    return { error: e2.message } as const;
  }

  try {
    revalidatePath(`/projects/${projectId}/daily-logs/${dailyLogId}`);
    revalidatePath(`/entries`);
    revalidatePath(`/dashboard`);
  } catch {}

  return { entryId: newId as string, dailyLogMaterialId: dlm.id as string, dailyLogMaterial: dlm } as const;
}
