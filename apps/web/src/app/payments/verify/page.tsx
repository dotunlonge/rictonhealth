'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type VerifyState = 'verifying' | 'success' | 'pending' | 'failed' | 'error';

interface VerifyData {
  status?: string;
  amount?: number;
  currency?: string;
  type?: string;
  providerReference?: string;
  reference?: string;
  paidAt?: string;
  createdAt?: string;
  appointmentId?: string;
}

function formatNGN(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency ?? 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Number(amount).toLocaleString()} ${currency ?? 'NGN'}`;
  }
}

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [state, setState] = useState<VerifyState>('verifying');
  const [detail, setDetail] = useState<VerifyData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkPayment = useCallback(
    async (attempt: number) => {
      if (!reference) {
        setState('error');
        setMessage(
          'No payment reference was returned. If you were charged, use the reference from your receipt to check again.'
        );
        return;
      }
      setAttempts(attempt);
      if (attempt === 1) {
        setState('verifying');
        setMessage(null);
      }
      const res = await api.get<VerifyData>(`/payments/verify/${encodeURIComponent(reference)}`);
      if (res.success && res.data) {
        const status = res.data.status;
        setDetail(res.data);
        if (status === 'SUCCESS' || status === 'COMPLETED') {
          setState('success');
        } else if (status === 'FAILED') {
          setState('failed');
          setMessage(
            'Paystack reported this payment as failed. No money was taken for this reference.'
          );
        } else if (attempt < MAX_ATTEMPTS) {
          // Still pending at Paystack (or webhook in flight): this lookup
          // force-reconciles on every attempt, so keep polling briefly.
          setState('verifying');
          timer.current = setTimeout(() => void checkPayment(attempt + 1), POLL_INTERVAL_MS);
        } else {
          setState('pending');
          setMessage(
            'Paystack has not confirmed this payment yet. Webhooks reconcile in the background — check again in a moment.'
          );
        }
      } else {
        const errMsg = res.error?.message || 'Could not confirm this payment.';
        if (/not found/i.test(errMsg)) {
          setState('error');
          setMessage(
            'No payment with this reference exists here. If you paid, confirm you returned from the correct checkout.'
          );
        } else if (attempt < MAX_ATTEMPTS) {
          setState('verifying');
          timer.current = setTimeout(() => void checkPayment(attempt + 1), POLL_INTERVAL_MS);
        } else {
          setState('pending');
          setMessage(
            `${errMsg} You can check again — each attempt looks the payment up live at Paystack.`
          );
        }
      }
    },
    [reference]
  );

  useEffect(() => {
    void checkPayment(1);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [checkPayment]);

  const heading =
    state === 'success'
      ? 'Payment Confirmed'
      : state === 'failed'
        ? 'Payment Failed'
        : state === 'pending'
          ? 'Still Pending'
          : state === 'error'
            ? 'Cannot Verify Payment'
            : 'Confirming Payment…';

  const subheading =
    state === 'success'
      ? 'Your payment was confirmed with Paystack and recorded.'
      : state === 'verifying'
        ? `Looking the payment up at Paystack${attempts > 1 ? ` (attempt ${attempts} of ${MAX_ATTEMPTS})` : ''}…`
        : (message ?? '');

  return (
    <main className="bg-slate-50 min-h-screen w-full flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="bg-white p-8 sm:p-12 rounded-[32px] shadow-sm border border-slate-100 text-center max-w-md w-full space-y-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
            state === 'success'
              ? 'bg-emerald-50 text-emerald-600'
              : state === 'failed' || state === 'error'
                ? 'bg-red-50 text-red-600'
                : 'bg-sky-50 text-sky-600'
          }`}
          aria-hidden
        >
          {state === 'verifying' ? (
            <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
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
          ) : state === 'success' ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
            </svg>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight">{heading}</h1>
        {subheading ? <p className="text-sm font-medium text-slate-500">{subheading}</p> : null}
        {state === 'verifying' ? (
          <p className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
            Do not close — reconciling with Paystack. Amounts are in NGN (Paystack uses kobo
            internally: ₦1 = 100 kobo).
          </p>
        ) : null}

        {reference ? (
          <p className="text-xs font-mono text-slate-400 break-all">Reference: {reference}</p>
        ) : null}
        {state === 'success' && detail?.amount !== undefined ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm space-y-1">
            <p className="font-bold text-slate-900">Receipt</p>
            <p className="text-slate-600">
              Reference: <span className="font-mono">{detail.reference ?? reference}</span>
            </p>
            <p className="text-slate-600">
              Amount: <span className="font-bold text-slate-900">{formatNGN(Number(detail.amount), detail.currency)}</span>
              {detail.type ? ` · ${detail.type.replace(/_/g, ' ')}` : ''}
            </p>
            <p className="text-slate-600">
              Date: {detail.paidAt ?? detail.createdAt ? new Date(detail.paidAt ?? detail.createdAt ?? '').toLocaleString('en-NG') : new Date().toLocaleString('en-NG')}
            </p>
            {detail.appointmentId ? (
              <Link href="/appointments" className="text-sky-600 font-semibold hover:underline">
                View appointment
              </Link>
            ) : null}
            <div>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Print receipt
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pt-2">
          {state === 'verifying' ? (
            <button
              type="button"
              onClick={() => {
                if (timer.current) clearTimeout(timer.current);
                setState('pending');
                setMessage(
                  'Verification cancelled. If you were charged, use Check Again with your reference to reconcile.'
                );
              }}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-sm transition-colors"
            >
              Cancel verification (Back)
            </button>
          ) : null}
          {state === 'pending' || state === 'failed' ? (
            <button
              type="button"
              onClick={() => void checkPayment(1)}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Check Again
            </button>
          ) : null}
          <Link
            href="/dashboard"
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-sm transition-colors text-center"
          >
            Go to Dashboard
          </Link>
          <div className="flex gap-3">
            <Link
              href="/wallet"
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-sm transition-colors text-center"
            >
              Wallet
            </Link>
            <Link
              href="/appointments"
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-sm transition-colors text-center"
            >
              Appointments
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-slate-50 min-h-screen w-full flex items-center justify-center text-slate-500">
          Loading confirmation…
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
