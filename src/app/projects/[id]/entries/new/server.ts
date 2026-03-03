"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { z } from 'zod';

import { normalizeCategory } from '@/lib/categoryAliases';

const schema = z.object({
  type: z.enum(['energy', 'transport', 'materials', 'other']),
  date: z.string().min(1),
  amount: z.preprocess((v) => Number(v), z.number().positive()),
  unit: z.string().min(1).max(16),
  notes: z.string().max(1000).optional().default('')
});

export async function createEntry(projectId: string, formData: FormData) {
  try {
    const parsed = schema.safeParse({
      type: formData.get('type'),
      date: formData.get('date'),
      amount: formData.get('amount'),
      unit: formData.get('unit'),
      notes: formData.get('notes')
    });
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Form geçersiz. Lütfen alanları kontrol edin.';
      return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent(msg)}`);
    }
    const { type, date, amount, unit, notes } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return redirect(`/login?next=${encodeURIComponent(`/projects/${projectId}/entries/new`)}`);
    }

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
        return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent('Gelecekteki bir tarih için kayıt oluşturulamaz')}`);
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
        return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent('Benzer bir kayıt zaten mevcut. Lütfen girdiyi kontrol edin.')}`);
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
            return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent('Girilen miktar alışılmadık derecede yüksek görünüyor. Birimi veya değeri kontrol edin.')}`);
          }
        }
      }
    }

    // Validate unit against activity allowed units if present
    if (activity?.units && Array.isArray(activity.units) && activity.units.length > 0) {
      if (!activity.units.includes(unit)) {
        return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent('Seçilen birim aktivite ile uyumlu değil')}`);
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
        .neq('emission_factors.value', 0)
        .order('emission_factors.valid_from', { ascending: false })
        .limit(1);
      // Date-aware factor: choose factor whose valid_from <= entry date
      if (date) (q as any).lte('emission_factors.valid_from', date);
      let { data: mapped } = await q.maybeSingle();
      if (mapped) factor = (mapped as any).emission_factors;
      // Fallback: ignore date if none found
      if (!factor) {
        const q2 = supabase
          .from('activity_factors')
          .select('factor_id, emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
          .eq('activity_id', activity.id)
          .eq('emission_factors.region', 'global')
          .neq('emission_factors.value', 0)
          .order('emission_factors.valid_from', { ascending: false })
          .limit(1);
        const { data: mapped2 } = await q2.maybeSingle();
        if (mapped2) factor = (mapped2 as any).emission_factors;
      }
    }
    if (!factor) {
      const normalizedCategory = normalizeCategory(factorCategory) || factorCategory;
      const fq = supabase
        .from('emission_factors')
        .select('unit_in, unit_out, value, valid_from')
        .eq('category', normalizedCategory)
        .eq('region', 'global')
        .neq('value', 0)
        .order('valid_from', { ascending: false })
        .limit(1);
      if (date) (fq as any).lte('valid_from', date);
      let resp = await fq.maybeSingle();
      factor = resp.data;
      // Fallback: ignore date if none found
      if (!factor) {
        const fq2 = supabase
          .from('emission_factors')
          .select('unit_in, unit_out, value, valid_from')
          .eq('category', normalizedCategory)
          .eq('region', 'global')
          .neq('value', 0)
          .order('valid_from', { ascending: false })
          .limit(1);
        const resp2 = await fq2.maybeSingle();
        factor = resp2.data;
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
        factor = fqp.data;
      }
      // Fallback 2: If still not found and we have an activity with a specific key, try factor by key (e.g., concrete_c30)
      if (!factor && activity?.id) {
        const { data: actKeyRow } = await supabase
          .from('activities')
          .select('key')
          .eq('id', activity.id)
          .maybeSingle();
        const key = actKeyRow?.key as string | undefined;
        if (key) {
          const normalizedKey = normalizeCategory(key) || key;
          const fk = supabase
            .from('emission_factors')
            .select('unit_in, unit_out, value, valid_from')
            .eq('category', normalizedKey)
            .eq('region', 'global')
            .neq('value', 0)
            .order('valid_from', { ascending: false })
            .limit(1);
          if (date) (fk as any).lte('valid_from', date);
          let kresp = await fk.maybeSingle();
          factor = kresp.data;
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
            factor = fk2.data;
          }
        }
      }
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
          return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent(`'${unit}' biriminden '${factor.unit_in}' birimine dönüşüm bulunamadı`)}`);
        }
        multiplier = Number(conv.multiplier);
      }
      const normalizedAmount = amount * multiplier;
      const raw = normalizedAmount * Number(factor.value);
      // Normalize to kilograms in DB. If factor outputs grams or tons, convert to kg.
      if (factor.unit_out === 'g') {
        co2e_value = raw / 1000;
        co2e_unit = 'kg';
      } else if (factor.unit_out === 't' || factor.unit_out === 'ton' || factor.unit_out === 'tons') {
        co2e_value = raw * 1000;
        co2e_unit = 'kg';
      } else {
        // Assume kg for unknown or 'kg'
        co2e_value = raw;
        co2e_unit = 'kg';
      }
    }

    // Use privileged RPC to avoid client-side RLS edge cases and ensure membership is enforced server-side
    const { data: newId, error } = await supabase.rpc('create_entry_privileged', {
      p_project_id: projectId,
      p_user_id: user.id,
      p_type: activity?.type || type,
      p_date: date,
      p_amount: amount,
      p_unit: unit,
      p_scope: (formData.get('scope') as string) || activity?.scope || null,
      p_category: (formData.get('category') as string) || activity?.category || null,
      p_activity_id: activity?.id || null,
      p_notes: notes,
      p_co2e_value: co2e_value,
      p_co2e_unit: co2e_unit,
    });
    if (error) {
      console.error('createEntry error:', error, { projectId, activityId, factor_unit_in: factor?.unit_in, unit, code: (error as any).code });
      // Graceful UX: redirect back with friendly message instead of crashing
      const msg = (error as any)?.code === '42501'
        ? 'Bu projeye kayıt ekleme yetkiniz yok. Lütfen proje yöneticisinden yetki isteyin.'
        : (error.message || 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.');
      redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent(msg)}`);
    }
    revalidatePath(`/projects/${projectId}`);
    if (newId) {
      redirect((`/entries/${newId}#evidence` as unknown) as Route);
    }
    redirect(`/projects/${projectId}?success=true&message=${encodeURIComponent('Kayıt başarıyla oluşturuldu')}`);
  } catch (e: any) {
    // Catch-all: never leave the user without feedback
    console.error('createEntry.catch:', e, { projectId });
    // Preserve Next.js redirect behavior
    if (e && typeof e === 'object' && typeof (e as any).digest === 'string' && (e as any).digest.includes('NEXT_REDIRECT')) {
      throw e;
    }
    const msg = e?.message || 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.';
    return redirect(`/projects/${projectId}/entries/new?error=${encodeURIComponent(msg)}`);
  }
}

// Top-level server action: reads project id from hidden field to avoid closure serialization issues
export async function submitEntryAction(formData: FormData) {
  'use server';
  const projectId = String(formData.get('project_id') || '');
  if (!projectId) {
    redirect(('/dashboard?error=' + encodeURIComponent('Proje bilgisi eksik')) as Route);
  }
  await createEntry(projectId, formData);
}


