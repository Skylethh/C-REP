"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';

export default function ActivitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Keep only the fields we render after translation
  const [items, setItems] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Minimal TR translations for common categories/keys coming from seeds/imports
  const TR_MAP: Record<string, string> = {
    // Metals
    steel_rebar: 'Çelik Donatı (Rebar)',
    steel_structural: 'Yapısal Çelik',
    aluminium: 'Alüminyum',
    aluminum: 'Alüminyum',
    copper: 'Bakır',
    brass: 'Pirinç',
    // Building materials
    cement: 'Çimento',
    cement_clinker: 'Çimento Klinker',
    aggregate: 'Agrega',
    brick: 'Tuğla',
    brick_clay: 'Kil Tuğla',
    ceramic_tile: 'Seramik Karo',
    glass: 'Cam',
    gypsum_board: 'Alçıpan',
    paint: 'Boya',
    wood_timber: 'Kereste',
    plywood: 'Kontrplak',
    mdf: 'MDF',
    asphalt: 'Asfalt',
    // Utilities/waste
    water_supply: 'Şebeke Suyu',
    waste_mixed: 'Karma Atık Bertarafı',
    // Energy/transport basics
    electricity_grid: 'Elektrik (şebeke)',
    diesel_fuel: 'Dizel Yakıt',
    passenger_car: 'Binek Araç',
    natural_gas: 'Doğal Gaz',
    gasoline: 'Benzin',
    // Concrete grades
    concrete: 'Beton',
    concrete_c20: 'Beton C20',
    concrete_c25: 'Beton C25',
    concrete_c30: 'Beton C30'
  };

  const tokenize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9çğıöşü\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  const turkishify = (s: string) => {
    // Quick word-level replacements for common English terms
    const map: Record<string, string> = {
      cement: 'çimento',
      clinker: 'klinker',
      ceramic: 'seramik',
      tile: 'karo',
      brick: 'tuğla',
      clay: 'kil',
      brass: 'pirinç',
      glass: 'cam',
      paint: 'boya',
      asphalt: 'asfalt',
      steel: 'çelik',
      structural: 'yapısal',
      rebar: 'donatı',
      aluminium: 'alüminyum',
      aluminum: 'alüminyum',
      copper: 'bakır',
      plywood: 'kontrplak',
      timber: 'kereste',
      board: 'levha',
      gypsum: 'alçı',
      water: 'su',
      supply: 'şebeke',
      mixed: 'karma',
      waste: 'atık',
    };
    const words = tokenize(s).split(' ');
    const tr = words.map((w) => map[w] ?? w).join(' ');
    // Capitalize first letter of each word
    return tr.replace(/(^|\s)([a-zçğıöşü])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  };

  const trLabel = (key?: string, name?: string, category?: string) => {
    const k = (key || category || '').toLowerCase();
    if (k && TR_MAP[k]) return TR_MAP[k];
    // If DB already has a Turkish-looking name, keep it; otherwise try to translate tokens
    const base = (name || k.replace(/_/g, ' ')).trim();
    // Heuristic: if contains any Turkish-specific chars, assume already TR
    if (/[çğıöşüÇĞİÖŞÜ]/.test(base)) return base;
    return turkishify(base);
  };
  useEffect(() => {
    (async () => {
      setLoading(true);
      // Always fetch full list so we can filter in TR on the client reliably
      const [acts, favs] = await Promise.all([
        supabaseBrowser
          .from('activities')
          .select('id, key, name, category, type')
          .order('type', { ascending: true })
          .order('name', { ascending: true }),
        supabaseBrowser.from('user_favorites').select('activity_id')
      ]);
      const rows = (acts.data || []) as Array<{ id: string; key?: string; name?: string; category?: string; type: string }>;
      const translated = rows.map((r) => ({ id: r.id, type: r.type, name: trLabel(r.key, r.name, r.category) }));
      setItems(translated);
      setFavorites(new Set((favs.data || []).map((f: any) => f.activity_id)));
      setLoading(false);
    })();
  }, []);

  // Show selected item's label in the input when value changes
  useEffect(() => {
    if (!value) { return; }
    const it = items.find((x) => x.id === value);
    if (it) setQ(it.name);
  }, [value, items]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const termRaw = q.trim();
    const term = termRaw.toLowerCase();
    if (!term) return items;
    const tTok = tokenize(term);

    function score(it: { name: string; type: string }) {
      const nameTok = tokenize(it.name);
      const typeTok = tokenize(it.type);
      // Priority rules
      // 1) Token startsWith
      const tokens = nameTok.split(' ');
      const startsToken = tokens.some((tk) => tk.startsWith(tTok));
      // 2) Include anywhere
      const includes = nameTok.includes(tTok) || typeTok.includes(tTok);
      // 3) Special: concrete grades when typing C...
      const isConcreteHint = /^c\s*\d*/i.test(termRaw);
      const isConcreteName = /beton\s*c\d+/i.test(it.name);
      let s = 0;
      if (startsToken) s += 3;
      if (includes) s += 1;
      if (isConcreteHint && isConcreteName) s += 5;
      return s;
    }

    return items
      .filter((it) => tokenize(it.name).includes(tTok) || tokenize(it.type).includes(tTok) || tokenize(it.name).split(' ').some((tk) => tk.startsWith(tTok)))
      .sort((a, b) => score(b) - score(a));
  }, [items, q]);
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
    <div className="space-y-3" ref={boxRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </div>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key.length === 1 || e.key === 'Backspace')) setOpen(true);
            if (!open) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            if (e.key === 'Enter') {
              e.preventDefault();
              const it = filtered[highlight] || filtered[0];
              if (it) {
                onChange(it.id);
                setQ(it.name);
                setOpen(false);
              }
            }
            if (e.key === 'Escape') { setOpen(false); }
          }}
          placeholder="Aktivite ara..."
          className="w-full rounded-lg bg-white/5 border border-white/10 pl-10 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all"
        />
        {value ? (
          <button
            type="button"
            title="Seçimi temizle"
            onClick={() => { onChange(''); setQ(''); setOpen(true); setHighlight(0); inputRef.current?.focus(); }}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-white/60 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        ) : null}
      </div>
      
      {/* Hidden field to submit selected activity id */}
      <input type="hidden" name="activity_id" value={value || ''} />

      {/* Combobox dropdown */}
      <div className="relative">
        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-white/10 bg-emerald-950/95 backdrop-blur p-1 shadow-lg">
            {loading ? (
              <div className="px-3 py-2 text-white/70 text-sm">Yükleniyor…</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-amber-300/90 text-sm">Aramanızla eşleşen aktivite bulunamadı</div>
            ) : (
              <div className="divide-y divide-white/5">
                {favorites.size > 0 && items.some((it) => favorites.has(it.id) && tokenize(it.name).includes(tokenize(q))) ? (
                  <div className="py-1">
                    <div className="px-3 pb-1 text-xs uppercase tracking-wide text-white/40">★ Favoriler</div>
                    {items.filter((it) => favorites.has(it.id)).filter((it) => !q || tokenize(it.name).includes(tokenize(q))).map((it) => (
                      <ComboRow key={it.id} it={it} active={filtered[highlight]?.id === it.id} onPick={() => { onChange(it.id); setQ(it.name); setOpen(false); }} onFav={() => toggleFavorite(it.id)} fav={favorites.has(it.id)} />
                    ))}
                  </div>
                ) : null}
                {Object.entries(groups).map(([type, arr]) => (
                  <div key={type} className="py-1">
                    <div className="px-3 pb-1 text-xs uppercase tracking-wide text-white/40">
                      {type === 'energy' ? '⚡ Enerji' : type === 'transport' ? '🚗 Ulaşım' : type === 'materials' ? '📦 Malzeme' : '🔄 Diğer'}
                    </div>
                    {arr.map((it, idx) => {
                      const isActive = filtered[highlight]?.id === it.id;
                      return (
                        <ComboRow key={it.id} it={it} active={isActive} onPick={() => { onChange(it.id); setQ(it.name); setOpen(false); }} onFav={() => toggleFavorite(it.id)} fav={favorites.has(it.id)} />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center text-white/60 text-sm py-2">
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Aktiviteler yükleniyor...
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

function ComboRow({ it, active, onPick, onFav, fav }: { it: { id: string; name: string; type: string }; active: boolean; onPick: () => void; onFav: () => void; fav: boolean }) {
  return (
    <div
      className={`px-3 py-2 text-sm flex items-center justify-between cursor-pointer rounded-md ${active ? 'bg-emerald-800/60 text-white' : 'text-white/90 hover:bg-white/5'}`}
      onMouseDown={(e) => { e.preventDefault(); onPick(); }}
    >
      <span className="truncate">{it.name}</span>
      <button
        type="button"
        title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        onMouseDown={(e) => { e.preventDefault(); onFav(); }}
        className={`ml-3 text-xs ${fav ? 'text-amber-300' : 'text-white/40 hover:text-white/70'}`}
      >
        {fav ? '★' : '☆'}
      </button>
    </div>
  );
}


