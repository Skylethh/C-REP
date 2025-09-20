'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

type ToolsMenuProps = {
  projectId: string;
};

export default function ToolsMenu({ projectId }: ToolsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) && btnRef.current && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const toggle = () => {
    if (!btnRef.current) return setOpen((v) => !v);
    const rect = btnRef.current.getBoundingClientRect();
    // Panel width ~ 240px, align right to button
    const panelWidth = 240;
    const gap = 8;
    const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, rect.right - panelWidth));
    const top = Math.min(window.innerHeight - 8, rect.bottom + gap);
    setPos({ top, left });
    setOpen((v) => !v);
  };

  const Panel = (
    <div className="fixed inset-0 z-50" aria-hidden={!open}>
      {/* Click-catcher overlay */}
      <div className="absolute inset-0" />
      <div
        ref={panelRef}
        style={{ top: pos.top, left: pos.left, width: 240 }}
        className="absolute rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in-0 zoom-in-95"
      >
        <div className="px-3 pt-2 pb-3 text-sm font-medium text-white/80">Araçlar</div>
        <div className="flex flex-col gap-1">
          <Link
            href={`/projects/${projectId}/members`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:text-white bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
            onClick={() => setOpen(false)}
          >
            {/* Users icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Üyeler
          </Link>
          <Link
            href={`/projects/${projectId}/documents`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:text-white bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
            onClick={() => setOpen(false)}
          >
            {/* Docs icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
            </svg>
            Dokümanlar
          </Link>
          <Link
            href={`/projects/${projectId}/export`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:text-white bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
            onClick={() => setOpen(false)}
          >
            {/* Download icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            CSV İndir
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/15 px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-white/90 hover:text-white shadow-sm hover:shadow-md"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>Araçlar</span>
        {/* Chevron to indicate dropdown; rotates when open */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden="true"
          focusable="false"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {mounted && open ? createPortal(Panel, document.body) : null}
    </div>
  );
}
