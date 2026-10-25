'use client';

/**
 * Shared auth kit — login/register/OTP screens composed from these
 * primitives to match the 2026 auth mockups: oversized-radius white card,
 * pill inputs, periwinkle primary action, segmented role pills, lined
 * divider, and identical tall Google/Apple buttons.
 */

import React, { useState } from 'react';

/* ---------------------------------- card ----------------------------------- */

export function AuthCard({
  children,
  labelledBy,
}: {
  children: React.ReactNode;
  labelledBy: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="mx-auto w-full max-w-[925px] rounded-[40px] border border-slate-100 bg-white p-8 shadow-[0px_8px_40px_rgba(10,25,47,0.08)] sm:p-12 md:rounded-[48px]"
    >
      <div className="space-y-7 sm:space-y-8">{children}</div>
    </section>
  );
}

export function AuthHeading({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      <h1 id={id} className="text-[28px] font-extrabold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle && <p className="text-[15px] font-normal text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600"
    >
      {message}
    </div>
  );
}

/* ---------------------------------- field ---------------------------------- */

export function AuthField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  inputMode,
  secure = false,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'email' | 'tel' | 'text';
  /** Renders a visibility toggle (password fields). */
  secure?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={secure ? (visible ? 'text' : 'password') : type}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="h-16 w-full rounded-[20px] border border-slate-200 bg-white px-6 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
      />
      {secure && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
          className="absolute top-1/2 right-5 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:text-slate-600"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {visible ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}

/* ------------------------------- primary CTA ------------------------------- */

export function AuthPrimaryButton({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`h-16 w-full rounded-[20px] text-lg font-bold transition-all active:scale-[0.99] ${
        disabled
          ? 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none'
          : 'cursor-pointer bg-[#1877F2] hover:bg-[#1565C0] text-white shadow-lg shadow-blue-500/30'
      }`}
    >
      {children}
    </button>
  );
}

/* --------------------------------- divider --------------------------------- */

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-5" role="separator" aria-label={label}>
      <span aria-hidden className="h-px flex-1 bg-slate-200" />
      <span className="text-[15px] font-medium whitespace-nowrap text-slate-400">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

/* ------------------------------- role pills -------------------------------- */

export type RoleOption = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

export function RolePills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: RoleOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(item.key)}
              className={`flex h-14 items-center justify-center gap-2 rounded-[18px] border text-[15px] font-bold transition-all active:scale-[0.99] ${
                active
                  ? 'border-[#3b82f6] bg-[#3b82f6] text-white shadow-lg shadow-blue-500/30'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#3b82f6]/50'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ social button ------------------------------ */

export function GoogleGIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.64-2.37l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}

export function AppleIcon({ className = 'h-5 w-5 fill-current' }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.16-.55 2.82-1.36z" />
    </svg>
  );
}

/**
 * Tall social button geometry shared by Google + Apple: h-14, rounded-lg,
 * light border, left icon, centered label — per the auth mockups.
 *
 * Google's GIS iframe renders its own fixed-size button, so
 * GoogleSignInButton reuses this exact class for its visual layer with the
 * real (transparent) GIS button overlaid on top — the pair stays identical
 * by construction.
 */
export const SOCIAL_BUTTON_CLASS =
  'relative flex h-14 w-full min-w-0 items-center rounded-lg border border-slate-200 bg-white text-[15px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';

export function SocialButton({
  onClick,
  disabled = false,
  label,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={SOCIAL_BUTTON_CLASS}>
      <span className="absolute left-4">{icon}</span>
      <span className="w-full text-center">{label}</span>
    </button>
  );
}

/* --------------------------------- footer ---------------------------------- */

export function AuthFooter({
  text,
  linkLabel,
  href,
}: {
  text: string;
  linkLabel: string;
  href: string;
}) {
  // Plain anchor keeps this kit dependency-free (kit is client-rendered).
  return (
    <p className="pt-1 text-center text-[15px] text-slate-500">
      {text}{' '}
      <a href={href} className="font-bold text-[#2f6fd6] hover:underline">
        {linkLabel}
      </a>
    </p>
  );
}
