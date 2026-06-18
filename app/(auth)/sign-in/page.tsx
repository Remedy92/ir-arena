'use client';

import { useState } from 'react';

import { authClient } from '@/lib/auth/client';
import { getPendingRun } from '@/lib/run-store';

const DEFAULT_CALLBACK_URL = '/';
const RUN_CALLBACK_URL = '/run';

function getCallbackURL(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_CALLBACK_URL;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedCallback = params.get('callbackURL');
  const hasStagedRun = getPendingRun() !== null;

  if (requestedCallback === RUN_CALLBACK_URL && hasStagedRun) {
    return RUN_CALLBACK_URL;
  }

  return DEFAULT_CALLBACK_URL;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="size-[18px] shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: getCallbackURL(),
      });
    } catch {
      setError('Could not start Google sign-in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-[16px] border border-[#EEEDEC] bg-white px-8 py-10 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-['Newsreader',Georgia,serif] text-2xl font-light tracking-tight text-[#2E2B29]">
          Sign in to run a comparison
        </h1>
        <p className="text-sm leading-relaxed text-[#67625B]">
          IR Arena is a research demo. Sign in to run blinded triage comparisons —
          model usage is capped per account.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[12px] border border-[#E3E1DE] bg-white px-5 text-sm font-medium text-[#2E2B29] transition-colors hover:bg-[#F7F5F2] disabled:opacity-60"
      >
        <GoogleGlyph />
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {error ? <p className="text-[13px] text-[#C0362C]">{error}</p> : null}
    </div>
  );
}
