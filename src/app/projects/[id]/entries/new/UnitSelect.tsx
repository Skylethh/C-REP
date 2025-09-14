"use client";
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';

export default function UnitSelect({ activityId, value, onChange }: { activityId: string; value: string; onChange: (v: string) => void }) {
  const [units, setUnits] = useState<string[]>(['kWh','km','kg','g','L']);
  useEffect(() => {
    (async () => {
      if (!activityId) return;
      const { data: act } = await supabaseBrowser
        .from('activities')
        .select('units, default_unit')
        .eq('id', activityId)
        .maybeSingle();
      if (act?.units?.length) {
        setUnits(act.units as string[]);
        if (act.default_unit) onChange(act.default_unit);
      }
    })();
  }, [activityId]);
  return (
    <select name="unit" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
      {units.map((u) => (
        <option key={u} value={u}>{u}</option>
      ))}
    </select>
  );
}


