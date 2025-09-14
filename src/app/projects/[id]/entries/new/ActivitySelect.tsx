"use client";
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';

export default function ActivitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser
        .from('activities')
        .select('id, name, type')
        .order('type', { ascending: true })
        .order('name', { ascending: true });
      setItems(data || []);
    })();
  }, []);
  const filtered = q ? items.filter(i => (i.name + ' ' + i.type).toLowerCase().includes(q.toLowerCase())) : items;
  const groups: Record<string, { id: string; name: string; type: string }[]> = {};
  for (const it of filtered) {
    groups[it.type] = groups[it.type] || []; groups[it.type].push(it);
  }
  return (
    <div className="space-y-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara..." className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
      <select name="activity_id" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
        <option value="">Seçiniz</option>
        {Object.entries(groups).map(([type, arr]) => (
          <optgroup key={type} label={type}>
            {arr.map((it) => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}


