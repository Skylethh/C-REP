"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/client';
import { formatCo2eTons } from '@/lib/units';
import { Button } from '@/components/button';
import DateRangePicker from '@/components/DateRangePicker';
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
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-transparent border border-white/20 rounded-md px-3 py-2"
              >
                <option value="" className="bg-black">Proje seçin…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-black">{p.name}</option>
                ))}
              </select>
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
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent border border-white/20 rounded-md px-3 py-2">
                <option value="" className="bg-black">Hepsi</option>
                <option value="energy" className="bg-black">Enerji</option>
                <option value="transport" className="bg-black">Ulaşım</option>
                <option value="materials" className="bg-black">Malzemeler</option>
                <option value="other" className="bg-black">Diğer</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Scope (opsiyonel)</label>
              <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="bg-transparent border border-white/20 rounded-md px-3 py-2">
                <option value="" className="bg-black">Hepsi</option>
                <option value="scope1" className="bg-black">Scope 1</option>
                <option value="scope2" className="bg-black">Scope 2</option>
                <option value="scope3" className="bg-black">Scope 3</option>
              </select>
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
    </div>
  );
}
