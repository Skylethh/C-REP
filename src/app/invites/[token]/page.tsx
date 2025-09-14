import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export default async function AcceptInvite({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=login_required');
  const { error } = await supabase.rpc('accept_invite', { p_token: params.token, p_user: user.id });
  if (error) return <div>Davet kabul edilemedi: {error.message}</div>;
  redirect('/dashboard?info=invite_accepted');
}


