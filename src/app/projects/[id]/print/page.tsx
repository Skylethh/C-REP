import { createClient } from '@/lib/server';

export const dynamic = 'force-static';

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, organization_id, organizations(logo_url, name)')
    .eq('id', p.id)
    .maybeSingle();
  const { data: entries } = await supabase
    .from('entries')
    .select('date, type, amount, unit, co2e_value, co2e_unit')
    .eq('project_id', p.id)
    .order('date', { ascending: true });

  const org: any = (project as any)?.organizations || null;

  return (
    <div className="p-8 print:p-4 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 print:mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 print:text-2xl print:text-black">{project?.name}</h1>
          <p className="text-lg text-green-300/80 print:text-gray-600 print:text-base">{project?.description}</p>
        </div>
        {org?.logo_url ? (
          <img src={org.logo_url} alt={org?.name || 'Logo'} className="h-16 w-auto object-contain print:h-12" />
        ) : null}
      </div>

      {/* Summary Stats */}
      <div className="mb-8 print:mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
        <div className="glass p-4 rounded-lg border border-white/10 print:border print:border-gray-300 print:bg-gray-50">
          <div className="text-sm text-white/70 print:text-gray-600">Toplam Kayıt</div>
          <div className="text-2xl font-bold print:text-xl print:text-black">{entries?.length || 0}</div>
        </div>
        <div className="glass p-4 rounded-lg border border-white/10 print:border print:border-gray-300 print:bg-gray-50">
          <div className="text-sm text-white/70 print:text-gray-600">Toplam CO₂e</div>
          <div className="text-2xl font-bold print:text-xl print:text-black">
            {(entries?.reduce((sum, e) => sum + (Number(e.co2e_value) || 0), 0) || 0).toFixed(2)} kg
          </div>
        </div>
        <div className="glass p-4 rounded-lg border border-white/10 print:border print:border-gray-300 print:bg-gray-50">
          <div className="text-sm text-white/70 print:text-gray-600">Rapor Tarihi</div>
          <div className="text-lg font-semibold print:text-base print:text-black">
            {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass rounded-xl border border-white/10 overflow-hidden print:border print:border-gray-300 print:bg-white print:shadow-none">
        <div className="p-4 border-b border-white/10 print:border-gray-300 print:bg-gray-50">
          <h2 className="text-xl font-semibold print:text-lg print:text-black">Emisyon Kayıtları</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/20 print:border-gray-300 bg-white/5 print:bg-gray-100">
                <th className="text-left py-3 px-4 font-medium print:text-black">Tarih</th>
                <th className="text-left py-3 px-4 font-medium print:text-black">Tür</th>
                <th className="text-left py-3 px-4 font-medium print:text-black">Miktar</th>
                <th className="text-left py-3 px-4 font-medium print:text-black">CO₂e</th>
              </tr>
            </thead>
            <tbody>
              {entries?.map((e, i) => (
                <tr key={i} className="border-b border-white/10 print:border-gray-200 hover:bg-white/5 print:hover:bg-gray-50">
                  <td className="py-3 px-4 print:text-black">{new Date(e.date).toLocaleDateString('tr-TR')}</td>
                  <td className="py-3 px-4 print:text-black capitalize">{e.type}</td>
                  <td className="py-3 px-4 print:text-black">{e.amount} {e.unit}</td>
                  <td className="py-3 px-4 font-medium print:text-black">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</td>
                </tr>
              ))}
              {(!entries || entries.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-white/60 print:text-gray-500">
                    Henüz kayıt bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-white/10 print:border-gray-300 text-center text-sm text-white/60 print:text-gray-500">
        <p>Bu rapor {new Date().toLocaleDateString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
        {org?.name && <p className="mt-1">{org.name}</p>}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          * { color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}


