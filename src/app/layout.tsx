import type { ReactNode } from 'react';
import { createClient } from '@/lib/server';
import { Header } from '@/components/Header';
import { SkipLink } from '@/components/SkipLink';
import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  // Bootstrap default organization for first-time users
  if (user) {
    try {
      const { data: orgs } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);
      if (!orgs || orgs.length === 0) {
        await supabase.rpc('create_organization', { p_name: 'Default Org', p_owner: user.id });
        revalidatePath('/dashboard');
      }
    } catch {}
  }

  return (
    <html lang="tr">
      <body className="min-h-screen bg-emerald-950 text-green-100">
        <SkipLink />
        <Header user={{ email: user?.email ?? undefined }} />
        <main id="main" className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}


