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

type Hospital = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; country?: string } | null;
  isActive: boolean;
  createdAt?: string;
};

export default function AdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await api.get('/admin/hospitals');
      if (res.success) {
        setHospitals(Array.isArray(res.data) ? res.data : res.data?.hospitals || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await api.post('/admin/hospitals', formData);
    setCreating(false);
    if (res.success && res.data) {
      setHospitals((prev) => [res.data, ...prev]);
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '', address: '', city: '', state: '', country: 'Nigeria' });
    } else {
      alert(res.error?.message || 'Failed to create hospital.');
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      <aside className="w-44 bg-slate-900 text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1877F2] rounded-lg flex items-center justify-center text-sm font-bold">R</div>
          <div>
            <span className="text-base font-bold">Ricton</span>
            <p className="text-[9px] text-slate-400 -mt-0.5">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 mt-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 transition-all text-sm ${item.href === '/admin/hospitals' ? 'bg-[#1877F2] font-semibold' : 'opacity-70 hover:opacity-100'}`}>
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
              <h1 className="text-2xl font-bold text-slate-900">Hospital Management</h1>
              <p className="text-slate-500 text-sm">{hospitals.length} registered hospitals</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#1877F2] hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-colors"
            >
              {showForm ? '✕ Cancel' : '+ Add Hospital'}
            </button>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="font-bold text-slate-900 mb-5">Register New Hospital</h2>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hospital Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    placeholder="e.g., Lagos University Teaching Hospital"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    placeholder="admin@hospital.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone *</label>
                  <input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Address *</label>
                  <input
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    placeholder="123 Hospital Rd, Lagos"
                  />
                </div>
                {(['city', 'state', 'country'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 capitalize">{field} *</label>
                    <input
                      required
                      value={formData[field]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>
                ))}
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-[#1877F2] hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-2.5 rounded-full font-bold text-sm transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create Hospital'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-bold text-slate-600 uppercase">
                  <th className="py-4 px-6 text-left">Hospital</th>
                  <th className="py-4 px-4 text-center">Email</th>
                  <th className="py-4 px-4 text-center">Phone</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Registered</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading hospitals...
                    </td>
                  </tr>
                ) : hospitals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">No hospitals registered yet</td>
                  </tr>
                ) : (
                  hospitals.map((hospital) => (
                    <tr key={hospital.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center font-bold text-purple-700 text-base">🏥</div>
                          <div>
                            <p className="font-semibold text-slate-900">{hospital.name}</p>
                            {hospital.address && (
                              <p className="text-xs text-slate-500">
                                {[hospital.address.line1, hospital.address.city, hospital.address.state, hospital.address.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-600 text-xs">{hospital.email || '—'}</td>
                      <td className="py-4 px-4 text-center text-slate-600 text-xs">{hospital.phone || '—'}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          hospital.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>{hospital.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="py-4 px-4 text-center text-xs text-slate-500">
                        {hospital.createdAt ? new Date(hospital.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link href={`/admin/hospitals/${hospital.id}`} className="text-xs text-[#1877F2] font-semibold hover:underline">View →</Link>
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
