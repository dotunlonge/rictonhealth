'use client';

/**
 * Shared UI primitives — the governed replacement for ad hoc page-local
 * headers, cards, badges, empty/error/loading states, and form errors.
 *
 * All styling derives from `--ricton-*` CSS variables (see globals.css,
 * sourced from `@ricton/design-tokens`). New pages must compose these
 * instead of inventing local Tailwind combinations.
 */

import React from 'react';
import { toneForStatus } from '@ricton/design-tokens';

/* ---------------------------------- header --------------------------------- */

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-[var(--ricton-ink)]">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="text-xs font-semibold mt-1 text-[var(--ricton-ink-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/* ----------------------------------- card ---------------------------------- */

export function Card({
  children,
  className = '',
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`bg-[var(--ricton-surface)] rounded-3xl p-6 shadow-sm border border-[var(--ricton-border)] space-y-4 ${className}`}
    >
      {children}
    </section>
  );
}

/* ---------------------------------- badge ---------------------------------- */

export function StatusBadge({ status }: { status: string }) {
  const tone = toneForStatus(status);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {status}
    </span>
  );
}

/* ------------------------------- state blocks ------------------------------ */

function StateShell({
  icon,
  title,
  description,
  action,
  role = 'status',
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  role?: 'status' | 'alert';
}) {
  return (
    <div role={role} className="p-12 text-center space-y-3">
      <div className="flex justify-center text-[var(--ricton-ink-faint)]">{icon}</div>
      <p className="text-sm font-bold text-[var(--ricton-ink-muted)]">{title}</p>
      {description && (
        <p className="text-xs font-medium text-[var(--ricton-ink-faint)] max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="p-12 text-center space-y-3">
      <div
        aria-hidden
        className="w-8 h-8 border-4 rounded-full animate-spin mx-auto border-[var(--ricton-surface-sunken)] border-t-[var(--ricton-action)]"
      />
      <p className="text-xs font-bold text-[var(--ricton-ink-faint)]">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return <StateShell icon={icon} title={title} description={description} action={action} />;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this data. Check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <StateShell
      role="alert"
      icon={
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
          />
        </svg>
      }
      title={title}
      description={description}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[var(--ricton-action)] hover:bg-[var(--ricton-action-dark)] transition-colors"
          >
            {retryLabel}
          </button>
        ) : undefined
      }
    />
  );
}

/* -------------------------------- form error ------------------------------- */

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-semibold text-[var(--ricton-danger)]">
      {message}
    </p>
  );
}

/* --------------------------------- eyebrow --------------------------------- */

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--ricton-ink-faint)]">
      {children}
    </p>
  );
}
