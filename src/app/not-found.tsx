import Link from 'next/link';

export default function NotFound() {
  return (
  <div className="app-container py-16">
      <h1 className="text-2xl font-semibold mb-2">Sayfa bulunamadı</h1>
      <Link className="underline" href="/">Ana sayfaya dön</Link>
    </div>
  );
}


