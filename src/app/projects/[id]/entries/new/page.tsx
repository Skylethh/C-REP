import { createEntry } from './server';
import EntryForm from './EntryForm';

export default async function NewEntryPage({ params }: { params: { id: string } }) {
  const p = params;
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
        
        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold highlight-text">Yeni Emisyon Kaydı</h1>
          </div>
          
          <p className="text-white/70 ml-11">
            Projeniz için yeni bir emisyon kaydı oluşturun. Aktivite seçerek veya manuel olarak bilgileri girerek devam edebilirsiniz.
          </p>
        </div>
      </div>
      
      <EntryForm projectId={p.id} action={createEntry.bind(null, p.id)} />
    </div>
  );
}


