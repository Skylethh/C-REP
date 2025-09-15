"use client";
import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/button';

type ParsedRow = Record<string, string>;

const defaultMapping: Record<string, string> = {
  date: 'date',
  type: 'type',
  amount: 'amount',
  unit: 'unit',
  category: 'category',
  scope: 'scope',
  notes: 'notes',
};

export default function ImportEntriesPage({ params }: { params: { id: string } }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>(defaultMapping);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; failed: number; errors?: string[] } | null>(null);

  function handleParse() {
    if (!file) return;
    setError(null);
    setRows([]);
    setHeaders([]);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const data = (res.data as any[]).filter(Boolean);
        const hdrs = res.meta.fields?.map((f) => String(f)) || [];
        setRows(data as ParsedRow[]);
        setHeaders(hdrs);
      },
      error: (e) => setError(e.message),
    });
  }

  async function handleImport() {
    if (!rows.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload = { projectId: params.id, mapping, rows };
      const resp = await fetch('/api/import-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setResult(data);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'İçe aktarma tamamlandı', variant: 'success' } }));
      }
    } catch (e: any) {
      setError(e.message || 'İçe aktarma hatası');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e.message || 'İçe aktarma hatası', variant: 'error' } }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg mb-6">
        <div className="p-6">
          <h1 className="text-2xl font-bold highlight-text">CSV Toplu İçe Aktarma</h1>
          <p className="text-white/70">Sütunları eşleştirin, önizleyin ve proje kayıtlarını ekleyin.</p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div>
          <Button disabled={!file} onClick={handleParse} className="bg-gradient-to-r from-leaf-600 to-ocean-600">CSV'yi Oku</Button>
        </div>
        {headers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Sütun Eşleme</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(defaultMapping).map((field) => (
                <div key={field} className="space-y-1">
                  <div className="text-xs text-white/60">{field}</div>
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                    className="form-input py-1.5"
                  >
                    <option value="">(seçin)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/70">{rows.length} satır önizleme</div>
            <Button disabled={busy} onClick={handleImport} className="bg-gradient-to-r from-leaf-600 to-ocean-600">İçe Aktar</Button>
          </div>
          <div className="rounded-md border border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5">
                  {headers.map((h) => (
                    <th key={h} className="text-left p-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    {headers.map((h) => (
                      <td key={h} className="p-2">{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error ? (
        <div className="text-xs text-red-300 bg-red-500/10 px-3 py-2 rounded">{error}</div>
      ) : null}
      {result ? (
        <div className="text-xs text-green-300 bg-green-500/10 px-3 py-2 rounded">{result.inserted} eklendi, {result.failed} başarısız</div>
      ) : null}
    </div>
  );
}


