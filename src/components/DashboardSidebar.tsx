"use client";

import { 
  LayoutDashboard, 
  BarChart2, 
  FileText, 
  Settings, 
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Folder,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon, label, active, onClick }: NavItemProps) {
  return (
    <Link 
      href={href as any} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active 
          ? 'bg-white/10 text-white' 
          : 'text-white/70 hover:text-white hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      <span className="text-leaf-400">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

interface ProjectsNavProps {
  projects: Array<{ id: string; name: string }>;
}

function ProjectsNav({ projects }: ProjectsNavProps) {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <div className="mb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-white/80 hover:text-white"
      >
        <div className="flex items-center gap-2">
          <Folder size={18} className="text-leaf-400" />
          <span className="font-medium">Projeler</span>
        </div>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {expanded && (
        <div className="pl-4 mt-1 space-y-1 border-l border-white/10 ml-6">
          {projects.map(project => (
            <Link 
              key={project.id}
              href={`/projects/${project.id}`}
              className={`block py-2 px-3 rounded-md text-sm ${
                pathname?.includes(`/projects/${project.id}`) 
                  ? 'text-leaf-400 bg-leaf-400/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {project.name}
            </Link>
          ))}
          <Link 
            href="#"
            className="flex items-center gap-1 py-2 px-3 text-sm text-white/50 hover:text-white/70"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector<HTMLButtonElement>('button[data-dialog-trigger="create-project"]')?.click();
            }}
          >
            <span>+ Yeni Proje</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardSidebar({ 
  projects = [] 
}: { 
  projects?: Array<{ id: string; name: string }> 
}) {
  const pathname = usePathname();

  return (
    <aside className="w-full h-full bg-gradient-to-b from-emerald-950 to-ocean-950/90 border-r border-white/10 flex flex-col overflow-hidden">
      <div className="p-4 overflow-y-auto overflow-x-hidden flex-grow">
        <div className="mb-6">
          <h2 className="text-xl font-bold highlight-text mb-1">C-rep</h2>
          <p className="text-xs text-white/60">Karbon Emisyon Yönetimi</p>
        </div>

        <nav className="space-y-1">
          <NavItem 
            href="/dashboard" 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={pathname === '/dashboard'}
          />
          <NavItem 
            href={"/projects" as any}
            icon={<Folder size={18} />} 
            label="Tüm Projeler" 
            active={pathname === '/projects'}
          />
          <NavItem 
            href={"/entries" as any}
            icon={<Activity size={18} />} 
            label="Aktiviteler" 
            active={pathname === '/entries'}
          />
          <NavItem 
            href="/reports" 
            icon={<BarChart2 size={18} />} 
            label="Raporlar" 
            active={pathname === '/reports'}
          />
          <NavItem 
            href="/opportunities" 
            icon={<Lightbulb size={18} />} 
            label="Fırsatlar" 
            active={pathname === '/opportunities'}
          />
          
          <div className="h-px bg-white/10 my-4"></div>
          
          <ProjectsNav projects={projects} />
          
          <div className="h-px bg-white/10 my-4"></div>
          
          <NavItem 
            href="/profile" 
            icon={<Settings size={18} />} 
            label="Ayarlar" 
            active={pathname === '/profile'}
          />
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-white/10">
        <div className="glass rounded-lg p-3 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-leaf-400 shrink-0" />
            <span className="text-sm font-medium truncate">Karbon İpuçları</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed line-clamp-4 break-words">
            Enerji tüketimini azaltmak için ekipmanlarınızı düzenli olarak bakımdan geçirin ve enerji verimli alternatiflerle değiştirmeyi düşünün.
          </p>
        </div>
      </div>
    </aside>
  );
}
