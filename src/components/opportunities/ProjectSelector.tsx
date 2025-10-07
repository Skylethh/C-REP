"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Search, Loader2, Check } from 'lucide-react';

export type ProjectSelectorProps = {
  projects: Array<{ id: string; name: string }>;
  activeProjectId: string;
  className?: string;
};

export function ProjectSelector({ projects, activeProjectId, className }: ProjectSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredProjects = useMemo(() => {
    if (!query) return projects;
    const normalized = query.toLowerCase();
    return projects.filter((project) => project.name.toLowerCase().includes(normalized));
  }, [projects, query]);

  const updateProject = useCallback((projectId: string) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set('projectId', projectId);
    startTransition(() => {
      router.push(`/dashboard/opportunities?${params.toString()}`);
    });
  }, [router, searchParams, startTransition]);

  const handleSelect = useCallback((projectId: string) => {
    setIsOpen(false);
    setQuery('');
    if (projectId !== activeProjectId) updateProject(projectId);
  }, [activeProjectId, updateProject]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dropdownWidth = 288; // match w-72

    const updatePosition = () => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;
      const rect = triggerEl.getBoundingClientRect();
      const width = Math.max(rect.width, dropdownWidth);
      setMenuStyle({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - width,
        width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId), [projects, activeProjectId]);

  return (
    <div ref={containerRef} className={`inline-block ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-gradient-to-r from-white/5 via-white/10 to-white/5 px-4 py-2.5 text-sm font-medium text-white/80 shadow-sm hover:border-white/25 hover:from-white/10 hover:via-white/15 hover:to-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400/70 transition-all"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="truncate max-w-[160px] text-left">
          {activeProject?.name ?? 'Projeni seç'}
        </span>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-leaf-400" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-white/50" />
        )}
      </button>

      {mounted && isOpen && menuStyle && createPortal(
        <div
          ref={dropdownRef}
          style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
          className="fixed z-[99999] overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-slate-950/98 via-slate-900/96 to-slate-900/98 shadow-[0_32px_96px_-40px_rgba(2,6,23,0.9)] ring-1 ring-white/15 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <Search className="h-4 w-4 text-white/40" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setIsOpen(false);
                  setQuery('');
                }
              }}
              placeholder="Projelerde ara..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filteredProjects.length === 0 ? (
              <li className="px-4 py-3 text-sm text-white/50">Eşleşen proje bulunamadı.</li>
            ) : (
              filteredProjects.map((project) => {
                const isActive = project.id === activeProjectId;
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(project.id)}
                      className={
                        `flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ` +
                        (isActive
                          ? 'bg-leaf-500/20 text-white border-l border-leaf-400/30'
                          : 'text-white/80 hover:bg-white/10 hover:text-white')
                      }
                    >
                      <span className="truncate">{project.name}</span>
                      {isActive && <Check className="h-4 w-4 text-leaf-300" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ProjectSelector;
