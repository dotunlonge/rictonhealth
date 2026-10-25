'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';
import {
  User,
  Shield,
  CreditCard,
  Check,
  Settings as SettingsIcon,
  Camera,
  Upload,
} from 'lucide-react';

type Tab = 'profile' | 'payouts' | 'security' | 'history';
type Bank = { name: string; code: string };
type Session = {
  id: string;
  deviceOs?: string | null;
  userAgent?: string | null;
  deviceIp?: string | null;
  deviceId?: string | null;
  createdAt?: string;
  lastUsedAt?: string;
};

export default function SettingsPage() {
  const { user, setUser, fetchUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [bankList, setBankList] = useState<Bank[]>([]);
  const [resolvingAccount, setResolvingAccount] = useState(false);

  // 2FA & Security States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<'setup' | 'disable'>('setup');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState('');

  // Password Change States
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passMsg, setPassMsg] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsMsg, setSessionsMsg] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Medical history
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [historyMsg, setHistoryMsg] = useState('');
  const [savingHistory, setSavingHistory] = useState(false);

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsMsg('');
    const res = await api.get<{ sessions: Session[] }>('/auth/sessions');
    setSessionsLoading(false);
    if (res.success) {
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.sessions)
          ? res.data.sessions
          : [];
      setSessions(list);
    } else {
      setSessionsMsg(res.error?.message || 'Sessions could not be loaded.');
    }
  };

  const revokeSession = async (sessionId: string) => {    if (!confirm('Revoke this login session?')) return;
    setRevokingId(sessionId);
    const res = await api.delete(`/auth/sessions/${sessionId}`);
    setRevokingId(null);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionsMsg('Session revoked.');
    } else {
      setSessionsMsg(res.error?.message || 'Session could not be revoked.');
    }
  };

  const saveHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHistory(true);    setHistoryMsg('');
    const allergyList = allergies
      .split(/[\n,]+/)
      .map((a) => a.trim())
      .filter(Boolean);
    const conditionList = conditions
      .split(/[\n,]+/)
      .map((c) => c.trim())
      .filter(Boolean)
      .map((condition) => ({ condition }));
    const profileRes = await api.put('/users/me', {
      allergies: allergyList,
      ...(emergencyName.trim() || emergencyPhone.trim()
        ? {
            emergencyContact: {
              name: emergencyName.trim(),
              relationship: emergencyRelationship.trim() || 'Other',
              phone: emergencyPhone.trim(),
            },
          }
        : {}),
    });
    if (!profileRes.success) {
      setSavingHistory(false);
      setHistoryMsg(profileRes.error?.message || 'Medical history could not be saved.');
      return;
    }
    if (conditionList.length > 0) {
      const histRes = await api.put('/users/me/medical-history', {
        medicalHistory: conditionList,
      });
      if (!histRes.success) {
        setSavingHistory(false);
        setHistoryMsg(
          `Allergies saved; conditions failed: ${histRes.error?.message || 'unknown error'}`
        );
        return;
      }
    }
    setSavingHistory(false);
    setHistoryMsg('Medical history updated successfully!');
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [u, bankRes, tfaRes] = await Promise.all([
        fetchUser(),
        api.get<{ banks: Bank[] }>('/payments/banks'),
        api.get<{ twoFactorEnabled: boolean }>('/auth/2fa/status'),
      ]);

      const fetchedBanks =
        bankRes.success && Array.isArray(bankRes.data?.banks) ? bankRes.data.banks : [];
      setBankList(fetchedBanks);

      if (tfaRes.success && tfaRes.data?.twoFactorEnabled !== undefined) {
        setTwoFactorEnabled(tfaRes.data.twoFactorEnabled);
      }

      if (u) {
        const bDetails = u.bankDetails || {};

        const matchedBank = fetchedBanks.find(
          (b) =>
            b.code === bDetails.bankCode ||
            (bDetails.bankName && b.name.toLowerCase().includes(bDetails.bankName.toLowerCase()))
        );

        const defaultCode = bDetails.bankCode || matchedBank?.code || '';
        const defaultName = bDetails.bankName || matchedBank?.name || '';

        setFormData({
          firstName:
            u.firstName || u.patientProfile?.firstName || u.providerProfile?.firstName || '',
          lastName: u.lastName || u.patientProfile?.lastName || u.providerProfile?.lastName || '',
          email: u.email || '',
          phone: u.phone || '',
          bankName: defaultName,
          bankCode: defaultCode,
          accountNumber: bDetails.accountNumber || '',
          accountName: bDetails.accountName || '',
          settlementFrequency: bDetails.settlementFrequency || 'INSTANT',
          consultationFee: String(
            (u.providerProfile as { consultationFee?: unknown } | undefined)
              ?.consultationFee ?? (u as { consultationFee?: unknown }).consultationFee ?? ''
          ),
        });

        const patientProfile = (u as { patientProfile?: Record<string, unknown> }).patientProfile;
        const existingAllergies = patientProfile?.allergies;
        setAllergies(
          Array.isArray(existingAllergies) ? (existingAllergies as string[]).join(', ') : ''
        );
        const existingHistory = patientProfile?.medicalHistory;
        setConditions(
          Array.isArray(existingHistory)
            ? (existingHistory as Array<{ condition?: string }>)
                .map((h) => h.condition)
                .filter(Boolean)
                .join(', ')
            : ''
        );
        const ec = patientProfile?.emergencyContact as
          | { name?: string; relationship?: string; phone?: string }
          | undefined;
        setEmergencyName(ec?.name || '');
        setEmergencyRelationship(ec?.relationship || '');
        setEmergencyPhone(ec?.phone || '');
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (field: string) => {
    setSaving(true);
    setMessage('');
    const res = await api.put('/users/me', { [field]: formData[field] });
    setSaving(false);
    if (res.success && res.data) {
      setUser(res.data);
      setMessage('Settings updated successfully!');
      setEditField(null);
    } else {
      setMessage(res.error?.message || 'Failed to update field.');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage('');
    try {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowedTypes.has(file.type)) {
        setMessage('Choose a JPEG, PNG, or WebP image.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setMessage('Profile photos must be 2 MB or smaller.');
        return;
      }

      const signed = await api.put<{
        uploadUrl: string;
        publicUrl: string;
        maxSizeBytes: number;
      }>('/users/me/avatar', { fileType: file.type });
      if (!signed.success || !signed.data) {
        setMessage(signed.error?.message || 'Failed to prepare profile photo upload.');
        return;
      }
      if (file.size > signed.data.maxSizeBytes) {
        setMessage('Profile photo exceeds the server upload limit.');
        return;
      }

      const uploaded = await fetch(signed.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploaded.ok) {
        setMessage('Object storage rejected the profile photo upload.');
        return;
      }

      const res = await api.put('/users/me', { avatarUrl: signed.data.publicUrl });
      if (res.success && res.data) {
        setUser({ ...res.data, avatarUrl: signed.data.publicUrl });
        setMessage('Profile photo uploaded and saved successfully!');
      } else {
        setMessage(res.error?.message || 'Photo uploaded, but the profile could not be updated.');
      }
    } catch {
      setMessage('Failed to upload profile photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'history', label: 'Medical History', icon: Upload },
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
                <div
                  key={row.key}
                  className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0"
                >
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
                      <span className="text-xs font-bold text-slate-900">
                        {row.value || 'Not specified'}
                      </span>
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

            {user?.role === 'CONSULTANT' && (
              <div className="space-y-1 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Consultation Fee
                </h3>
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="w-40 text-xs font-bold text-slate-600 shrink-0">
                    Fee per visit (₦)
                  </div>
                  <div className="flex-1 max-w-sm">
                    {editField === 'consultationFee' ? (
                      <input
                        type="number"
                        min={500}
                        max={500000}
                        value={formData.consultationFee || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, consultationFee: e.target.value })
                        }
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-900">
                        {formData.consultationFee
                          ? `₦${Number(formData.consultationFee).toLocaleString('en-NG')}`
                          : 'Not specified'}
                      </span>
                    )}
                  </div>
                  <div>
                    {editField === 'consultationFee' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const fee = Number(formData.consultationFee);
                          if (!Number.isFinite(fee) || fee < 500 || fee > 500000) {
                            setMessage('Consultation fee must be between ₦500 and ₦500,000.');
                            return;
                          }
                          setSaving(true);
                          setMessage('');
                          const res = await api.put('/users/me', { consultationFee: fee });
                          setSaving(false);
                          if (res.success && res.data) {
                            setUser(res.data);
                            setMessage('Settings updated successfully!');
                            setEditField(null);
                          } else {
                            setMessage(res.error?.message || 'Failed to update field.');
                          }
                        }}
                        disabled={saving}
                        className="px-4 py-1.5 bg-[#1877F2] text-white text-xs font-bold rounded-full hover:bg-[#1565C0] shadow-xs"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditField('consultationFee')}
                        className="text-xs text-[#1877F2] font-bold hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Medical History</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Allergies, conditions, and emergency contact — your care team reviews everything
                you add here.
              </p>
            </div>
            <form onSubmit={saveHistory} className="space-y-5 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Allergies (comma-separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="Penicillin, Peanuts"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Conditions (one per line or comma-separated)
                </label>
                <textarea
                  rows={3}
                  placeholder="Hypertension, Asthma"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Emergency contact name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Relationship
                  </label>
                  <input
                    type="text"
                    placeholder="Spouse, Parent…"
                    value={emergencyRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Emergency phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>
              </div>
              {historyMsg && (
                <p
                  className={`text-xs font-bold p-3 rounded-xl border ${
                    historyMsg.includes('successfully')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {historyMsg}
                </p>
              )}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingHistory}
                  className="px-6 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {savingHistory ? 'Saving…' : 'Save medical history'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Payment & Settlement Settings</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Configure your verified bank account details for consultation fee payouts,
                prescription settlements, and wallet withdrawals via Paystack.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setMessage('');
                const currentBank = bankList.find((b) => b.code === formData.bankCode);
                const bankPayload = {
                  bankName: formData.bankName || currentBank?.name || '',
                  bankCode: formData.bankCode || currentBank?.code || '',
                  accountNumber: formData.accountNumber || '',
                  accountName: formData.accountName || '',
                  settlementFrequency: formData.settlementFrequency || 'INSTANT',
                };
                const res = await api.put('/users/me', { bankDetails: bankPayload });
                setSaving(false);
                if (res.success) {
                  setMessage('Bank settlement details verified and updated successfully!');
                } else {
                  setMessage(res.error?.message || 'Bank details saved to profile.');
                }
              }}
              className="space-y-6 pt-4 border-t border-slate-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Select Bank (Paystack Verified)
                  </label>
                  <select
                    value={formData.bankCode || ''}
                    onChange={async (e) => {
                      const selectedCode = e.target.value;
                      const selectedBank = bankList.find((b) => b.code === selectedCode);
                      setFormData((prev) => ({
                        ...prev,
                        bankCode: selectedCode,
                        bankName: selectedBank ? selectedBank.name : '',
                      }));

                      const accNo = formData.accountNumber || '';
                      if (accNo.length === 10) {
                        setResolvingAccount(true);
                        const resolveRes = await api.get(
                          `/payments/bank/resolve?accountNumber=${accNo}&bankCode=${selectedCode}`
                        );
                        setResolvingAccount(false);
                        if (resolveRes.success && resolveRes.data?.accountName) {
                          setFormData((prev) => ({
                            ...prev,
                            accountName: resolveRes.data.accountName,
                          }));
                        }
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    {bankList.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Account Number (10 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 0123456789"
                    value={formData.accountNumber || ''}
                    onChange={async (e) => {
                      const accNo = e.target.value.replace(/\D/g, '');
                      setFormData((prev) => ({ ...prev, accountNumber: accNo }));

                      if (accNo.length === 10) {
                        setResolvingAccount(true);
                        const bCode =
                          formData.bankCode || (bankList.length > 0 ? bankList[0].code : '');
                        const resolveRes = await api.get(
                          `/payments/bank/resolve?accountNumber=${accNo}&bankCode=${bCode}`
                        );
                        setResolvingAccount(false);
                        if (resolveRes.success && resolveRes.data?.accountName) {
                          setFormData((prev) => ({
                            ...prev,
                            accountName: resolveRes.data.accountName,
                          }));
                        }
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Account Holder Name (Auto-resolved via NIBSS / Paystack)</span>
                    {resolvingAccount && (
                      <span className="text-blue-600 font-normal">Resolving name...</span>
                    )}
                  </label>
                  <input
                    type="text"
                    readOnly={resolvingAccount}
                    placeholder="Type 10-digit account number above to auto-verify name"
                    value={formData.accountName || ''}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Settlement Frequency
                  </label>
                  <select
                    value={formData.settlementFrequency || 'INSTANT'}
                    onChange={(e) =>
                      setFormData({ ...formData, settlementFrequency: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    <option value="INSTANT">Instant Real-time Auto Payout</option>
                    <option value="DAILY">Daily Batch Settlement (11:59 PM)</option>
                    <option value="WEEKLY">Weekly Payout (Every Monday)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all"
                >
                  {saving ? 'Saving Bank Details...' : 'Save & Verify Bank Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* 2FA Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Two-Factor Authentication (2FA)
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        twoFactorEnabled
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Protect your clinical and personal health account with Google Authenticator,
                    Authy, or 1Password TOTP codes.
                  </p>
                </div>

                {twoFactorEnabled ? (
                  <button
                    onClick={() => {
                      setTwoFAMode('disable');
                      setTotpCode('');
                      setTwoFactorMsg('');
                      setShow2FAModal(true);
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-all"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setTwoFactorMsg('');
                      setTwoFAMode('setup');
                      const res = await api.post('/auth/2fa/enable', {});
                      if (res.success && res.data) {
                        setTwoFactorSecret(res.data.secret || '');
                        setTwoFactorQrUrl(res.data.qrCodeUrl || '');
                        setShow2FAModal(true);
                      } else {
                        alert(res.error?.message || 'Failed to initialize 2FA.');
                      }
                    }}
                    className="px-6 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" /> Enable 2FA Authentication
                  </button>
                )}
              </div>

              {twoFactorMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4" /> {twoFactorMsg}
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Ensure your account is using a strong password with at least 8 characters.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (passData.newPassword !== passData.confirmPassword) {
                    setPassMsg('New password and confirm password do not match.');
                    return;
                  }
                  if (passData.newPassword.length < 8) {
                    setPassMsg('Password must be at least 8 characters long.');
                    return;
                  }
                  setChangingPass(true);
                  setPassMsg('');
                  const res = await api.post('/auth/password/change', {
                    currentPassword: passData.currentPassword,
                    newPassword: passData.newPassword,
                  });
                  setChangingPass(false);
                  if (res.success) {
                    setPassMsg('Password updated successfully!');
                    setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  } else {
                    setPassMsg(res.error?.message || 'Failed to change password.');
                  }
                }}
                className="space-y-4 pt-4 border-t border-slate-100 max-w-xl"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passData.currentPassword}
                    onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    New Password (Min 8 Characters)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passData.newPassword}
                    onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passData.confirmPassword}
                    onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                {passMsg && (
                  <p
                    className={`text-xs font-bold p-3 rounded-xl border ${
                      passMsg.includes('successfully')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {passMsg}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-md transition-all"
                  >
                    {changingPass ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Session Management */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Active Login Sessions</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Live sessions from GET /auth/sessions — revoke any device you don&apos;t
                    recognize.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (!confirm('Log out from all other active sessions and devices?')) return;
                    await api.post('/auth/logout-all', {});
                    alert('Successfully logged out of all active devices.');
                  }}
                  className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-full transition-all"
                >
                  Log Out All Other Devices
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  type="button"
                  onClick={loadSessions}
                  disabled={sessionsLoading}
                  className="text-xs text-[#1877F2] font-bold hover:underline disabled:opacity-50"
                >
                  {sessionsLoading ? 'Loading sessions…' : 'Refresh sessions'}
                </button>
                {sessionsMsg && (
                  <p className="text-xs font-bold text-slate-600">{sessionsMsg}</p>
                )}
                {sessions.length === 0 && !sessionsLoading && !sessionsMsg ? (
                  <p className="text-xs font-semibold text-slate-400">
                    No other sessions loaded yet — refresh to list them.
                  </p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-bold text-sm">
                          💻
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {session.deviceOs || 'Unknown device'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 break-all">
                            {[session.userAgent, session.deviceIp].filter(Boolean).join(' · ') ||
                              'No device details'}
                            {session.lastUsedAt
                              ? ` · Last used ${new Date(session.lastUsedAt).toLocaleString()}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void revokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-full transition-all disabled:opacity-50 shrink-0"
                      >
                        {revokingId === session.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2FA Setup Modal */}
        {show2FAModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {twoFAMode === 'disable'
                      ? 'Disable Two-Factor Authentication'
                      : 'Setup Two-Factor Authentication'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {twoFAMode === 'disable'
                      ? 'Enter a code from your authenticator app to confirm it is really you'
                      : 'Scan the QR code or enter secret key below'}
                  </p>
                </div>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {twoFAMode === 'setup' && (
                  <>
                {/* No external QR service: secret never leaves the browser except to Ricton backend over TLS */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-2 w-full break-all">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">
                      Scan with Google Authenticator, Authy, or 1Password using manual entry:
                    </p>
                    <p className="font-mono text-xs text-slate-800 select-all">{twoFactorQrUrl}</p>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">
                    QR rendering is disabled to avoid sending the secret to third-party services.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Or Enter Secret Key Manually
                  </span>
                  <div className="font-mono text-sm font-extrabold text-[#1877F2] select-all bg-white p-2.5 rounded-xl border border-slate-200">
                    {twoFactorSecret}
                  </div>
                </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Enter 6-Digit Code from Authenticator App
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest font-mono text-lg font-extrabold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full"
                >
                  Cancel
                </button>
                <button
                  disabled={verifying2FA || totpCode.length !== 6}
                  onClick={async () => {
                    setVerifying2FA(true);
                    if (twoFAMode === 'disable') {
                      const res = await api.post('/auth/2fa/disable', { code: totpCode });
                      setVerifying2FA(false);
                      if (res.success) {
                        setTwoFactorEnabled(false);
                        setShow2FAModal(false);
                        setTotpCode('');
                        setTwoFactorMsg('Two-Factor Authentication disabled.');
                        setTimeout(() => setTwoFactorMsg(''), 5000);
                      } else {
                        alert(res.error?.message || 'Verification failed. Enter valid 6-digit code.');
                      }
                      return;
                    }
                    const res = await api.post('/auth/2fa/verify', { code: totpCode });
                    setVerifying2FA(false);
                    if (res.success) {
                      setTwoFactorEnabled(true);
                      setShow2FAModal(false);
                      setTotpCode('');
                      setTwoFactorMsg('Two-Factor Authentication enabled successfully!');
                      setTimeout(() => setTwoFactorMsg(''), 5000);
                    } else {
                      alert(res.error?.message || 'Verification failed. Enter valid 6-digit code.');
                    }
                  }}
                  className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {verifying2FA
                    ? 'Verifying...'
                    : twoFAMode === 'disable'
                      ? 'Confirm Disable 2FA'
                      : 'Verify & Activate 2FA'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
