'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const navigationItems = [
  { label: 'Home', href: '/dashboard/hospital', icon: '🏠' },
  { label: 'Doctor', href: '/providers', icon: '🩺' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appiontment', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earnings', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Tele-medicine', href: '/telemedicine', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

const HEX_BG = `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

type Tab = 'profile' | 'users' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [activeNav] = useState('Setting');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const res = await api.get('/users/me');
      if (res.success && res.data) {
        setProfile(res.data);
        setFormData({
          firstName: res.data.firstName || '',
          lastName: res.data.lastName || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          bankName: res.data.bankName || '',
          accountNumber: res.data.accountNumber || '',
          accountName: res.data.accountName || '',
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (field: string) => {
    setSaving(true);
    const res = await api.patch('/users/me', { [field]: formData[field] });
    setSaving(false);
    if (res.success) {
      setProfile((prev: any) => ({ ...prev, [field]: formData[field] }));
      setEditField(null);
      setMessage('Saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(res.error?.message || 'Save failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'OH'
    : 'OH';

  const profileRows = [
    { key: 'firstName', label: 'First Name', value: profile?.firstName },
    { key: 'lastName', label: 'Last Name', value: profile?.lastName },
    { key: 'email', label: 'Email', value: profile?.email },
    { key: 'phone', label: 'Telephone', value: profile?.phone },
    { key: 'address', label: 'Address', value: profile?.address },
  ];

  const bankRows = [
    { key: 'bankName', label: 'Bank Name', value: profile?.bankName },
    { key: 'accountName', label: 'Account Name', value: profile?.accountName },
    { key: 'accountNumber', label: 'Account Number', value: profile?.accountNumber },
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Hospital profile' },
    { id: 'users', label: 'User management' },
    { id: 'security', label: 'Security & Privacy' },
  ];

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="w-40 bg-[#1877F2] text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-base">🩺</div>
          <span className="text-lg font-bold">Ricton</span>
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all text-center ${
                activeNav === item.label
                  ? 'bg-white/20 font-semibold'
                  : 'hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          ))}
          <button className="w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl hover:bg-white/10 opacity-80 transition-all mt-4">
            <span className="text-xl mb-0.5">🚪</span>
            <span className="text-[10px]">Logout</span>
          </button>
        </nav>
      </aside>

      <main className="ml-40 flex-1 bg-gradient-to-br from-[#DAE8FE] to-[#EEF4FD] relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: HEX_BG, backgroundSize: '110px 190px' }} />

        <div className="relative z-10 px-8 py-8 pb-20 max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex gap-0 mb-8 border-b-2 border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#1877F2] text-[#1877F2]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {message && (
            <div className={`mb-4 px-4 py-2 rounded-xl text-sm font-medium ${
              message.includes('failed') || message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm">
              {/* Avatar */}
              <div className="flex items-center gap-6 mb-10">
                <div className="w-24 h-24 bg-[#1877F2] rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                  {loading ? '...' : initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {loading ? '...' : `${profile?.firstName || ''} ${profile?.lastName || ''}`}
                  </h2>
                  <p className="text-sm text-slate-500">{profile?.email}</p>
                  <button className="mt-2 text-xs text-[#1877F2] font-semibold hover:underline">Change photo</button>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-slate-800 mb-4">Personal Information</h3>
                <div className="space-y-1">
                  {profileRows.map((row) => (
                    <div key={row.key} className="flex items-center py-4 border-b border-slate-100 last:border-0">
                      <div className="w-36 text-sm font-semibold text-slate-600">{row.label}</div>
                      <div className="flex-1">
                        {editField === row.key ? (
                          <input
                            autoFocus
                            value={formData[row.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [row.key]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(row.key);
                              if (e.key === 'Escape') setEditField(null);
                            }}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                          />
                        ) : (
                          <span className="text-sm text-slate-900 font-medium">{row.value || '—'}</span>
                        )}
                      </div>
                      <div className="ml-4">
                        {editField === row.key ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(row.key)}
                              disabled={saving}
                              className="text-xs text-white bg-[#1877F2] px-4 py-1.5 rounded-full font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                            >
                              {saving ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditField(null)}
                              className="text-xs text-slate-500 px-3 py-1.5 rounded-full font-semibold hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditField(row.key)}
                            className="text-xs text-[#1877F2] font-semibold hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Info */}
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-4">Bank Account Information</h3>
                <div className="space-y-1">
                  {bankRows.map((row) => (
                    <div key={row.key} className="flex items-center py-4 border-b border-slate-100 last:border-0">
                      <div className="w-36 text-sm font-semibold text-slate-600">{row.label}</div>
                      <div className="flex-1">
                        {editField === row.key ? (
                          <input
                            autoFocus
                            value={formData[row.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [row.key]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(row.key);
                              if (e.key === 'Escape') setEditField(null);
                            }}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                          />
                        ) : (
                          <span className="text-sm text-slate-900 font-medium">{row.value || '—'}</span>
                        )}
                      </div>
                      <div className="ml-4">
                        {editField === row.key ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(row.key)}
                              disabled={saving}
                              className="text-xs text-white bg-[#1877F2] px-4 py-1.5 rounded-full font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                            >
                              {saving ? '...' : 'Save'}
                            </button>
                            <button onClick={() => setEditField(null)} className="text-xs text-slate-500 px-3 py-1.5 rounded-full font-semibold hover:bg-slate-100">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditField(row.key)} className="text-xs text-[#1877F2] font-semibold hover:underline">Edit</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm text-center py-16">
              <div className="text-5xl mb-4">👥</div>
              <h2 className="font-bold text-slate-900 text-lg mb-2">User Management</h2>
              <p className="text-slate-500 text-sm mb-6">Manage hospital staff and access permissions</p>
              <Link href="/admin/users" className="inline-block bg-[#1877F2] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-blue-700 transition-colors">
                Go to Admin Panel →
              </Link>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Security & Privacy</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Change Password</h3>
                    <p className="text-xs text-slate-500">Update your account password</p>
                  </div>
                  <button className="text-sm text-[#1877F2] font-semibold hover:underline">Update →</button>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Two-Factor Authentication</h3>
                    <p className="text-xs text-slate-500">Add an extra layer of security to your account</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-5 bg-slate-200 rounded-full cursor-pointer" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Active Sessions</h3>
                    <p className="text-xs text-slate-500">Manage and revoke active login sessions</p>
                  </div>
                  <button className="text-sm text-red-500 font-semibold hover:underline">Revoke all</button>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Data Privacy</h3>
                    <p className="text-xs text-slate-500">Download or delete your data</p>
                  </div>
                  <button className="text-sm text-[#1877F2] font-semibold hover:underline">Manage →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
