import { GoogleSignIn } from '@/components/auth/google-sign-in';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            BrainMail
          </p>
          <h1
            data-testid="auth-login-title"
            className="text-3xl font-semibold tracking-tight"
          >
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground">
            Use Google to create your account or sign back in.
          </p>
        </div>
        <div className="flex justify-center">
          <GoogleSignIn errorMessage={params.error ?? null} />
        </div>
      </div>
    </main>
  );
}
