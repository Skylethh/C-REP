"use client";
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/client';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type Row = {
  id: string;
  title: string;
  file_path: string;
  size: number | null;
  created_at: string;
  period_start: string | null;
  period_end: string | null;
  scope?: string | null;
  type?: string | null;
  report_id?: string | null;
  checksum_sha256?: string | null;
};

export default function ReportArchive({ projectId }: { projectId: string }) {
  const scopeLabel = (s?: string | null) => {
    switch ((s || '').toLowerCase()) {
      case 'scope1': return 'Scope 1 — Doğrudan';
      case 'scope2': return 'Scope 2 — Enerji';
      case 'scope3': return 'Scope 3 — Diğer dolaylı';
      default: return '';
    }
  };
  const typeLabel = (t?: string | null) => {
    switch ((t || '').toLowerCase()) {
      case 'energy': return 'Enerji';
      case 'transport': return 'Ulaşım';
      case 'materials': return 'Malzemeler';
      case 'other': return 'Diğer';
      default: return '';
    }
  };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  async function refresh() {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data } = await supabaseBrowser
        .from('generated_reports')
        .select('id, title, file_path, size, created_at, period_start, period_end, scope, type, report_id, checksum_sha256')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);
      setRows((data as any) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [projectId]);

  async function onDelete(id: string) {
    if (!confirm('Raporu silmek istediğinize emin misiniz?')) return;
    setDeleting(id);
    const res = await fetch(`/api/reports/archive/delete?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || 'Silinemedi');
      setDeleting(null);
      return;
    }
    setDeleting(null);
    refresh();
  }

  if (!projectId) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Arşivlenmiş Raporlar</h2>
      {!rows || rows.length === 0 ? (
        <div className="text-sm text-white/60 bg-white/5 border border-white/10 rounded-lg p-4">
          {loading ? 'Yükleniyor…' : 'Henüz kayıtlı rapor yok.'}
        </div>
      ) : (
        <div className="divide-y divide-white/10 rounded-lg overflow-hidden border border-white/10 bg-white/5">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3 hover:bg-ocean-900/10 transition-colors">
              <div className="flex-1">
                <div className="text-white/90 font-medium flex items-center gap-2">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className="text-ocean-300/80"><path fill="currentColor" d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V7h4.5L13 3.5zM8 11h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>
                  <span>{r.title}</span>
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  {r.period_start && r.period_end ? (
                    <span>
                      Dönem: {format(new Date(r.period_start), 'd LLL yyyy', { locale: tr })} – {format(new Date(r.period_end), 'd LLL yyyy', { locale: tr })}
                    </span>
                  ) : null}
                  <span className="ml-3">Tarih: {format(new Date(r.created_at as any), 'd LLL yyyy HH:mm', { locale: tr })}</span>
                  {typeof r.size === 'number' && (
                    <span className="ml-3">Boyut: {(r.size / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                  {r.scope ? (
                    <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-white/70">
                      {scopeLabel(r.scope)}
                    </span>
                  ) : null}
                  {r.type ? (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-white/70">
                      {typeLabel(r.type)}
                    </span>
                  ) : null}
                  {r.report_id ? (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-white/70">
                      <span>ID: {r.report_id}</span>
                      <button
                        type="button"
                        className="underline decoration-dotted hover:text-white/90"
                        onClick={() => navigator.clipboard.writeText(r.report_id!)}
                        title="ID kopyala"
                      >kopyala</button>
                    </span>
                  ) : null}
                  {r.checksum_sha256 ? (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-white/70">
                      <span>SHA-256: {r.checksum_sha256.slice(0,8)}…</span>
                      <button
                        type="button"
                        className="underline decoration-dotted hover:text-white/90"
                        onClick={() => navigator.clipboard.writeText(r.checksum_sha256!)}
                        title="Hash kopyala"
                      >kopyala</button>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/reports/archive/download?id=${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md bg-ocean-950/30 border border-white/15 text-white/90 text-sm hover:border-ocean-400/40 hover:bg-ocean-900/20 transition-colors"
                >
                  İndir
                </a>
                {r.checksum_sha256 ? (
                  <button
                    onClick={async () => {
                      setVerifying(r.id);
                      try {
                        const url = `/api/reports/archive/download?id=${r.id}`;
                        const resp = await fetch(url);
                        // We get a redirect; follow to actual file
                        const finalUrl = resp.redirected ? resp.url : url;
                        const fileResp = await fetch(finalUrl);
                        const buf = await fileResp.arrayBuffer();
                        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
                        const hashArr = Array.from(new Uint8Array(hashBuf));
                        const hex = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
                        if (hex === r.checksum_sha256) {
                          alert('Doğrulama başarılı: checksum eşleşti.');
                        } else {
                          alert('Checksum uyuşmadı! Dosya değişmiş olabilir.');
                        }
                      } catch (e: any) {
                        alert('Doğrulama başarısız: ' + (e?.message || 'hata'));
                      } finally {
                        setVerifying(null);
                      }
                    }}
                    disabled={verifying === r.id}
                    className="px-3 py-1.5 rounded-md bg-white/5 border border-white/15 text-white/90 text-sm hover:border-ocean-400/40 hover:bg-ocean-900/20 transition-colors"
                  >
                    {verifying === r.id ? 'Doğrulanıyor…' : 'Doğrula'}
                  </button>
                ) : null}
                <button
                  onClick={() => onDelete(r.id)}
                  disabled={deleting === r.id}
                  className="px-3 py-1.5 rounded-md bg-red-950/30 border border-red-800/40 text-red-200 text-sm hover:border-red-500/50 hover:bg-red-900/20 transition-colors"
                >
                  {deleting === r.id ? 'Siliniyor…' : 'Sil'}
                </button>
              </div>
            </div>)
          )}
        </div>
      )}
    </div>
  );
}
