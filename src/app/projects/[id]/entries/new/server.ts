"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { captureServerError } from '@/sentry.server.config';

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

  // --- Additional validations: future date, duplicate detection, anomaly detection ---
  // 1) Disallow far-future dates (allow only today or past)
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (date > todayStr) {
      throw new Error('Gelecekteki bir tarih için kayıt oluşturulamaz');
    }
  } catch (e) {
    // If date parsing fails for any reason, let zod validation handle it later
  }

  // Helper utilities
  const toDateString = (d: Date) => d.toISOString().slice(0, 10);
  const computeMedian = (arr: number[]) => {
    if (!arr.length) return NaN;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  };

  // 2) Duplicate detection (same project, same type, same unit, near-equal amount, close date)
  const chosenType = activity?.type || type;
  {
    const base = new Date(date);
    const from = new Date(base);
    const to = new Date(base);
    from.setDate(from.getDate() - 3);
    to.setDate(to.getDate() + 3);
    const { data: possibleDupes } = await supabase
      .from('entries')
      .select('id, amount, unit, type, activity_id, date')
      .eq('project_id', projectId)
      .eq('unit', unit)
      .eq('type', chosenType)
      .gte('date', toDateString(from))
      .lte('date', toDateString(to))
      .limit(20);
    const tolerance = Math.max(0.01 * amount, 0.0001);
    const found = (possibleDupes || []).find((e) => {
      const sameActivity = !activity?.id || e.activity_id === activity.id;
      const amtClose = Math.abs(Number(e.amount || 0) - amount) <= tolerance;
      return sameActivity && amtClose;
    });
    if (found) {
      throw new Error('Benzer bir kayıt zaten mevcut. Lütfen girdiyi kontrol edin.');
    }
  }

  // 3) Anomaly detection (simple historical outlier check on same unit/type)
  {
    const { data: recentSameUnit } = await supabase
      .from('entries')
      .select('amount')
      .eq('project_id', projectId)
      .eq('type', chosenType)
      .eq('unit', unit)
      .order('date', { ascending: false })
      .limit(200);
    const amounts = (recentSameUnit || [])
      .map((r: any) => Number(r.amount))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (amounts.length >= 5) {
      const median = computeMedian(amounts);
      if (Number.isFinite(median) && median > 0) {
        const ratio = amount / median;
        // Hard stop for extreme anomalies (100x+ of historical median)
        if (ratio > 100) {
          throw new Error("Girilen miktar alışılmadık derecede yüksek görünüyor. Birimi veya değeri kontrol edin.");
        }
      }
    }
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
    const q = supabase
      .from('activity_factors')
      .select('factor_id, emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
      .eq('activity_id', activity.id)
      .eq('emission_factors.region', 'global')
      .order('emission_factors.valid_from', { ascending: false })
      .limit(1);
    // Date-aware factor: choose factor whose valid_from <= entry date
    if (date) (q as any).lte('emission_factors.valid_from', date);
    const { data: mapped } = await q.maybeSingle();
    if (mapped) factor = (mapped as any).emission_factors;
  }
  if (!factor) {
    const fq = supabase
      .from('emission_factors')
      .select('unit_in, unit_out, value, valid_from')
      .eq('category', factorCategory)
      .eq('region', 'global')
      .order('valid_from', { ascending: false })
      .limit(1);
    if (date) (fq as any).lte('valid_from', date);
    const resp = await fq.maybeSingle();
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
      if (!conv?.multiplier) {
        throw new Error(`'${unit}' biriminden '${factor.unit_in}' birimine dönüşüm bulunamadı`);
      }
      multiplier = Number(conv.multiplier);
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
  if (error) { captureServerError(error, { where: 'createEntry', projectId, activityId, factor_unit_in: factor?.unit_in, unit }); throw error; }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?success=true&message=Kayıt başarıyla oluşturuldu`);
}


