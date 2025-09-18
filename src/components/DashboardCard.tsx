import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function DashboardCard({ title, icon, children, className = '', footer }: DashboardCardProps) {
  return (
    <div className={`dashboard-card overflow-hidden h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/3">
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-leaf-400">{icon}</div>}
          <h3 className="font-medium text-white tracking-tight">{title}</h3>
        </div>
      </div>
      <div className="p-6 flex-1">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-3 bg-white/3 backdrop-blur-md border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
}

export function DashboardCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  );
}
