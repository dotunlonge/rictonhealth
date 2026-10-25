'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  Users,
  UserPlus,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Lock,
  Mail,
  Calendar,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  status?: string;
  isVerified?: boolean;
  createdAt?: string;
};

type Hospital = { id: string; name: string; isActive: boolean };

const ROLES = ['ALL', 'PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actingId, setActingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Provisioning form states
  const [showProvision, setShowProvision] = useState(false);
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provHospitalId, setProvHospitalId] = useState('');
  const [provRole, setProvRole] = useState<'HOSPITAL_ADMIN' | 'SUPER_ADMIN'>('HOSPITAL_ADMIN');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [provisioning, setProvisioning] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const res = await api.get('/admin/users');
    if (res.success) {
      setUsers(Array.isArray(res.data) ? res.data : res.data?.users || []);
    } else {
      setFeedback({ message: res.error?.message || 'Failed to load user directory.', type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadUsers();
    void api.get<{ hospitals: Hospital[] }>('/admin/hospitals').then((r) => {
      if (r.success) setHospitals(r.data?.hospitals || []);
    });
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    setActingId(userId);
    setFeedback(null);
    const res = await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
    setActingId(null);
    if (res.success) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
      setFeedback({ message: `User status updated to ${newStatus}.`, type: 'success' });
    } else {
      setFeedback({ message: res.error?.message || 'Failed to update user status.', type: 'error' });
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    setFeedback(null);

    const res = await api.post('/admin/users', {
      email: provEmail.trim(),
      password: provPassword,
      role: provRole,
      ...(provRole === 'HOSPITAL_ADMIN' ? { hospitalId: provHospitalId } : {}),
    });

    setProvisioning(false);
    if (res.success && res.data?.id) {
      setFeedback({
        message: `${provRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Hospital Admin'} ${provEmail} provisioned successfully!`,
        type: 'success',
      });
      setShowProvision(false);
      setProvEmail('');
      setProvPassword('');
      setProvHospitalId('');
      setProvRole('HOSPITAL_ADMIN');
      void loadUsers();
    } else {
      setFeedback({ message: res.error?.message || 'Provisioning failed. Check password length or email.', type: 'error' });
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <Users className="w-3.5 h-3.5" /> Identity & Access Governance
              </span>
              <span className="text-xs text-slate-400 font-semibold">• {users.length} Total Accounts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              User Directory & Role Provisioning
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Inspect user accounts, manage account suspension states, and provision privileged Hospital & System Administrators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProvision((v) => !v)}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Provision Privileged Admin
            </button>
            <button
              onClick={() => void loadUsers()}
              disabled={loading}
              title="Refresh User List"
              className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              {feedback.message}
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Provision Modal / Expandable Box */}
        {showProvision && (
          <form
            onSubmit={handleProvision}
            className="bg-white rounded-3xl p-6 sm:p-7 border border-blue-200 shadow-md space-y-5 animate-in fade-in zoom-in-98"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Provision Privileged Administrator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create active administrative credentials with direct dashboard authority.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProvision(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Email Address
                </label>
                <input
                  required
                  type="email"
                  placeholder="admin@facility.com"
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Privileged Role Tier
                </label>
                <select
                  value={provRole}
                  onChange={(e) => setProvRole(e.target.value as 'HOSPITAL_ADMIN' | 'SUPER_ADMIN')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                >
                  <option value="HOSPITAL_ADMIN">Hospital Facility Admin (Hospital-Scoped)</option>
                  <option value="SUPER_ADMIN">System Super Admin (Global Platform Scope)</option>
                </select>
              </div>

              {provRole === 'HOSPITAL_ADMIN' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Licensed Facility
                  </label>
                  <select
                    required
                    value={provHospitalId}
                    onChange={(e) => setProvHospitalId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    <option value="">Select hospital facility…</option>
                    {hospitals
                      .filter((h) => h.isActive)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Secure Password (8+ characters)
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="Min 8 characters password"
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProvision(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={provisioning}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50"
              >
                {provisioning
                  ? 'Provisioning in progress...'
                  : provRole === 'SUPER_ADMIN'
                    ? 'Create Active Super Admin'
                    : 'Create Active Hospital Admin'}
              </button>
            </div>
          </form>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-white text-[#1877F2] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* User Directory Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-4 px-6">User Account</th>
                  <th className="py-4 px-4 text-center">System Role</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Email Verified</th>
                  <th className="py-4 px-4 text-center">Member Since</th>
                  <th className="py-4 px-6 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400">
                      <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-bold text-slate-700">No users found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or role filter.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => {
                    const initials =
                      user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U';
                    const isSuper = user.role === 'SUPER_ADMIN';
                    const isDoctor = user.role === 'CONSULTANT';
                    const isHospitalAdmin = user.role === 'HOSPITAL_ADMIN';
                    const isSuspended = user.status === 'SUSPENDED';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {user.firstName || user.lastName
                                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                  : user.email.split('@')[0]}
                              </p>
                              <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                              isSuper
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isDoctor
                                  ? 'bg-blue-50 text-[#1877F2] border border-blue-200'
                                  : isHospitalAdmin
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isSuspended
                                ? 'bg-rose-100 text-rose-800'
                                : user.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSuspended ? (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            )}
                            {user.status || 'ACTIVE'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {user.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center text-xs text-slate-500 font-medium">
                          {user.createdAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(user.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.status !== 'SUSPENDED' ? (
                              <button
                                onClick={() => handleUpdateStatus(user.id, 'SUSPENDED')}
                                disabled={actingId === user.id || isSuper}
                                title={isSuper ? 'Cannot suspend super admin directly' : 'Suspend account'}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all disabled:opacity-40"
                              >
                                {actingId === user.id ? 'Updating...' : 'Suspend'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(user.id, 'ACTIVE')}
                                disabled={actingId === user.id}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all disabled:opacity-50"
                              >
                                {actingId === user.id ? 'Updating...' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
