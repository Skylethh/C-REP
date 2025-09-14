"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const schema = z.object({
  type: z.enum(['energy','transport','materials','other']),
  date: z.string().min(1),
  amount: z.preprocess((v) => Number(v), z.number().positive()),
  unit: z.string().min(1).max(16),
  notes: z.string().max(1000).optional().default('')
});

export async function createEntry(projectId: string, formData: FormData) {
  const parsed = schema.safeParse({
    type: formData.get('type'),
    date: formData.get('date'),
    amount: formData.get('amount'),
    unit: formData.get('unit'),
    notes: formData.get('notes')
  });
  if (!parsed.success) return;
  const { type, date, amount, unit, notes } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch activity (if selected) to drive unit validation and factor selection
  const activityId = (formData.get('activity_id') as string) || '';
  let activity: any = null;
  if (activityId) {
    const { data: act } = await supabase
      .from('activities')
      .select('id, type, scope, category, default_unit, units')
      .eq('id', activityId)
      .maybeSingle();
    activity = act;
  }

  // Validate unit against activity allowed units if present
  if (activity?.units && Array.isArray(activity.units) && activity.units.length > 0) {
    if (!activity.units.includes(unit)) {
      throw new Error('Seçilen birim aktivite ile uyumlu değil');
    }
  }

  const factorCategory = (activity?.category as string) || type;
  // Pick latest matching factor for category (or type) and region=global
  let factor: any = null;
  if (activity?.id) {
    const { data: mapped } = await supabase
      .from('activity_factors')
      .select('factor_id, emission_factors!inner(unit_in, unit_out, value)')
      .eq('activity_id', activity.id)
      .limit(1)
      .maybeSingle();
    if (mapped) factor = (mapped as any).emission_factors;
  }
  if (!factor) {
    const resp = await supabase
      .from('emission_factors')
      .select('unit_in, unit_out, value')
      .eq('category', factorCategory)
      .eq('region', 'global')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    factor = resp.data;
  }

  let co2e_value: number | null = null;
  let co2e_unit: string | null = null;
  if (factor) {
    // find conversion from provided unit -> factor.unit_in
    let multiplier = 1;
    if (unit !== factor.unit_in) {
      const { data: conv } = await supabase
        .from('unit_conversions')
        .select('multiplier')
        .eq('from_unit', unit)
        .eq('to_unit', factor.unit_in)
        .maybeSingle();
      if (conv?.multiplier) multiplier = Number(conv.multiplier);
    }
    const normalizedAmount = amount * multiplier;
    co2e_value = normalizedAmount * Number(factor.value);
    co2e_unit = factor.unit_out;
  }

  const { error } = await supabase.from('entries').insert({
    project_id: projectId,
    type: activity?.type || type,
    date,
    amount,
    unit,
    scope: (formData.get('scope') as string) || activity?.scope || null,
    category: (formData.get('category') as string) || activity?.category || null,
    activity_id: activity?.id || null,
    notes,
    created_by: user.id,
    co2e_value,
    co2e_unit,
  });
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}


