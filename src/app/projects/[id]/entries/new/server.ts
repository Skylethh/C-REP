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

  // Pick latest matching factor for category and region=global
  const { data: factor } = await supabase
    .from('emission_factors')
    .select('unit_in, unit_out, value')
    .eq('category', type)
    .eq('region', 'global')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

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
    type,
    date,
    amount,
    unit,
    notes,
    created_by: user.id,
    co2e_value,
    co2e_unit,
  });
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}


