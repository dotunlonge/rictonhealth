'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useAppStore, UserRole } from '@/store/useAppStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleNavigationMap: Record<UserRole, NavItem[]> = {
  PATIENT: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Find Doctors', href: '/providers', icon: Stethoscope },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'My Prescriptions', href: '/prescriptions', icon: Pill },
    { label: 'Pharmacy Store', href: '/pharmacy', icon: ShoppingBag },
    { label: 'Telemedicine', href: '/telemedicine', icon: Video },
    { label: 'My Wallet', href: '/wallet', icon: Wallet },
    { label: 'Rewards & Points', href: '/rewards', icon: Award },
    { label: 'Messages', href: '/inbox', icon: Inbox },
    { label: 'Account Settings', href: '/settings', icon: Settings },
  ],
  CONSULTANT: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Patients', href: '/patients', icon: Users },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'Issue Prescriptions', href: '/prescriptions', icon: Pill },
    { label: 'Telemedicine', href: '/telemedicine', icon: Video },
    { label: 'Earnings & Wallet', href: '/wallet', icon: Wallet },
    { label: 'Rewards', href: '/rewards', icon: Award },
    { label: 'Messages', href: '/inbox', icon: Inbox },
    { label: 'Provider Settings', href: '/settings', icon: Settings },
  ],
  PHARMACIST: [
    { label: 'Pharmacy Portal', href: '/dashboard/pharmacy', icon: LayoutDashboard },
    { label: 'Products & Inventory', href: '/pharmacy/products', icon: Package },
    { label: 'Prescription Orders', href: '/prescriptions', icon: Pill },
    { label: 'Store Earnings', href: '/wallet', icon: Wallet },
    { label: 'Messages', href: '/inbox', icon: Inbox },
    { label: 'Pharmacy Settings', href: '/settings', icon: Settings },
  ],
  HOSPITAL_ADMIN: [
    { label: 'Hospital Overview', href: '/dashboard/hospital', icon: Building2 },
    { label: 'Medical Staff', href: '/providers', icon: Users },
    { label: 'Hospital Appointments', href: '/appointments', icon: Calendar },
    { label: 'Pharmacy Department', href: '/pharmacy', icon: ShoppingBag },
    { label: 'Hospital Revenue', href: '/wallet', icon: Wallet },
    { label: 'Messages', href: '/inbox', icon: Inbox },
    { label: 'Hospital Settings', href: '/settings', icon: Settings },
  ],
  SUPER_ADMIN: [
    { label: 'Admin Center', href: '/admin', icon: ShieldAlert },
    { label: 'Platform Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Provider Approvals', href: '/admin/providers', icon: Users },
    { label: 'User Directory', href: '/patients', icon: Users },
    { label: 'System Settings', href: '/settings', icon: Settings },
  ],
  ADMIN: [
    { label: 'Admin Center', href: '/admin', icon: ShieldAlert },
    { label: 'Platform Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Provider Approvals', href: '/admin/providers', icon: Users },
    { label: 'User Directory', href: '/patients', icon: Users },
    { label: 'System Settings', href: '/settings', icon: Settings },
  ],
};

function resolveUserDisplay(user: any) {
  if (!user) return { name: 'Account', role: 'PATIENT' as UserRole, roleLabel: 'Patient', avatarUrl: undefined };
  const role: UserRole = user.role || 'PATIENT';
  const roleLabels: Record<UserRole, string> = {
    PATIENT: 'Patient',
    CONSULTANT: 'Doctor Specialist',
    PHARMACIST: 'Licensed Pharmacist',
    HOSPITAL_ADMIN: 'Hospital Admin',
    SUPER_ADMIN: 'System Admin',
    ADMIN: 'System Admin',
  };

  const profile = user.patientProfile || user.providerProfile || {};
  const first = user.firstName || profile.firstName || user.name?.split(' ')[0] || '';
  const last = user.lastName || profile.lastName || user.name?.split(' ').slice(1).join(' ') || '';
  let name = [first, last].filter(Boolean).join(' ');

  if (!name && user.email) {
    const raw = user.email.split('@')[0];
    name = raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (!name) name = 'User Account';

  const avatarUrl = user.avatarUrl || profile.avatarUrl;

  return { name, role, roleLabel: roleLabels[role] || 'Member', avatarUrl };
}

interface SidebarLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function SidebarLayout({ children, allowedRoles }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, fetchUser, notifications, fetchNotifications, logout } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUser();
    fetchNotifications();
  }, [fetchUser, fetchNotifications]);

  const display = useMemo(() => resolveUserDisplay(user), [user]);

  // Route Protection & Role Guard
  useEffect(() => {
    if (!user) return;
    const currentRole: UserRole = user.role || 'PATIENT';

    if (allowedRoles && !allowedRoles.includes(currentRole)) {
      if (currentRole === 'HOSPITAL_ADMIN') router.replace('/dashboard/hospital');
      else if (currentRole === 'PHARMACIST') router.replace('/dashboard/pharmacy');
      else if (currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN') router.replace('/admin');
      else router.replace('/dashboard');
    }
  }, [user, allowedRoles, router]);

  const navItems = roleNavigationMap[display.role] || roleNavigationMap.PATIENT;
  const avatarUrl = user?.avatarUrl || user?.patientProfile?.avatarUrl || user?.providerProfile?.avatarUrl;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#F4F7FC] font-sans antialiased text-slate-800">
      {/* Role-Specific Sidebar */}
      <aside className="w-64 bg-[#0A192F] text-white flex flex-col justify-between shrink-0 shadow-xl sticky top-0 h-screen z-20 border-r border-slate-800">
        <div>
          {/* Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1877F2] to-cyan-400 flex items-center justify-center text-white shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">RICTON</span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Health Platform
              </p>
            </div>
          </div>

          {/* User Display Header */}
          <div className="px-6 py-4 flex items-center gap-3.5 border-b border-white/10 bg-white/5">
            <div className="w-10 h-10 rounded-full border-2 border-[#1877F2] overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 shadow-inner">
              {display.avatarUrl ? (
                <img src={display.avatarUrl} alt={display.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-white truncate leading-snug">{display.name}</h2>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1877F2]/30 text-blue-300 uppercase tracking-wider mt-0.5">
                {display.roleLabel}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#1877F2] text-white font-semibold shadow-md shadow-[#1877F2]/20'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sign Out Action */}
        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 transition-all text-left group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-300 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="relative w-96">
            <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search records, appointments, doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/notifications')}
              className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {notifications.some((n) => !n.isRead) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600">
                {display.avatarUrl ? (
                  <img src={display.avatarUrl} alt={display.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{display.name}</p>
                <p className="text-[10px] font-medium text-slate-500">{display.roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
