"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/client';
import { formatCo2eTons } from '@/lib/units';
import { Button } from '@/components/button';
import DateRangePicker from '@/components/DateRangePicker';
import dynamic from 'next/dynamic';
import LineChart from '@/components/charts/LineChart';
const ReportArchive = dynamic(() => import('@/components/reports/ReportArchive'), { ssr: true });
import { generateReportTitle } from '@/lib/utils';

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>(''); // energy | transport | materials | other
  const [scopeFilter, setScopeFilter] = useState<string>(''); // scope1 | scope2 | scope3
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [preview, setPreview] = useState<string>('Seçilen aralıkta — kayıt bulundu. Toplam Emisyon: — tCO2e');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState<{ totalEmissions: number; entryCount: number; topSource: string | null; anomalyCount?: number; summary?: string } | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [series, setSeries] = useState<Array<{ label: string; value: number }>>([]);

  const onGenerate = async () => {
    if (!projectId || !dateStart || !dateEnd) {
      alert('Proje ve tarih aralığını seçiniz.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, dateStart, dateEnd, type: typeFilter, scope: scopeFilter, projectName: projectLabelById(projectId) || undefined, title: (customTitle || autoTitle) })
      });
      if (!res.ok) {
        let detail = '';
        let phaseHint = '';
        try {
          const txt = await res.text();
          try {
            const j = JSON.parse(txt);
            detail = j?.error || txt;
            if (j?.phase) phaseHint = ` (aşama: ${j.phase})`;
          } catch {
            detail = txt;
          }
        } catch {}
        throw new Error(`Rapor oluşturulamadı${detail ? `: ${detail}` : ''}${phaseHint}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
      a.href = url;
  const safeName = ((customTitle || autoTitle) || projectLabelById(projectId) || `Proje_${projectId}`).replace(/[^a-zA-Z0-9-_]+/g, '_');
    a.download = `${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Rapor oluşturma sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onPreview = async () => {
    if (!projectId || !dateStart || !dateEnd) {
      setPreview('Lütfen proje ve tarih aralığını seçin.');
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, dateStart, dateEnd, type: typeFilter, scope: scopeFilter }),
      });
      if (!res.ok) throw new Error('Önizleme alınamadı');
  const data = await res.json();
  const f = formatCo2eTons(Number(data.totalEmissions) || 0, 2);
  setKpi({ totalEmissions: Number(data.totalEmissions) || 0, entryCount: Number(data.entryCount) || 0, topSource: data.topSource || null, anomalyCount: Number(data.anomalyCount) || 0, summary: data.summary || '' });
  setPreview(`Seçilen aralıkta ${data.entryCount} adet kayıt bulundu. Toplam Emisyon: ${f.value} ${f.unit}`);
  if (Array.isArray(data.series)) {
    setSeries((data.series || []).map((d: any) => ({ label: d.month || d.label, value: Number(d.totalKg || d.value || 0) })));
  } else {
    setSeries([]);
  }
    } catch (e) {
      console.error(e);
      setPreview('Önizleme sırasında bir hata oluştu.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto-refresh preview when all inputs are present
  useEffect(() => {
    if (projectId && dateStart && dateEnd) {
      onPreview();
    }
  }, [projectId, dateStart, dateEnd, typeFilter, scopeFilter]);

  // Load projects (client-side; RLS applies)
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabaseBrowser
        .from('projects')
        .select('id, name')
        .order('name');
      if (!active) return;
      if (error) {
        console.error('Projeler alınamadı', error);
        setProjects([]);
      } else {
        setProjects((data || []).map((p: any) => ({ id: String(p.id), name: p.name })));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Helpers
  const projectLabelById = useMemo(() => (pid: string) => projects.find(p => p.id === pid)?.name || '', [projects]);

  // Auto report title based on project/date
  const autoTitle = useMemo(() => {
    const name = projectLabelById(projectId) || 'Proje';
    return generateReportTitle(name, { from: dateStart, to: dateEnd });
  }, [projectId, projectLabelById, dateStart, dateEnd]);

  // Keep customTitle in sync with autoTitle upon key inputs selection if user hasn't typed yet
  useEffect(() => {
    setCustomTitle((prev) => (prev ? prev : autoTitle));
  }, [autoTitle]);

  // Initialize from URL params on mount
  useEffect(() => {
    const pid = searchParams.get('project') || '';
    const ds = searchParams.get('start') || '';
    const de = searchParams.get('end') || '';
    const tf = searchParams.get('type') || '';
    const sf = searchParams.get('scope') || '';
    if (pid) setProjectId(pid);
    // removed manual project name
    if (ds) setDateStart(ds);
    if (de) setDateEnd(de);
    if (tf) setTypeFilter(tf);
    if (sf) setScopeFilter(sf);
  }, []);

  // Persist to URL when inputs change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (projectId) { params.set('project', projectId); } else { params.delete('project'); }
    params.delete('name');
    if (dateStart) { params.set('start', dateStart); } else { params.delete('start'); }
    if (dateEnd) { params.set('end', dateEnd); } else { params.delete('end'); }
    if (typeFilter) { params.set('type', typeFilter); } else { params.delete('type'); }
    if (scopeFilter) { params.set('scope', scopeFilter); } else { params.delete('scope'); }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?');
  }, [projectId, dateStart, dateEnd, typeFilter, scopeFilter, router]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <style jsx>{`
        /* Improve native dropdown panel aesthetics */
        select:focus-visible { outline: none; }
        /* Hint color scheme for system UIs */
        :root { color-scheme: dark; }
        /* Cross-browser dropdown background */
        option { background-color: #082f49; color: #fff; }
        @-moz-document url-prefix() {
          option { background-color: #082f49; color: #fff; }
        }
      `}</style>
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-4">Rapor Oluştur</h1>
        <div className="grid gap-4">
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-white/60 mb-1">Rapor Başlığı</div>
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={autoTitle}
              className="w-full bg-transparent border border-white/20 rounded-md px-3 py-2 text-sm"
            />
            <div className="mt-1 text-[11px] text-white/50">Dosya adı ve PDF kapağında kullanılacak.</div>
          </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Proje</label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full appearance-none bg-ocean-950/30 border border-white/15 rounded-lg pl-3 pr-10 py-2 text-white/90 shadow-inner shadow-black/10 backdrop-blur-sm hover:border-ocean-400/30 hover:bg-ocean-900/20 focus:outline-none focus:ring-2 focus:ring-ocean-400/50 transition-all duration-200"
                >
                  <option value="" className="bg-ocean-950 text-white">Proje seçin…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-ocean-950 text-white">{p.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          {/* Proje adı alanı kaldırıldı; gerçek ad proje seçimi üzerinden gösterilir */}
          {/* Tarih aralığı bloğu (DateRangePicker) */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <DateRangePicker
              from={dateStart}
              to={dateEnd}
              onChange={(from, to) => { setDateStart(from); setDateEnd(to); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Tür (opsiyonel)</label>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full appearance-none bg-ocean-950/30 border border-white/15 rounded-lg pl-3 pr-10 py-2 text-white/90 shadow-inner shadow-black/10 backdrop-blur-sm hover:border-ocean-400/30 hover:bg-ocean-900/20 focus:outline-none focus:ring-2 focus:ring-ocean-400/50 transition-all duration-200"
                >
                  <option value="" className="bg-ocean-950 text-white">Hepsi</option>
                  <option value="energy" className="bg-ocean-950 text-white">Enerji</option>
                  <option value="transport" className="bg-ocean-950 text-white">Ulaşım</option>
                  <option value="materials" className="bg-ocean-950 text-white">Malzemeler</option>
                  <option value="other" className="bg-ocean-950 text-white">Diğer</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Scope (opsiyonel)</label>
              <div className="relative">
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="w-full appearance-none bg-ocean-950/30 border border-white/15 rounded-lg pl-3 pr-10 py-2 text-white/90 shadow-inner shadow-black/10 backdrop-blur-sm hover:border-ocean-400/30 hover:bg-ocean-900/20 focus:outline-none focus:ring-2 focus:ring-ocean-400/50 transition-all duration-200"
                >
                  <option value="" className="bg-ocean-950 text-white">Hepsi</option>
                  <option value="scope1" className="bg-ocean-950 text-white">Scope 1 — Doğrudan</option>
                  <option value="scope2" className="bg-ocean-950 text-white">Scope 2 — Enerji</option>
                  <option value="scope3" className="bg-ocean-950 text-white">Scope 3 — Diğer dolaylı</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
          {/* Preview KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60 mb-1">Toplam Emisyon</div>
              <div className="text-xl font-semibold highlight-text">
                {previewLoading ? '…' : (() => { const v = kpi?.totalEmissions ?? 0; const f = formatCo2eTons(v, 2); return `${f.value} ${f.unit}`; })()}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60 mb-1">Kayıt Sayısı</div>
              <div className="text-xl font-semibold">{previewLoading ? '…' : (kpi?.entryCount ?? '—')}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60 mb-1">En Yüksek Kaynak</div>
              <div className="text-xl font-semibold">{previewLoading ? '…' : (kpi?.topSource ?? '—')}</div>
            </div>
          </div>
          {/* Smart summary and anomalies */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-2 h-2 rounded-full bg-leaf-400 mt-2"></div>
              <div className="text-sm text-white/80">
                <div className="font-medium mb-1">Akıllı Özet</div>
                <div className="text-white/70">{previewLoading ? 'Özet hazırlanıyor…' : (kpi?.summary || 'Özet için veri seçiniz.')}</div>
                {typeof kpi?.anomalyCount === 'number' && kpi.anomalyCount > 0 && (
                  <div className="mt-2 text-xs text-amber-300">
                    Uyarı: Verilerde {kpi.anomalyCount} olası aykırı değer tespit edildi.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-white/80 text-sm bg-white/5 border border-white/10 rounded-md p-3">
            Veri Önizleme: {previewLoading ? 'Yükleniyor…' : preview}
          </div>
          <div className="flex gap-3">
            <Button onClick={onPreview} variant="ghost">Önizleme Güncelle</Button>
            <Button onClick={onGenerate} disabled={loading} className="ml-auto" size="lg">
              {loading ? 'Oluşturuluyor…' : 'PDF Raporu Oluştur'}
            </Button>
          </div>
        </div>
      </div>
      {/* Archive list */}
      {projectId ? (<ReportArchive projectId={projectId} />) : null}
      {series.length > 0 && (
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/70 mb-2 flex items-center gap-2 min-w-0">
            <span>Zaman Serisi: Aylık Toplam Emisyon (tCO2e)</span>
            {projectId ? (
              <span
                className="text-white/80 font-medium truncate"
                title={projectLabelById(projectId)}
              >
                — {projectLabelById(projectId)}
              </span>
            ) : null}
          </div>
          <LineChart data={series} />
        </div>
      )}
    </div>
  );
}
