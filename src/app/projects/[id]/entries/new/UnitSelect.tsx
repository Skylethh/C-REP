"use client";
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';

export default function UnitSelect({ activityId, value, onChange }: { activityId: string; value: string; onChange: (v: string) => void }) {
  const [units, setUnits] = useState<string[]>(['kWh','km','kg','g','L']);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      if (!activityId) return;
      setLoading(true);
      const { data: act } = await supabaseBrowser
        .from('activities')
        .select('units, default_unit')
        .eq('id', activityId)
        .maybeSingle();
      if (act?.units?.length) {
        setUnits(act.units as string[]);
        if (act.default_unit) onChange(act.default_unit);
      }
      setLoading(false);
    })();
  }, [activityId]);
  return (
    <div className="relative">
      <select 
        name="unit" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all appearance-none pr-10"
      >
        {loading ? (
          <option value={value}>Yükleniyor...</option>
        ) : (
          <>
            <option value={value}>{value}</option>
            {units.filter(u => u !== value).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </>
        )}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center rounded-lg">
          <svg className="animate-spin h-4 w-4 mr-2 text-leaf-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}


