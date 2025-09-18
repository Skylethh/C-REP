"use client";
import { useState, useTransition } from 'react';

export type WeatherQuickSetProps = {
  current: string | null | undefined;
  options?: string[];
  onSet: (formData: FormData) => Promise<any>;
  onSuggest?: () => Promise<any>;
};

export function WeatherQuickSet({ current, options = ['Güneşli','Parçalı Bulutlu','Bulutlu','Yağmurlu','Kar'], onSet, onSuggest }: WeatherQuickSetProps) {
  const [value, setValue] = useState<string>(current || '');
  const [isPending, startTransition] = useTransition();

  const handleChoose = (w: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('weather', w);
      try {
        await onSet(fd);
        setValue(w);
      } catch {
        // keep previous value on error
      }
    });
  };

  const handleSuggest = () => {
    if (!onSuggest) return;
    startTransition(async () => {
      try {
        const res = await onSuggest();
        if (res && typeof res === 'object' && typeof (res as any).weather === 'string') {
          setValue((res as any).weather);
        }
      } catch {}
    });
  };

  return (
    <div className="glass rounded border border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Hava Durumu</div>
        <div className="text-xs text-white/60">Şu an: {value || '-'}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => handleChoose(w)}
            className={`px-3 py-1.5 rounded border ${value === w ? 'border-emerald-400/40 bg-emerald-500/15' : 'border-white/10 bg-white/10 hover:bg-white/20'} disabled:opacity-50`}
            disabled={isPending}
          >
            {w}
          </button>
        ))}
        {onSuggest && (
          <button
            type="button"
            onClick={handleSuggest}
            className="px-3 py-1.5 rounded border border-emerald-500/20 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50"
            disabled={isPending}
          >
            Öner (Beta)
          </button>
        )}
      </div>
    </div>
  );
}
