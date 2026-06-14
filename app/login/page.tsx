import { GoogleSignIn } from '@/components/auth/google-sign-in';
import { BriefingPage } from '@/components/layout/briefing-page';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background px-6 py-20">
      <BriefingPage narrow className="space-y-10 py-0">
        <div className="space-y-4 text-center">
          <p className="briefing-eyebrow">BrainMail</p>
          <h1
            data-testid="auth-login-title"
            className="text-h1 text-balance"
          >
            Your chief of staff is ready
          </h1>
          <p className="text-body-sm text-muted-foreground text-balance">
            Sign in to review what matters, understand why it matters, and decide
            what to do next.
          </p>
        </div>
        <div className="briefing-card flex justify-center">
          <GoogleSignIn errorMessage={params.error ?? null} />
        </div>
      </BriefingPage>
    </main>
  );
}
