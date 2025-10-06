import type { Route } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function OpportunitiesIndex() {
  const target = '/dashboard/opportunities' as Route;
  redirect(target);
}


