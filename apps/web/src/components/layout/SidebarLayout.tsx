'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Pill,
  Wallet,
  Award,
  Video,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  ShoppingBag,
  Building2,
  ShieldAlert,
  Activity,
  Inbox,
  Package,
  BarChart3,
  Stethoscope,
  Menu,
  X,
  FileText,
  ArrowRightLeft,
  LifeBuoy,
} from 'lucide-react';
import { useAppStore, UserRole } from '@/store/useAppStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
}

const roleNavigationMap: Record<UserRole, NavItem[]> = {
  PATIENT: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
    {
      label: 'Find Doctors',
      href: '/providers',
      icon: Stethoscope,
      keywords: 'doctor consultant search directory',
    },
    {
      label: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      keywords: 'booking schedule visits slots',
    },
    {
      label: 'My Prescriptions',
      href: '/prescriptions',
      icon: Pill,
      keywords: 'medication rx e-prescription',
    },
    {
      label: 'My Referrals',
      href: '/referrals',
      icon: ArrowRightLeft,
      keywords: 'referral specialist transfer',
    },
    {
      label: 'Pharmacy Store',
      href: '/pharmacy',
      icon: ShoppingBag,
      keywords: 'drugs medicines order store',
    },
    {
      label: 'Telemedicine',
      href: '/telemedicine',
      icon: Video,
      keywords: 'video call room consultation',
    },
    { label: 'My Wallet', href: '/wallet', icon: Wallet, keywords: 'balance payment money top-up' },
    {
      label: 'Premium Plan',
      href: '/subscription',
      icon: Award,
      keywords: 'subscription premium plan billing upgrade',
    },
    {
      label: 'Rewards & Points',
      href: '/rewards',
      icon: Award,
      keywords: 'points loyalty incentives',
    },
    { label: 'Messages', href: '/inbox', icon: Inbox, keywords: 'inbox chat conversation' },
    {
      label: 'Support',
      href: '/support',
      icon: LifeBuoy,
      keywords: 'support help ticket complaint',
    },
    {
      label: 'Account Settings',
      href: '/settings',
      icon: Settings,
      keywords: 'profile account preferences',
    },
  ],
  CONSULTANT: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      keywords: 'home overview queue',
    },
    {
      label: 'My Patients',
      href: '/patients',
      icon: Users,
      keywords: 'patients directory records',
    },
    {
      label: 'My Schedule',
      href: '/appointments',
      icon: Calendar,
      keywords: 'schedule clinic queue availability',
    },
    {
      label: 'Referrals',
      href: '/referrals',
      icon: ArrowRightLeft,
      keywords: 'referral handoff specialist transfer',
    },
    {
      label: 'Availability',
      href: '/dashboard/availability',
      icon: Calendar,
      keywords: 'schedule slots availability hours',
    },
    {
      label: 'Issue Prescriptions',
      href: '/prescriptions',
      icon: Pill,
      keywords: 'prescribe rx sign',
    },
    { label: 'Telemedicine', href: '/telemedicine', icon: Video, keywords: 'video call room' },
    {
      label: 'Earnings & Wallet',
      href: '/wallet',
      icon: Wallet,
      keywords: 'earnings payout money',
    },
    { label: 'Rewards', href: '/rewards', icon: Award, keywords: 'points incentives' },
    { label: 'Messages', href: '/inbox', icon: Inbox, keywords: 'inbox chat' },
    {
      label: 'Support',
      href: '/support',
      icon: LifeBuoy,
      keywords: 'support help ticket complaint',
    },
    {
      label: 'Provider Settings',
      href: '/settings',
      icon: Settings,
      keywords: 'profile preferences',
    },
  ],
  PHARMACIST: [
    {
      label: 'Pharmacy Portal',
      href: '/dashboard/pharmacy',
      icon: LayoutDashboard,
      keywords: 'home overview orders',
    },
    {
      label: 'Products & Inventory',
      href: '/pharmacy/products',
      icon: Package,
      keywords: 'products stock inventory catalog',
    },
    {
      label: 'Prescription Orders',
      href: '/prescriptions',
      icon: Pill,
      keywords: 'orders dispense rx',
    },
    { label: 'Store Earnings', href: '/wallet', icon: Wallet, keywords: 'earnings money payout' },
    { label: 'Messages', href: '/inbox', icon: Inbox, keywords: 'inbox chat' },
    {
      label: 'Support',
      href: '/support',
      icon: LifeBuoy,
      keywords: 'support help ticket complaint',
    },
    {
      label: 'Pharmacy Settings',
      href: '/settings',
      icon: Settings,
      keywords: 'profile preferences',
    },
  ],
  HOSPITAL_ADMIN: [
    {
      label: 'Hospital Overview',
      href: '/dashboard/hospital',
      icon: Building2,
      keywords: 'home overview facility',
    },
    {
      label: 'Medical Staff',
      href: '/providers',
      icon: Users,
      keywords: 'doctors staff directory',
    },
    {
      label: 'Hospital Appointments',
      href: '/appointments',
      icon: Calendar,
      keywords: 'booking schedule',
    },
    {
      label: 'Pharmacy Department',
      href: '/pharmacy',
      icon: ShoppingBag,
      keywords: 'pharmacy drugs',
    },
    { label: 'Hospital Revenue', href: '/wallet', icon: Wallet, keywords: 'revenue money billing' },
    { label: 'Messages', href: '/inbox', icon: Inbox, keywords: 'inbox chat' },
    {
      label: 'Support',
      href: '/support',
      icon: LifeBuoy,
      keywords: 'support help ticket complaint',
    },
    {
      label: 'Hospital Settings',
      href: '/settings',
      icon: Settings,
      keywords: 'preferences facility',
    },
  ],
  SUPER_ADMIN: [
    { label: 'Admin Center', href: '/admin', icon: ShieldAlert, keywords: 'home overview' },
    {
      label: 'Platform Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      keywords: 'analytics metrics revenue',
    },
    {
      label: 'Provider Approvals',
      href: '/admin/providers',
      icon: Users,
      keywords: 'verify approve doctors',
    },
    {
      label: 'Hospital Applications',
      href: '/admin/hospital-applications',
      icon: Building2,
      keywords: 'hospital applications facility review',
    },
    {
      label: 'Product Review',
      href: '/admin/pharmacy-products',
      icon: Package,
      keywords: 'pharmacy product compliance',
    },
    {
      label: 'Security Operations',
      href: '/admin/security',
      icon: ShieldAlert,
      keywords: 'security threats alerts',
    },
    { label: 'Audit Log', href: '/admin/audit', icon: FileText, keywords: 'audit governance' },
    {
      label: 'Support Triage',
      href: '/admin/support',
      icon: Inbox,
      keywords: 'support tickets triage',
    },
    { label: 'User Directory', href: '/patients', icon: Users, keywords: 'users directory' },
    { label: 'System Settings', href: '/settings', icon: Settings, keywords: 'preferences' },
  ],
};

function resolveUserDisplay(user: any) {
  const targetUser = user;
  if (!targetUser) {
    // Never masquerade as a real account: this is the signed-out / loading
    // state. Sidebar + dashboard fall back to "User"/"Account" when this
    // leaks into an authenticated view — that phantom is fixed by redirecting
    // (see below), not by a nicer placeholder.
    return {
      name: 'Not signed in',
      role: 'PATIENT' as UserRole,
      roleLabel: 'Guest',
      avatarUrl: undefined,
    };
  }
  const role: UserRole = targetUser.role || 'PATIENT';
  const roleLabels: Record<UserRole, string> = {
    PATIENT: 'Patient',
    CONSULTANT: 'Doctor Specialist',
    PHARMACIST: 'Licensed Pharmacist',
    HOSPITAL_ADMIN: 'Hospital Admin',
    SUPER_ADMIN: 'System Admin',
  };

  const profile = targetUser.patientProfile || targetUser.providerProfile || {};
  const first = targetUser.firstName || profile.firstName || targetUser.name?.split(' ')[0] || '';
  const last =
    targetUser.lastName || profile.lastName || targetUser.name?.split(' ').slice(1).join(' ') || '';
  let name = [first, last].filter(Boolean).join(' ');

  if (!name && targetUser.email) {
    const raw = targetUser.email.split('@')[0];
    name = raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (!name) name = 'User Account';

  const avatarUrl = targetUser.avatarUrl || profile.avatarUrl;

  return { name, role, roleLabel: roleLabels[role] || 'Member', avatarUrl };
}

import { useCurrentUser, useNotificationsState, useAuthActions } from '@/store/useAppStore';

interface SidebarLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function SidebarLayout({ children, allowedRoles }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const { fetchUser, logout } = useAuthActions();
  const { notifications, fetchNotifications } = useNotificationsState();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);

  // Instant zero-blink render: if user is already present in memory or
  // localStorage, render immediately without blocking behind a full-screen spinner.
  const [sessionChecked, setSessionChecked] = useState(() => !!useAppStore.getState().user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If a stale `ricton_session` cookie survived without a refresh token
      // (old tab-scoped session), drop it now so a failed restore lands on a
      // real login form instead of bouncing back here as a nameless account.
      const { clearStalePresenceCookies } = await import('@/lib/api-client');
      clearStalePresenceCookies();
      const restored = await fetchUser();
      if (!cancelled) {
        if (!restored) {
          const { clearStalePresenceCookies: clearAgain } = await import('@/lib/api-client');
          clearAgain();
        }
        setSessionChecked(true);
      }
    })();
    fetchNotifications();
    return () => {
      cancelled = true;
    };
  }, [fetchUser, fetchNotifications]);

  const display = useMemo(() => resolveUserDisplay(user), [user]);

  // Route Protection & Role Guard (client mirror of middleware.ts)
  useEffect(() => {
    if (!sessionChecked) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const currentRole: UserRole = user.role || 'PATIENT';

    if (allowedRoles && !allowedRoles.includes(currentRole)) {
      if (currentRole === 'HOSPITAL_ADMIN') router.replace('/dashboard/hospital');
      else if (currentRole === 'PHARMACIST') router.replace('/dashboard/pharmacy');
      else if (currentRole === 'SUPER_ADMIN') router.replace('/admin');
      else router.replace('/dashboard');
    }
  }, [sessionChecked, user, allowedRoles, router]);

  const navItems = roleNavigationMap[display.role] || roleNavigationMap.PATIENT;

  // Close the mobile drawer when a destination is chosen (called from link clicks).
  const closeMobileNav = () => setMobileNavOpen(false);

  // Escape closes drawer / search results; focus returns to a stable control.
  useEffect(() => {
    if (!mobileNavOpen) return;
    mobileCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  // Dismiss search results on outside click.
  useEffect(() => {
    if (!searchOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return navItems.filter((item) =>
      `${item.label} ${item.href} ${item.keywords ?? ''}`.toLowerCase().includes(q)
    );
  }, [searchQuery, navItems]);

  const goToResult = (href: string) => {
    setSearchOpen(false);
    setActiveIndex(-1);
    setSearchQuery('');
    router.push(href);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && searchResults.length > 0) {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIndex((i) => (i + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp' && searchResults.length > 0) {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIndex((i) => (i - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      if (searchOpen && activeIndex >= 0 && searchResults[activeIndex]) {
        e.preventDefault();
        goToResult(searchResults[activeIndex].href);
      } else if (searchResults.length > 0) {
        e.preventDefault();
        goToResult(searchResults[0].href);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!sessionChecked && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ricton-surface-muted)]">
        <div className="text-center space-y-3" role="status" aria-live="polite">
          <div className="w-8 h-8 border-4 border-[var(--ricton-action)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[var(--ricton-ink-muted)]">Verifying session…</p>
        </div>
      </div>
    );
  }

  // Authenticated chrome must never render for a signed-out visitor. Without
  // this guard the layout briefly painted a phantom dashboard ("Not signed
  // in" / fallback stats) before the redirect to /login fired.
  if (sessionChecked && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ricton-surface-muted)]">
        <div className="text-center space-y-3" role="status" aria-live="polite">
          <div className="w-8 h-8 border-4 border-[var(--ricton-action)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[var(--ricton-ink-muted)]">
            Session expired — redirecting to sign in…
          </p>
        </div>
      </div>
    );
  }

  const unread = notifications.some((n) => !n.isRead);

  const navList = (idPrefix: string) => (
    <nav aria-label="Primary" className="px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={`${idPrefix}-${item.href}`}
            href={item.href}
            onClick={closeMobileNav}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-[var(--ricton-action)] text-white font-semibold shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <IconComponent
              aria-hidden
              className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[var(--ricton-surface-muted)] font-sans antialiased text-[var(--ricton-ink)]">
      <a
        href="#ricton-main"
        className="sr-only focus:px-4 focus:py-2 focus:bg-[var(--ricton-surface)] focus:text-[var(--ricton-ink)]"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        aria-label="Account and primary navigation"
        className="hidden lg:flex w-64 bg-[var(--ricton-navy)] text-white flex-col justify-between shrink-0 shadow-xl sticky top-0 h-screen z-20 border-r border-slate-800"
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--ricton-action)] to-cyan-400 flex items-center justify-center text-white shadow-md">
              <Activity aria-hidden className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">RICTON</span>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Health Platform
              </p>
            </div>
          </div>

          {/* User Display Header */}
          <div className="px-6 py-4 flex items-center gap-3.5 border-b border-white/10 bg-white/5">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--ricton-action)] overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 shadow-inner">
              {display.avatarUrl ? (
                <img
                  src={display.avatarUrl}
                  alt={display.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User aria-hidden className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                title={display.name}
                className="font-bold text-sm text-white truncate leading-snug"
              >
                {display.name}
              </h2>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--ricton-action)]/30 text-blue-300 uppercase tracking-wider mt-0.5">
                {display.roleLabel}
              </span>
            </div>
          </div>

          {navList('desktop')}
        </div>

        {/* Sign Out Action */}
        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 transition-all text-left group"
          >
            <LogOut
              aria-hidden
              className="w-4 h-4 text-slate-400 group-hover:text-rose-300 transition-colors"
            />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Primary navigation"
        >
          <div
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--ricton-navy)] text-white flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              <div className="p-5 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--ricton-action)] to-cyan-400 flex items-center justify-center text-white">
                    <Activity aria-hidden className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-lg tracking-tight">RICTON</span>
                </div>
                <button
                  ref={mobileCloseRef}
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <X aria-hidden className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 py-3 border-b border-white/10">
                <p className="text-sm font-bold text-white truncate">{display.name}</p>
                <p className="text-xs text-slate-400">{display.roleLabel}</p>
              </div>
              {navList('mobile')}
            </div>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 text-left"
              >
                <LogOut aria-hidden className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="min-h-[var(--ricton-header-height)] bg-white border-b border-[var(--ricton-border)] px-4 sm:px-8 py-3 flex items-center justify-between gap-3 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <Menu aria-hidden className="w-5 h-5" />
            </button>
            <div ref={searchRef} className="relative w-full max-w-96">
              <Search
                aria-hidden
                className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4 pointer-events-none"
              />
              <input
                type="search"
                role="combobox"
                aria-expanded={searchOpen && searchResults.length > 0}
                aria-controls="ricton-global-search-results"
                aria-activedescendant={
                  activeIndex >= 0 ? `ricton-search-option-${activeIndex}` : undefined
                }
                aria-label="Search pages and destinations"
                placeholder="Search pages, appointments, doctors..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                  setActiveIndex(-1);
                }}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                onKeyDown={onSearchKeyDown}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
              />
              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg border border-[var(--ricton-border)] overflow-hidden z-30">
                  {searchResults.length === 0 ? (
                    <p role="status" className="px-4 py-3 text-xs text-slate-500">
                      No destinations match “{searchQuery.trim()}”.
                    </p>
                  ) : (
                    <ul
                      role="listbox"
                      id="ricton-global-search-results"
                      aria-label="Matching pages"
                    >
                      {searchResults.map((item, i) => {
                        const IconComponent = item.icon;
                        return (
                          <li
                            key={item.href}
                            id={`ricton-search-option-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => goToResult(item.href)}
                              onMouseEnter={() => setActiveIndex(i)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                                i === activeIndex
                                  ? 'bg-[var(--ricton-action-soft)] text-[var(--ricton-ink)]'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <IconComponent
                                aria-hidden
                                className="w-4 h-4 text-[var(--ricton-action)]"
                              />
                              <span>{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/notifications')}
              aria-label={unread ? 'Notifications, has unread items' : 'Notifications'}
              className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors"
            >
              <Bell aria-hidden className="w-5 h-5 text-slate-700" />
              {unread && (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"
                />
              )}
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600">
                {display.avatarUrl ? (
                  <img
                    src={display.avatarUrl}
                    alt={display.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User aria-hidden className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                  {display.name}
                </p>
                <p className="text-xs font-medium text-slate-500">{display.roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main id="ricton-main" tabIndex={-1} className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
