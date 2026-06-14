'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { startGoogleLogin } from '@/lib/auth/api';

type GoogleSignInProps = {
  errorMessage?: string | null;
};

export function GoogleSignIn({ errorMessage }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage ?? null);

  async function handleSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const url = await startGoogleLogin();
      window.location.assign(url);
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : 'Unable to start Google login',
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Button
        data-testid="auth-google-sign-in"
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full bg-foreground text-background hover:bg-foreground/90"
      >
        {isLoading ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      {error ? (
        <p
          data-testid="auth-login-error"
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
