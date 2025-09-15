"use client";
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';

export default function ActivitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabaseBrowser
        .from('activities')
        .select('id, name, type')
        .order('type', { ascending: true })
        .order('name', { ascending: true });
      // Server-side accent-insensitive search with trigram if query exists
      if (q && q.trim()) {
        const term = q.trim();
        query = query.or(`name.ilike.%${term}%,type.ilike.%${term}%`);
      }
      const [acts, favs] = await Promise.all([
        query,
        supabaseBrowser.from('user_favorites').select('activity_id')
      ]);
      setItems(acts.data || []);
      setFavorites(new Set((favs.data || []).map((f: any) => f.activity_id)));
      setLoading(false);
    })();
  }, [q]);
  const filtered = items;
  const groups: Record<string, { id: string; name: string; type: string }[]> = {};
  for (const it of filtered) {
    groups[it.type] = groups[it.type] || []; groups[it.type].push(it);
  }
  async function toggleFavorite(activityId: string) {
    try {
      if (!activityId) return;
      const isFav = favorites.has(activityId);
      if (isFav) {
        const { error } = await supabaseBrowser
          .from('user_favorites')
          .delete()
          .eq('activity_id', activityId);
        if (!error) {
          const next = new Set(favorites);
          next.delete(activityId);
          setFavorites(next);
        }
      } else {
        const { error } = await supabaseBrowser
          .from('user_favorites')
          .insert({ activity_id: activityId });
        if (!error) {
          const next = new Set(favorites);
          next.add(activityId);
          setFavorites(next);
        }
      }
    } catch {}
  }
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </div>
        <input 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="Aktivite ara..." 
          className="w-full rounded-lg bg-white/5 border border-white/10 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all" 
        />
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-lg p-0.5 overflow-hidden relative">
        <select 
          name="activity_id" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full bg-transparent border-none px-3 py-2.5 focus:outline-none transition-all appearance-none pr-10 text-base"
          style={{
            WebkitAppearance: "none",
            MozAppearance: "none",
            textIndent: 0,
          }}
        >
          <option value="" className="bg-emerald-900 text-white">{loading ? 'Yükleniyor...' : '-- Aktivite Seçin --'}</option>
          {favorites.size > 0 ? (
            <optgroup label="★ Favoriler" className={"font-medium bg-emerald-900 text-white"}>
              {items.filter((it) => favorites.has(it.id)).map((it) => (
                <option key={it.id} value={it.id} className="bg-emerald-900 text-white py-1">{it.name}</option>
              ))}
            </optgroup>
          ) : null}
          {Object.entries(groups).map(([type, arr]) => {
            // Türe göre renk ve ikon belirleme
            let typeLabel = type;
            let bgColor = "bg-emerald-900";
            
            if (type === 'energy') {
              typeLabel = '⚡ Enerji';
              bgColor = "bg-emerald-900";
            }
            if (type === 'transport') {
              typeLabel = '🚗 Ulaşım';
              bgColor = "bg-emerald-900";
            }
            if (type === 'materials') {
              typeLabel = '📦 Malzeme';
              bgColor = "bg-emerald-900";
            }
            if (type === 'other') {
              typeLabel = '🔄 Diğer';
              bgColor = "bg-emerald-900";
            }
            
            return (
              <optgroup key={type} label={typeLabel} className={`font-medium ${bgColor} text-white`}>
                {arr.map((it) => (
                  <option key={it.id} value={it.id} className="bg-emerald-900 text-white py-1">{it.name}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center text-white/60 text-sm py-2">
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Aktiviteler yükleniyor...
        </div>
      ) : !loading && filtered.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Aramanızla eşleşen aktivite bulunamadı
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-white/60 px-1">
          <span>{filtered.length} aktivite listeleniyor</span>
          {value ? (
            <button type="button" className="text-amber-300 hover:text-amber-200 underline" onClick={() => toggleFavorite(value)}>
              {favorites.has(value) ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}


