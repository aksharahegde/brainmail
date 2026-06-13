'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth/api';

type UserMenuProps = {
  email: string;
  name?: string | null;
};

export function UserMenu({ email, name }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logout();
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">{name ?? 'Signed in'}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <Button
        data-testid="auth-logout-submit"
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
