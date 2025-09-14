import { createEntry } from './server';
import EntryForm from './EntryForm';

export default function NewEntryPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Yeni Kayıt</h1>
      <EntryForm projectId={params.id} action={createEntry.bind(null, params.id)} />
    </div>
  );
}


