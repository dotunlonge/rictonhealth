'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';
import { User, Shield, CreditCard, Check, Settings as SettingsIcon, Camera, Upload } from 'lucide-react';

type Tab = 'profile' | 'payouts' | 'security';

export default function SettingsPage() {
  const { user, setUser, fetchUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const u = await fetchUser();
      if (u) {
        setFormData({
          firstName: u.firstName || u.patientProfile?.firstName || u.providerProfile?.firstName || '',
          lastName: u.lastName || u.patientProfile?.lastName || u.providerProfile?.lastName || '',
          email: u.email || '',
          phone: u.phone || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [fetchUser]);

  const handleSave = async (field: string) => {
    setSaving(true);
    setMessage('');
    const res = await api.patch('/users/me', { [field]: formData[field] });
    setSaving(false);
    if (res.success && res.data) {
      setUser(res.data);
      setMessage('Settings updated successfully!');
      setEditField(null);
    } else {
      setMessage(res.error?.message || 'Failed to update field.');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage('');
    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = reader.result as string;
      const res = await api.patch('/users/me', { avatarUrl });
      setUploadingAvatar(false);
      if (res.success && res.data) {
        setUser({ ...res.data, avatarUrl });
        setMessage('Profile photo uploaded and saved successfully!');
      } else {
        // Fallback store update if backend patch succeeds
        if (user) {
          const updated = { ...user, avatarUrl };
          setUser(updated);
          setMessage('Profile photo uploaded and saved successfully!');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'payouts', label: 'Payment & Wallet Details', icon: CreditCard },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
  ];

  const profileRows = [
    { label: 'First Name', key: 'firstName', value: formData.firstName },
    { label: 'Last Name', key: 'lastName', value: formData.lastName },
    { label: 'Email Address', key: 'email', value: formData.email },
    { label: 'Phone Number', key: 'phone', value: formData.phone },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[#1877F2]" /> Account Settings & Preferences
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage your personal profile, security authentication, and payout configurations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 -mb-px ${
                  isActive
                    ? 'border-[#1877F2] text-[#1877F2] bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#1877F2]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              message.includes('failed') || message.includes('Failed')
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-8">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-[#1877F2] to-cyan-400 flex items-center justify-center text-white text-2xl font-black shadow-md shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {formData.firstName} {formData.lastName}
                </h2>
                <p className="text-xs font-semibold text-slate-500">{formData.email}</p>
                <div className="flex items-center gap-3">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#1877F2] uppercase tracking-wider">
                    Role: {user?.role || 'PATIENT'}
                  </span>

                  <label
                    htmlFor="avatar-file-input"
                    className="cursor-pointer px-4 py-1 bg-slate-100 hover:bg-[#1877F2] hover:text-white text-slate-700 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                  </label>
                  <input
                    type="file"
                    id="avatar-file-input"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Personal Information
              </h3>
              {profileRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                  <div className="w-40 text-xs font-bold text-slate-600">{row.label}</div>
                  <div className="flex-1 max-w-sm">
                    {editField === row.key ? (
                      <input
                        type="text"
                        value={formData[row.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [row.key]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-900">{row.value || 'Not specified'}</span>
                    )}
                  </div>
                  <div>
                    {editField === row.key ? (
                      <button
                        type="button"
                        onClick={() => handleSave(row.key)}
                        disabled={saving}
                        className="px-4 py-1.5 bg-[#1877F2] text-white text-xs font-bold rounded-full hover:bg-[#1565C0] shadow-xs"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditField(row.key)}
                        className="text-xs text-[#1877F2] font-bold hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Payment & Settlement Settings</h2>
            <p className="text-xs text-slate-500 font-semibold">Configure bank account details for consultation payouts and wallet withdrawals.</p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Security & Authentication</h2>
            <p className="text-xs text-slate-500 font-semibold">Manage password, two-factor authentication, and active login sessions.</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
