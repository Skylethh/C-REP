"use client";
import React from 'react';

export function DocsSearchClient() {
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const elts = Array.from(document.querySelectorAll('[data-doc-row]')) as HTMLElement[];
    for (const el of elts) {
      const hay = (el.getAttribute('data-hay') || '').toLowerCase();
      const show = hay.includes(q.toLowerCase());
      el.style.display = show ? '' : 'none';
    }
  }, [q]);
  return (
    <div className="mb-3">
      <input className="form-input w-full" placeholder="Ara: kod, ad, mime" value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
  );
}
