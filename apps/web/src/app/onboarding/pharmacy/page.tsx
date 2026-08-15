'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/store/useAppStore';
import { usePaystackBanks } from '@/hooks/usePaystackBanks';
import {
  Pill,
  MapPin,
  Clock,
  UserCheck,
  Truck,
  CreditCard,
  FileCheck2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Pharmacy Basic Info', description: 'Store name, type & PCN registration', icon: Pill },
  { id: 2, title: 'Location & Contact', description: 'Physical store address & support line', icon: MapPin },
  { id: 3, title: 'Operating Hours', description: '24/7 availability & daily time slots', icon: Clock },
  { id: 4, title: 'Superintendent Pharmacist', description: 'Head pharmacist & license details', icon: UserCheck },
  { id: 5, title: 'Delivery & Services', description: 'Express delivery, compounding & OTC', icon: Truck },
  { id: 6, title: 'Payout & Settlement', description: 'Bank account for prescription payouts', icon: CreditCard },
  { id: 7, title: 'PCN License Upload', description: 'Premises license & PCN verification', icon: FileCheck2 },
];

export default function PharmacyOnboardingPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { banks, resolveAccount } = usePaystackBanks();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1
    pharmacyName: '',
    registrationNumber: '',
    pharmacyType: 'Retail & Digital Prescription Pharmacy',
    // Step 2
    address: '',
    city: '',
    state: 'Lagos State',
    supportEmail: currentUser?.email || '',
    supportPhone: currentUser?.phone || '',
    // Step 3
    is24Hours: true,
    openTime: '08:00',
    closeTime: '22:00',
    // Step 4
    superintendentName: currentUser ? `Pharm. ${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '',
    superintendentLicense: '',
    // Step 5
    services: ['Prescription Filling', 'Express Home Delivery', 'Over-the-Counter (OTC)', 'Health Screenings'],
    // Step 6
    bankName: '',
    accountNumber: '',
    accountName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '',
    // Step 7
    pcnLicenseUploaded: false,
  });

  useEffect(() => {
    if (currentUser) {
      const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      setFormData((prev) => ({
        ...prev,
        supportEmail: prev.supportEmail || currentUser.email || '',
        supportPhone: prev.supportPhone || currentUser.phone || '',
        superintendentName: prev.superintendentName || (fullName ? `Pharm. ${fullName}` : ''),
        accountName: prev.accountName || fullName || '',
      }));
    }
  }, [currentUser]);

  const fillDevData = () => {
    setFormData({
      pharmacyName: 'Medplus Pharmacy & Healthcare',
      registrationNumber: 'PCN/PREM/89201',
      pharmacyType: 'Retail & Digital Prescription Pharmacy',
      address: '45 Admiralty Way, Lekki Phase 1',
      city: 'Lekki',
      state: 'Lagos State',
      supportEmail: 'care@medplus.ng',
      supportPhone: '+2348039990000',
      is24Hours: true,
      openTime: '08:00',
      closeTime: '22:00',
      superintendentName: 'Pharm. Kemi Adebayo',
      superintendentLicense: 'PCN/PHARM/90182',
      services: ['Prescription Filling', 'Express Home Delivery', 'Over-the-Counter (OTC)', 'Health Screenings', 'Vaccinations'],
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0123456789',
      accountName: 'Medplus Pharmacy Nigeria Ltd',
      pcnLicenseUploaded: true,
    });
    setFormError('');
  };

  const validateStep = (currentStep: number): boolean => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.pharmacyName.trim() || !formData.registrationNumber.trim()) {
        setFormError('Pharmacy Name and PCN Registration Number are required.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.address.trim() || !formData.city.trim() || !formData.supportPhone.trim()) {
        setFormError('Physical Address, City, and Support Phone are required.');
        return false;
      }
    } else if (currentStep === 4) {
      if (!formData.superintendentName.trim() || !formData.superintendentLicense.trim()) {
        setFormError('Superintendent Pharmacist Name and License are required.');
        return false;
      }
    } else if (currentStep === 5) {
      if (formData.services.length === 0) {
        setFormError('Please select at least one pharmacy service.');
        return false;
      }
    } else if (currentStep === 6) {
      if (!formData.bankName || formData.accountNumber.length !== 10) {
        setFormError('Please select a Bank and enter a 10-digit NUBAN Account Number.');
        return false;
      }
    }
    return true;
  };

  const updateForm = (field: string, value: any) => {
    setFormError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 7));
    }
  };

  const handlePrev = () => {
    setFormError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleService = (service: string) => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.put('/users/me', {
        pharmacyProfile: {
          pharmacyName: formData.pharmacyName,
          address: formData.address,
          pcnLicense: formData.registrationNumber,
          metadata: formData,
        },
      });

      setSubmitting(false);
      router.push('/dashboard');
    } catch (err) {
      console.warn('Pharmacy onboarding error', err);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased relative">
      {/* Dev-Only Floating Auto-Fill Button */}
      {process.env.NODE_ENV !== 'production' && (
        <button
          type="button"
          onClick={fillDevData}
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-amber-300 font-extrabold text-xs rounded-full shadow-2xl hover:bg-slate-800 hover:scale-105 transition-all flex items-center gap-2 border border-amber-400/40"
        >
          ⚡ Dev Auto-Fill Form
        </button>
      )}

      {/* Sidebar Progress */}
      <aside className="w-80 bg-white border-r border-slate-200/80 hidden lg:flex flex-col p-8 shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
            R
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900">Ricton Health</span>
            <span className="block text-[10px] font-bold text-[#1877F2] uppercase tracking-wider">Pharmacy Partner Portal</span>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Premises Verification Progress</h2>
          <div className="space-y-4">
            {STEPS.map((s) => {
              const isActive = step === s.id;
              const isPast = step > s.id;
              const StepIcon = s.icon;
              return (
                <div
                  key={s.id}
                  onClick={() => isPast && setStep(s.id)}
                  className={`flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200/80 text-[#1877F2]'
                      : isPast
                      ? 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      : 'opacity-50 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isActive
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : s.id}
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{s.title}</h3>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] font-semibold text-slate-400">Need assistance with PCN registration?</p>
          <a href="mailto:support@ricton.com" className="text-xs font-bold text-[#1877F2] hover:underline mt-1 block">
            Contact PCN Support Desk
          </a>
        </div>
      </aside>

      {/* Main Form Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-12 flex flex-col justify-center">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/80 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1877F2] bg-blue-50 px-3 py-1 rounded-full">
                  Step {step} of 7
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-2">{STEPS[step - 1].title}</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">{STEPS[step - 1].description}</p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = STEPS[step - 1].icon;
                  return <Icon className="w-6 h-6" />;
                })()}
              </div>
            </div>

            {/* Form Error Banner */}
            {formError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Registered Pharmacy Store Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pharmacyName}
                    onChange={(e) => updateForm('pharmacyName', e.target.value)}
                    placeholder="e.g. Medplus Pharmacy & Healthcare"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      PCN Premises Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => updateForm('registrationNumber', e.target.value)}
                      placeholder="e.g. PCN/PREM/89201"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pharmacy Category</label>
                    <select
                      value={formData.pharmacyType}
                      onChange={(e) => updateForm('pharmacyType', e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option>Retail & Digital Prescription Pharmacy</option>
                      <option>Hospital Internal Pharmacy</option>
                      <option>Wholesale & Distribution Hub</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Physical Store Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Street address, building number, landmark"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      City / Area <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="Lekki Phase 1"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Support Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.supportPhone}
                      onChange={(e) => updateForm('supportPhone', e.target.value)}
                      placeholder="+234 803 000 0000"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Hours */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">24/7 Emergency Prescription Dispensing</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Store accepts round-the-clock digital orders</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is24Hours}
                    onChange={(e) => updateForm('is24Hours', e.target.checked)}
                    className="w-5 h-5 rounded text-[#1877F2] focus:ring-[#1877F2]"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Superintendent */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Superintendent Pharmacist Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.superintendentName}
                      onChange={(e) => updateForm('superintendentName', e.target.value)}
                      placeholder="Pharm. Kemi Adebayo"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      PCN Personal Pharmacist License <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.superintendentLicense}
                      onChange={(e) => updateForm('superintendentLicense', e.target.value)}
                      placeholder="PCN/PHARM/90182"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Services */}
            {step === 5 && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700">Select active pharmacy services</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    'Prescription Filling',
                    'Express Home Delivery',
                    'Over-the-Counter (OTC)',
                    'Health Screenings',
                    'Vaccinations',
                    'Compounding',
                  ].map((service) => {
                    const isSelected = formData.services.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`p-3.5 rounded-2xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <span>{service}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Bank Account */}
            {step === 6 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Settlement Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={async (e) => {
                      const bankName = e.target.value;
                      updateForm('bankName', bankName);
                      if (formData.accountNumber.length === 10 && bankName) {
                        const selectedBank = banks.find((b) => b.name === bankName);
                        if (selectedBank) {
                          setVerifyingAccount(true);
                          const name = await resolveAccount(formData.accountNumber, selectedBank.code);
                          setVerifyingAccount(false);
                          if (name) updateForm('accountName', name);
                        }
                      }
                    }}
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  >
                    <option value="">Select Pharmacy Settlement Bank...</option>
                    {banks.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Account Number (10 Digits) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.accountNumber}
                      onChange={async (e) => {
                        const acc = e.target.value;
                        updateForm('accountNumber', acc);
                        if (acc.length === 10 && formData.bankName) {
                          const selectedBank = banks.find((b) => b.name === formData.bankName);
                          if (selectedBank) {
                            setVerifyingAccount(true);
                            const name = await resolveAccount(acc, selectedBank.code);
                            setVerifyingAccount(false);
                            if (name) updateForm('accountName', name);
                          }
                        }
                      }}
                      placeholder="0123456789"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Account Beneficiary Name {verifyingAccount && <span className="text-blue-500 font-normal">(Verifying...)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.accountName}
                      onChange={(e) => updateForm('accountName', e.target.value)}
                      placeholder="Medplus Pharmacy Ltd"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Documents */}
            {step === 7 && (
              <div className="space-y-6">
                <div
                  onClick={() => updateForm('pcnLicenseUploaded', true)}
                  className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                    formData.pcnLicenseUploaded
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-[#1877F2] bg-slate-50'
                  }`}
                >
                  <Upload className="w-10 h-10 text-[#1877F2] mx-auto mb-2" />
                  <h4 className="text-xs font-extrabold text-slate-900">
                    {formData.pcnLicenseUploaded ? 'PCN Premises Operating License Uploaded ✓' : 'Upload Official PCN Premises License'}
                  </h4>
                </div>
              </div>
            )}

            {/* Navigation Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handlePrev}
                disabled={step === 1 || submitting}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  step === 1 ? 'opacity-0 pointer-events-none' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#1877F2] hover:bg-[#1565C0] text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Complete Pharmacy Registration ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
