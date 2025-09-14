'use client';
export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-2">Bir şeyler ters gitti</h1>
      <p className="text-green-300/80">{error.message}</p>
    </div>
  );
}


