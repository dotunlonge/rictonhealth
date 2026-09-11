'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const navItems = [
  { label: 'Overview', href: '/admin', icon: '📊' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Providers', href: '/admin/providers', icon: '🩺' },
  { label: 'Hospitals', href: '/admin/hospitals', icon: '🏥' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'Audit Log', href: '/admin/audit', icon: '📋' },
];

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    async function load() {
      const res = await api.get('/admin/users');
      if (res.success) {
        setUsers(Array.isArray(res.data) ? res.data : res.data?.users || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleUpdateStatus = async (userId: string, status: string) => {
    const res = await api.patch(`/admin/users/${userId}/status`, { status });
    if (res.success) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    } else {
      alert(res.error?.message || 'Failed to update status.');
    }
  };

  const [showProvision, setShowProvision] = useState(false);
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provMsg, setProvMsg] = useState<string | null>(null);
  const [provError, setProvError] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    setProvMsg(null);
    // The ONLY creation path for privileged roles (public signup is capped).
    const res = await api.post('/admin/users', {
      email: provEmail,
      password: provPassword,
      role: 'HOSPITAL_ADMIN',
    });
    setProvisioning(false);
    if (res.success && res.data?.id) {
      setProvMsg(`Hospital admin ${provEmail} provisioned and active.`);
      setProvError(false);
      setProvEmail('');
      setProvPassword('');
      const list = await api.get('/admin/users');
      if (list.success) {
        setUsers(Array.isArray(list.data) ? list.data : list.data?.users || []);
      }
    } else {
      setProvMsg(res.error?.message || 'Provisioning failed.');
      setProvError(true);
    }
  };

  const roles = ['ALL', 'PATIENT', 'CONSULTANT', 'HOSPITAL_ADMIN', 'PHARMACY_ADMIN', 'SUPER_ADMIN'];

  return (
    <div className="min-h-screen flex font-sans">
      <aside className="w-44 bg-slate-900 text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1877F2] rounded-lg flex items-center justify-center text-sm font-bold">
            R
          </div>
          <div>
            <span className="text-base font-bold">Ricton</span>
            <p className="text-[9px] text-slate-400 -mt-0.5">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 mt-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 transition-all text-sm ${item.href === '/admin/users' ? 'bg-[#1877F2] font-semibold' : 'opacity-70 hover:opacity-100'}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="ml-44 flex-1 bg-gradient-to-br from-slate-100 to-slate-200 min-h-screen">
        <div className="px-8 py-8 pb-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-500 text-sm">{users.length} total users</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h1 className="text-2xl font-extrabold text-slate-900">User Management</h1>
            <button
              type="button"
              onClick={() => setShowProvision((v) => !v)}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md transition-all"
            >
              + Provision Hospital Admin
            </button>
          </div>

          {showProvision && (
            <form
              onSubmit={handleProvision}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-6 space-y-4 max-w-2xl"
            >
              <h2 className="text-sm font-bold text-slate-900">
                Provision Hospital Admin (privileged — Super Admin only)
              </h2>
              {provMsg && (
                <p
                  className={`text-xs font-bold p-3 rounded-xl border ${provError ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}
                >
                  {provMsg}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <input
                  required
                  type="email"
                  placeholder="Admin email"
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="Temporary password (8+ chars)"
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <button
                type="submit"
                disabled={provisioning}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs disabled:opacity-50"
              >
                {provisioning ? 'Provisioning...' : 'Create Active Hospital Admin'}
              </button>
            </form>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 flex-1 max-w-sm">
              <span className="text-slate-400">🔍</span>
              <input
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    roleFilter === role
                      ? 'bg-[#1877F2] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {role === 'ALL' ? 'All Users' : role.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-bold text-slate-600 uppercase">
                  <th className="py-4 px-6 text-left">User</th>
                  <th className="py-4 px-4 text-center">Role</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Verified</th>
                  <th className="py-4 px-4 text-center">Joined</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#1877F2]/10 rounded-full flex items-center justify-center font-bold text-sm text-[#1877F2]">
                            {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            user.role === 'SUPER_ADMIN'
                              ? 'bg-red-100 text-red-600'
                              : user.role === 'CONSULTANT'
                                ? 'bg-blue-100 text-blue-700'
                                : user.role === 'PATIENT'
                                  ? 'bg-green-100 text-green-700'
                                  : user.role === 'HOSPITAL_ADMIN'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : user.status === 'SUSPENDED'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {user.isVerified ? (
                          <span className="text-green-500 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-xs text-slate-500">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.status !== 'SUSPENDED' ? (
                            <button
                              onClick={() => handleUpdateStatus(user.id, 'SUSPENDED')}
                              className="text-xs text-red-500 hover:text-red-700 font-semibold"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(user.id, 'ACTIVE')}
                              className="text-xs text-green-600 hover:text-green-800 font-semibold"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
