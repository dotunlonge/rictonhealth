'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force-reconcile with Paystack (live lookup): webhooks may lag or never
  // reach local dev, so poll the verify endpoint while the payment is pending.
  const checkPayment = async (attempt: number): Promise<void> => {
    if (!reference) {
      setVerifying(false);
      setVerified(true);
      return;
    }

    try {
      const res = await api.get<{ status: string }>(
        `/payments/verify/${encodeURIComponent(reference)}`
      );
      if (res.success && (res.data?.status === 'SUCCESS' || res.data?.status === 'COMPLETED')) {
        setVerified(true);
        setPending(false);
        setVerifying(false);
        return;
      }
      if (res.success && res.data?.status === 'FAILED') {
        setVerifying(false);
        setError('Paystack reported this payment as failed. No subscription was activated.');
        return;
      }
      // Still pending — poll a few times before asking the user to re-check.
      if (attempt < 8) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return checkPayment(attempt + 1);
      }
      const subRes = await api.get<{ plan: string; status: string }>('/subscriptions/my');
      if (subRes.success && subRes.data?.status === 'ACTIVE') {
        setVerified(true);
      } else {
        setPending(true);
      }
      setVerifying(false);
    } catch {
      if (attempt < 8) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return checkPayment(attempt + 1);
      }
      setPending(true);
      setVerifying(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void checkPayment(1).catch(() => {
      if (!cancelled) {
        setPending(true);
        setVerifying(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          {verifying ? (
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {verifying
            ? 'Confirming Payment…'
            : verified
              ? 'Subscription Activated!'
              : pending
                ? 'Payment Still Pending'
                : 'Payment Not Confirmed'}
        </h1>
        <p className="text-slate-300 text-sm mb-6">
          {verifying
            ? 'Looking your payment up at Paystack — this usually takes a few seconds.'
            : verified
              ? 'Thank you for subscribing to Ricton Health. Your subscription has been processed successfully and your account has been upgraded with full access.'
              : pending
                ? 'Paystack has not confirmed this payment yet. Webhooks reconcile in the background — check again in a moment.'
                : (error ?? 'We could not confirm this payment.')}
        </p>

        {reference && (
          <div className="bg-slate-900/60 rounded-lg p-3 text-xs text-slate-400 mb-6 font-mono break-all">
            Reference: {reference}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {pending && !verifying ? (
            <button
              type="button"
              onClick={() => {
                setVerifying(true);
                setPending(false);
                setError(null);
                void checkPayment(1);
              }}
              className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors"
            >
              Check Again
            </button>
          ) : null}
          <Link
            href="/dashboard"
            className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/subscription"
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition-colors text-center"
          >
            Manage Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
          Loading confirmation…
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
