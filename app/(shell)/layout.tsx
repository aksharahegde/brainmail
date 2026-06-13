import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { getCurrentUserServer } from '@/lib/auth/server';

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('brainmail_session')) {
    redirect('/login');
  }

  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login');
  }

  return <AppShell user={user}>{children}</AppShell>;
}
