import { createClient } from '@/lib/server';

export const dynamic = 'force-static';

export default async function PrintPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, organization_id, organizations(logo_url, name)')
    .eq('id', params.id)
    .maybeSingle();
  const { data: entries } = await supabase
    .from('entries')
    .select('date, type, amount, unit, co2e_value, co2e_unit')
    .eq('project_id', params.id)
    .order('date', { ascending: true });

  const org: any = (project as any)?.organizations || null;

  return (
    <div className="p-8 print:p-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{project?.name}</h1>
          <p className="text-green-300/80">{project?.description}</p>
        </div>
        {org?.logo_url ? (
          <img src={org.logo_url} alt={org?.name || 'Logo'} className="h-12 w-auto object-contain" />
        ) : null}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/20">
            <th className="text-left py-2">Tarih</th>
            <th className="text-left py-2">Tür</th>
            <th className="text-left py-2">Miktar</th>
            <th className="text-left py-2">CO2e</th>
          </tr>
        </thead>
        <tbody>
          {entries?.map((e, i) => (
            <tr key={i} className="border-b border-white/10">
              <td className="py-1">{e.date}</td>
              <td className="py-1">{e.type}</td>
              <td className="py-1">{e.amount} {e.unit}</td>
              <td className="py-1">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`@media print { header, nav { display: none !important } body { background: #fff; color:#000 } }`}</style>
    </div>
  );
}


