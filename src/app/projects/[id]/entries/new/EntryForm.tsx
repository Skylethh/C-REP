"use client";
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';
import { Button } from '@/components/button';

type Props = {
  projectId: string;
  action: (formData: FormData) => void;
};

export default function EntryForm({ projectId, action }: Props) {
  const [type, setType] = useState<'energy'|'transport'|'materials'|'other'>('energy');
  const [amount, setAmount] = useState<number>(0);
  const [unit, setUnit] = useState<string>('kWh');
  const [date, setDate] = useState<string>('');
  const [scope, setScope] = useState<'scope1'|'scope2'|'scope3'|''>('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [preview, setPreview] = useState<string>('-');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!amount || !unit) { setPreview('-'); return; }
      const { data: factor } = await supabaseBrowser
        .from('emission_factors')
        .select('unit_in, unit_out, value')
        .eq('category', type)
        .eq('region', 'global')
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!factor) { setPreview('-'); return; }
      let multiplier = 1;
      if (unit !== factor.unit_in) {
        const { data: conv } = await supabaseBrowser
          .from('unit_conversions')
          .select('multiplier')
          .eq('from_unit', unit)
          .eq('to_unit', factor.unit_in)
          .maybeSingle();
        if (conv?.multiplier) multiplier = Number(conv.multiplier);
      }
      const normalized = amount * multiplier;
      const co2e = normalized * Number(factor.value);
      if (!cancelled) setPreview(`${co2e.toFixed(3)} ${factor.unit_out}`);
    })();
    return () => { cancelled = true; };
  }, [type, amount, unit]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Tür</label>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as any)} className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
            <option value="energy">Enerji</option>
            <option value="transport">Ulaşım</option>
            <option value="materials">Malzeme</option>
            <option value="other">Diğer</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Tarih</label>
          <input name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Miktar</label>
          <input name="amount" type="number" step="any" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Birim</label>
          <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
            <option value="kWh">kWh</option>
            <option value="km">km</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="L">L</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Scope</label>
          <select name="scope" value={scope} onChange={(e) => setScope(e.target.value as any)} className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
            <option value="">Seç</option>
            <option value="scope1">Scope 1</option>
            <option value="scope2">Scope 2</option>
            <option value="scope3">Scope 3</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Kategori</label>
          <input name="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="örn. elektrik" className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm text-green-300/80">Notlar</label>
        <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
      </div>
      <div className="text-sm text-green-300/80">CO2e önizleme: <span className="text-green-200">{preview}</span></div>
      <Button type="submit">Kaydet</Button>
    </form>
  );
}


