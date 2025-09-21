"use client";
import { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { supabaseBrowser } from '@/lib/client';
import { normalizeCategory } from '@/lib/categoryAliases';
import { Button } from '@/components/button';
import ActivitySelect from './ActivitySelect';
import UnitSelect from './UnitSelect';

type Props = {
  projectId: string;
  action: (formData: FormData) => void;
};

export default function EntryForm({ projectId, action }: Props) {
  const [type, setType] = useState<'energy'|'transport'|'materials'|'other'|''>('');
  const [activity, setActivity] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [unit, setUnit] = useState<string>('kWh');
  const [date, setDate] = useState<string>('');
  const [scope, setScope] = useState<'scope1'|'scope2'|'scope3'|''>('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [preview, setPreview] = useState<string>('-');
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const cacheRef = useMemo(() => new Map<string, number>(), []);

  // Turkish display mapping for common categories/keys
  const TR_MAP: Record<string, string> = {
    steel_rebar: 'Çelik Donatı (Rebar)',
    steel_structural: 'Yapısal Çelik',
    aluminium: 'Alüminyum',
    aluminum: 'Alüminyum',
    copper: 'Bakır',
    brass: 'Pirinç',
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
    water_supply: 'Şebeke Suyu',
    waste_mixed: 'Karma Atık Bertarafı',
    electricity_grid: 'Elektrik (şebeke)',
    diesel_fuel: 'Dizel Yakıt',
    passenger_car: 'Binek Araç',
    natural_gas: 'Doğal Gaz',
    gasoline: 'Benzin',
    concrete: 'Beton',
    concrete_c20: 'Beton C20',
    concrete_c25: 'Beton C25',
    concrete_c30: 'Beton C30',
  };
  const categoryDisplay = useMemo(() => {
    const key = (category || '').toLowerCase();
    if (!key) return '';
    if (TR_MAP[key]) return TR_MAP[key];
    // Fallback: prettify slug
    return key.replace(/_/g, ' ').replace(/(^|\s)([a-zçğıöşü])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  }, [category]);

  // Initialize date to today for better defaults
  useEffect(() => {
    setDate((d) => d || new Date().toISOString().slice(0,10));
  }, []);

  // Load activity details when activity changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activity) return;
      const { data: act } = await supabaseBrowser
        .from('activities')
        .select('type, default_unit, scope, category, units')
        .eq('id', activity)
        .maybeSingle();
      if (cancelled) return;
      if (act) {
        setType(act.type as any);
        if (act.default_unit) setUnit(act.default_unit);
        if (act.scope) setScope(act.scope as any);
        if (act.category) setCategory(act.category);
      }
    })();
    return () => { cancelled = true; };
  }, [activity]);

  // Debounced preview calculation
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      if (!amount || !unit) { setPreview('-'); setCalcError(null); return; }
      setCalculating(true);
      setCalcError(null);
      try {
        // 1) If an activity is selected, try mapped factor first (date-aware)
        let factor: { unit_in: string; unit_out: string; value: number } | null = null;
        if (activity) {
          // First try date-aware
          let q = supabaseBrowser
            .from('activity_factors')
            .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
            .eq('activity_id', activity)
            .eq('emission_factors.region', 'global')
            .neq('emission_factors.value', 0)
            .order('emission_factors.valid_from', { ascending: false })
            .limit(1);
          if (date) (q as any).lte('emission_factors.valid_from', date);
          let { data: mapped } = await q.maybeSingle();
          if ((mapped as any)?.emission_factors) {
            factor = (mapped as any).emission_factors as any;
          }
          // Fallback: ignore date if none found
          if (!factor) {
            const q2 = supabaseBrowser
              .from('activity_factors')
              .select('emission_factors!inner(unit_in, unit_out, value, valid_from, region)')
              .eq('activity_id', activity)
              .eq('emission_factors.region', 'global')
              .neq('emission_factors.value', 0)
              .order('emission_factors.valid_from', { ascending: false })
              .limit(1);
            const { data: mapped2 } = await q2.maybeSingle();
            if ((mapped2 as any)?.emission_factors) {
              factor = (mapped2 as any).emission_factors as any;
            }
          }
        }
        // 2) Fallback to category-based factor (date-aware)
        if (!factor) {
          let factorCategory = category || '';
          let activityKey: string | null = null;
          // If an activity is selected but local category is empty, fetch it (and fetch key for key-based fallback)
          if (activity && !factorCategory) {
            const { data: actCat } = await supabaseBrowser
              .from('activities')
              .select('category, key')
              .eq('id', activity)
              .maybeSingle();
            if (actCat?.category) factorCategory = String(actCat.category);
            if (actCat?.key) activityKey = String(actCat.key);
          }
          if (!factorCategory) factorCategory = type; // last resort
          // Normalize free-text Turkish inputs to canonical slug
          const normalizedCategory = normalizeCategory(factorCategory) || factorCategory;
          const normalizedKey = activityKey ? (normalizeCategory(activityKey) || activityKey) : null;
          let fq = supabaseBrowser
            .from('emission_factors')
            .select('unit_in, unit_out, value, valid_from')
            .eq('category', normalizedCategory)
            .eq('region', 'global')
            .neq('value', 0)
            .order('valid_from', { ascending: false })
            .limit(1);
          if (date) (fq as any).lte('valid_from', date);
          let { data: fac } = await fq.maybeSingle();
          if (fac) factor = fac as any;
          // Fallback: ignore date if none found
          if (!factor) {
            const fq2 = supabaseBrowser
              .from('emission_factors')
              .select('unit_in, unit_out, value, valid_from')
              .eq('category', normalizedCategory)
              .eq('region', 'global')
              .neq('value', 0)
              .order('valid_from', { ascending: false })
              .limit(1);
            const { data: fac2 } = await fq2.maybeSingle();
            if (fac2) factor = fac2 as any;
          }
          // Fallback: relaxed prefix match on category
          if (!factor) {
            const fqp = supabaseBrowser
              .from('emission_factors')
              .select('unit_in, unit_out, value, valid_from')
              .ilike('category', `${normalizedCategory}%`)
              .eq('region', 'global')
              .neq('value', 0)
              .order('valid_from', { ascending: false })
              .limit(1);
            const { data: facp } = await fqp.maybeSingle();
            if (facp) factor = facp as any;
          }
          // Fallback 2: try by activity key (e.g., concrete_c30) if category lookup failed
          if (!factor && activity) {
            if (!activityKey) {
              const { data: act } = await supabaseBrowser
                .from('activities')
                .select('key')
                .eq('id', activity)
                .maybeSingle();
              activityKey = act?.key || null;
            }
            const tryKey = normalizedKey || (activityKey ? (normalizeCategory(activityKey) || activityKey) : null);
            if (tryKey) {
              let fk = supabaseBrowser
                .from('emission_factors')
                .select('unit_in, unit_out, value, valid_from')
                .eq('category', tryKey)
                .eq('region', 'global')
                .neq('value', 0)
                .order('valid_from', { ascending: false })
                .limit(1);
              if (date) (fk as any).lte('valid_from', date);
              let { data: fac3 } = await fk.maybeSingle();
              if (fac3) factor = fac3 as any;
              if (!factor) {
                const fk2 = supabaseBrowser
                  .from('emission_factors')
                  .select('unit_in, unit_out, value, valid_from')
                  .eq('category', tryKey)
                  .eq('region', 'global')
                  .neq('value', 0)
                  .order('valid_from', { ascending: false })
                  .limit(1);
                const { data: fac4 } = await fk2.maybeSingle();
                if (fac4) factor = fac4 as any;
              }
            }
          }
        }
        if (!factor) { setPreview('-'); setCalcError('Uygun emisyon faktörü bulunamadı'); return; }

        let multiplier = 1;
        if (unit !== factor.unit_in) {
          const cacheKey = `${unit}->${factor.unit_in}`;
          let cached = cacheRef.get(cacheKey);
          if (typeof cached === 'undefined') {
            const { data: conv } = await supabaseBrowser
              .from('unit_conversions')
              .select('multiplier')
              .eq('from_unit', unit)
              .eq('to_unit', factor.unit_in)
              .maybeSingle();
            cached = conv?.multiplier ? Number(conv.multiplier) : NaN;
            cacheRef.set(cacheKey, cached);
          }
          if (!cached || Number.isNaN(cached)) {
            setPreview('-');
            setCalcError(`'${unit}' biriminden '${factor.unit_in}' birimine dönüşüm bulunamadı`);
            return;
          }
          multiplier = cached;
        }

        const normalized = amount * multiplier;
        const co2e = normalized * Number(factor.value);
        if (!cancelled) {
          // Display tCO2e for >= 1000 kg, otherwise kg
          const displayInTons = factor.unit_out === 'kg' && co2e >= 1000;
          const valueNum = displayInTons ? (co2e / 1000) : co2e;
          const valueStr = valueNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
          const unitStr = displayInTons ? 'tCO2e' : `${factor.unit_out} CO2e`;
          setPreview(`${valueStr} ${unitStr}`);
          setCalcError(null);
        }
      } finally {
        if (!cancelled) setCalculating(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [type, amount, unit, activity, category, date]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md overflow-hidden">
      <form action={action} className="space-y-8" onSubmit={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Kaydediliyor…', variant: 'info' } }));
        }
      }}>
        {/* Hidden project id for server action */}
        <input type="hidden" name="project_id" value={projectId} />
        {/* Adım 1: Aktivite Seçimi */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="font-medium text-lg">Adım 1: Aktivite Seçimi</h3>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-3">
              <label className="form-label flex items-center gap-2">
                <span>Aktivite/Materyal</span>
                <span className="bg-leaf-500/20 text-leaf-400 text-xs px-2 py-0.5 rounded-full">Önerilen</span>
              </label>
              <ActivitySelect value={activity} onChange={setActivity} />
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-2">
                    <span>Tür</span>
                    {activity && <span className="text-xs text-white/50">(Aktiviteden alındı)</span>}
                  </label>
                  <div className="relative">
                    {/* When the select is disabled, HTML forms do not submit its value.
                        Submit a hidden input so server action receives 'type'. */}
                    {activity ? (
                      <input type="hidden" name="type" value={type} />
                    ) : null}
                    <select 
                      name="type" 
                      value={type} 
                      onChange={(e) => setType(e.target.value as any)} 
                      disabled={!!activity} 
                      required={!activity}
                      className="form-input disabled:bg-white/5 disabled:border-white/5 disabled:text-white/70 appearance-none pr-10 w-full"
                    >
                      <option value="">Seç</option>
                      <option value="energy">Enerji</option>
                      <option value="transport">Ulaşım</option>
                      <option value="materials">Malzeme</option>
                      <option value="other">Diğer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-2">
                    <span>Emisyon Kaynağı</span>
                    {activity && <span className="text-xs text-white/50">(Aktiviteden alındı)</span>}
                  </label>
                  <div className="relative">
                    {/* Same for scope: ensure value is submitted when select is disabled */}
                    {activity ? (
                      <input type="hidden" name="scope" value={scope} />
                    ) : null}
                    <select 
                      name="scope" 
                      value={scope} 
                      onChange={(e) => setScope(e.target.value as any)} 
                      disabled={!!activity} 
                      className="form-input disabled:bg-white/5 disabled:border-white/5 disabled:text-white/70 appearance-none pr-10 w-full"
                    >
                      <option value="">Seç</option>
                      <option value="scope1">Doğrudan</option>
                      <option value="scope2">Satın Alınan Enerji</option>
                      <option value="scope3">Diğer Dolaylı</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Doğrudan: kendi faaliyetlerinizden; Satın Alınan Enerji: tüketilen elektrik/ısı; Diğer Dolaylı: tedarik/taşımacılık vb.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-2">
                    <span>Kategori</span>
                    {activity && <span className="text-xs text-white/50">(Aktiviteden alındı)</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 12V8h-4V4h-4v4H8v4H4v4h4v4h4v-4h4v-4h4z"></path>
                      </svg>
                    </div>
                    {/* Show Turkish label, keep slug in hidden field for submission */}
                    {activity ? (
                      <>
                        <input 
                          value={categoryDisplay} 
                          readOnly 
                          className="form-input pl-10 disabled:bg-white/5 disabled:border-white/5 disabled:text-white/70 w-full" 
                          disabled
                        />
                        <input type="hidden" name="category" value={category} />
                      </>
                    ) : (
                      <input 
                        name="category" 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        placeholder="örn. elektrik" 
                        className="form-input pl-10 w-full" 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Adım 2: Miktar ve Tarih */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 className="font-medium text-lg">Adım 2: Miktar ve Tarih</h3>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label">Miktar</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
                      <Calculator size={16} />
                    </div>
                    <input 
                      name="amount" 
                      type="number" 
                      step="any" 
                      value={amount || ''} 
                      onChange={(e) => setAmount(Number(e.target.value))} 
                      required 
                      className="form-input pl-10 w-full"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="w-32">
                    <UnitSelect activityId={activity} value={unit} onChange={setUnit} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="form-label">Tarih</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <input 
                    name="date" 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                    className="form-input pl-10 w-full [&::-webkit-calendar-picker-indicator]:bg-white/20 [&::-webkit-calendar-picker-indicator]:rounded [&::-webkit-calendar-picker-indicator]:hover:bg-white/30 [&::-webkit-calendar-picker-indicator]:p-1" 
                  />
                </div>
                <p className="text-xs text-white/50 mt-1">Emisyonun gerçekleştiği tarih</p>
              </div>
            </div>
          </div>
          
          {/* CO2e Hesaplama ve Notlar */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <path d="M14 2v6h6"></path>
                    <path d="M16 13H8"></path>
                    <path d="M16 17H8"></path>
                    <path d="M10 9H8"></path>
                  </svg>
                </div>
                <h3 className="font-medium">Notlar (opsiyonel)</h3>
              </div>
              
              <div className="relative">
                <textarea 
                  name="notes" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="form-input min-h-[180px] w-full" 
                  placeholder="Ek bilgiler, konum, tedarikçi vb."
                />
              </div>
            </div>
            
            <div className={`rounded-xl ${!calcError ? 'bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 border border-leaf-500/20' : 'bg-gradient-to-br from-red-500/10 to-red-800/10 border border-red-500/20'} p-5 flex flex-col h-full`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-md ${!calcError ? 'bg-leaf-500/20' : 'bg-red-500/20'} border border-white/10`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={calcError ? 'text-red-400' : 'text-leaf-400'}>
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                  </svg>
                </div>
                <h3 className="font-medium">CO₂ Emisyonu Önizleme</h3>
              </div>
              
              <div className="flex-grow flex flex-col justify-center items-center py-8">
                {calculating ? (
                  <div className="flex flex-col items-center text-white/70">
                    <svg className="animate-spin h-10 w-10 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Hesaplanıyor...</span>
                  </div>
                ) : calcError ? (
                  <div className="text-center">
                    <div className="text-red-300 text-4xl font-bold mb-3">—</div>
                    <div className="text-red-300 text-sm max-w-xs mx-auto">{calcError}</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl font-bold highlight-text mb-3">{preview}</div>
                    <div className="text-white/60 text-sm">Tahmini CO₂ eşdeğeri</div>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-white/60 text-center border-t border-white/10 pt-3 mt-2">
                Değerler, seçilen aktivite ve miktara göre otomatik hesaplanır
              </div>
            </div>
          </div>
          
          {/* Kaydet ve Geri Butonları */}
          <div className="mt-8 flex justify-between items-center">
            <a 
              href={`/projects/${projectId}`}
              className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <span>Geri Dön</span>
            </a>
            
            <Button 
              type="submit"
              className="bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 px-8 py-3 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg flex items-center gap-2"
            >
              <span>Kaydı Tamamla</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}


