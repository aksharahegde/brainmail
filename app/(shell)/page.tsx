import { redirect } from 'next/navigation';

import { workspacePath } from '@/lib/navigation';

export default function HomePage() {
  redirect(workspacePath('startup'));
}
