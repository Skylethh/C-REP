import type { ReactNode } from 'react';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/DashboardSidebar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // Fetch user's projects for the sidebar
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, organization_id')
    .order('created_at', { ascending: false });
  
  return (
  <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="hidden md:block w-64 min-w-64 flex-shrink-0">
        <DashboardSidebar projects={projects || []} />
      </div>
      <div className="flex-1 overflow-x-hidden p-4 md:p-6">
        {children}
      </div>
    </div>
  );
}