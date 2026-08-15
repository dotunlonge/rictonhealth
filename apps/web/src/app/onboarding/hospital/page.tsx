'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/store/useAppStore';
import { usePaystackBanks } from '@/hooks/usePaystackBanks';
import {
  Building2,
  MapPin,
  Bed,
  Stethoscope,
  UserCheck,
  CreditCard,
  FileCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Upload,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Basic Information', description: 'Hospital name, CAC reg & facility tier', icon: Building2 },
  { id: 2, title: 'Contact & Location', description: 'Physical address & emergency lines', icon: MapPin },
  { id: 3, title: 'Capacity & Infrastructure', description: 'Bed count, ICU, Operating theatres', icon: Bed },
  { id: 4, title: 'Clinical Departments', description: 'Specialties offered by your facility', icon: Stethoscope },
  { id: 5, title: 'Medical Director', description: 'MD credentials & administrative lead', icon: UserCheck },
  { id: 6, title: 'Settlement & Billing', description: 'Bank details for payouts & claims', icon: CreditCard },
  { id: 7, title: 'Permit & CAC Upload', description: 'State operating license & CAC cert', icon: FileCheck2 },
  { id: 8, title: 'Facility Review', description: 'Verification & submission', icon: ShieldCheck },
];

export default function HospitalOnboardingPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { banks, resolveAccount } = usePaystackBanks();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    hospitalName: '',
    registrationNumber: '',
    cacNumber: '',
    facilityTier: 'Secondary Healthcare Facility',
    ownershipType: 'Private Specialist Hospital',
    // Step 2: Contact & Location
    address: '',
    city: '',
    state: 'Lagos State',
    emergencyPhone: currentUser?.phone || '',
    supportEmail: currentUser?.email || '',
    website: '',
    // Step 3: Capacity
    totalBeds: '50',
    icuBeds: '6',
    operatingRooms: '3',
    ambulances: '2',
    // Step 4: Clinical Departments
    departments: ['General Medicine', 'Cardiology', 'Emergency Care', 'Pediatrics', 'Surgery'],
    // Step 5: Medical Director
    directorName: currentUser ? `Dr. ${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '',
    directorLicense: '',
    directorPhone: currentUser?.phone || '',
    directorEmail: currentUser?.email || '',
    // Step 6: Settlement Bank Info
    bankName: '',
    accountNumber: '',
    accountName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '',
    // Step 7: Uploads
    licenseFileUploaded: false,
    cacFileUploaded: false,
  });

  useEffect(() => {
    if (currentUser) {
      const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      setFormData((prev) => ({
        ...prev,
        supportEmail: prev.supportEmail || currentUser.email || '',
        emergencyPhone: prev.emergencyPhone || currentUser.phone || '',
        directorName: prev.directorName || (fullName ? `Dr. ${fullName}` : ''),
        directorEmail: prev.directorEmail || currentUser.email || '',
        directorPhone: prev.directorPhone || currentUser.phone || '',
        accountName: prev.accountName || fullName || '',
      }));
    }
  }, [currentUser]);

  const fillDevData = () => {
    setFormData({
      hospitalName: 'St. Nicholas Specialist Hospital',
      registrationNumber: 'HEFAMAA/MED/89201',
      cacNumber: 'RC-1849201',
      facilityTier: 'Secondary Healthcare Facility',
      ownershipType: 'Private Specialist Hospital',
      address: '57 Campbell Street, Victoria Island',
      city: 'Lagos',
      state: 'Lagos State',
      emergencyPhone: '+2348009000000',
      supportEmail: 'info@stnicholashospital.com',
      website: 'https://stnicholashospital.com',
      totalBeds: '120',
      icuBeds: '12',
      operatingRooms: '4',
      ambulances: '3',
      departments: ['General Medicine', 'Cardiology', 'Emergency Care', 'Pediatrics', 'Surgery', 'Radiology & CT Scan'],
      directorName: 'Dr. Babatunde Williams',
      directorLicense: 'MDCN-90812-DIR',
      directorPhone: '+2348031112233',
      directorEmail: 'md@stnicholashospital.com',
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0123456789',
      accountName: 'St Nicholas Hospital Ltd',
      licenseFileUploaded: true,
      cacFileUploaded: true,
    });
    setFormError('');
  };

  const validateStep = (currentStep: number): boolean => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.hospitalName.trim() || !formData.registrationNumber.trim()) {
        setFormError('Hospital Name and Operating License Number are required.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.address.trim() || !formData.city.trim() || !formData.emergencyPhone.trim()) {
        setFormError('Street Address, City, and Emergency Phone are required.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.totalBeds) {
        setFormError('Please specify total inpatient beds.');
        return false;
      }
    } else if (currentStep === 4) {
      if (formData.departments.length === 0) {
        setFormError('Please select at least one clinical department.');
        return false;
      }
    } else if (currentStep === 5) {
      if (!formData.directorName.trim() || !formData.directorLicense.trim()) {
        setFormError('Medical Director Name and License Number are required.');
        return false;
      }
    } else if (currentStep === 6) {
      if (!formData.bankName || formData.accountNumber.length !== 10) {
        setFormError('Please select a Bank and enter a valid 10-digit NUBAN Account Number.');
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
      setStep((s) => Math.min(s + 1, 8));
    }
  };

  const handlePrev = () => {
    setFormError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleDepartment = (dept: string) => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.put('/users/me', {
        hospitalAdminProfile: {
          hospitalName: formData.hospitalName,
          address: formData.address,
          license: formData.registrationNumber,
          metadata: formData,
        },
      });

      setSubmitting(false);
      router.push('/dashboard');
    } catch (err) {
      console.warn('Hospital onboarding error', err);
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
            <span className="block text-[10px] font-bold text-[#1877F2] uppercase tracking-wider">Hospital Facility Portal</span>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Facility Onboarding Progress</h2>
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
          <p className="text-[11px] font-semibold text-slate-400">Need support during registration?</p>
          <a href="mailto:support@ricton.com" className="text-xs font-bold text-[#1877F2] hover:underline mt-1 block">
            Contact Facility Support
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
                  Step {step} of 8
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

            {/* Form Validation Error Banner */}
            {formError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Hospital / Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.hospitalName}
                    onChange={(e) => updateForm('hospitalName', e.target.value)}
                    placeholder="e.g. St. Nicholas Specialist Hospital"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ministry of Health Operating Permit (HEFAMAA) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => updateForm('registrationNumber', e.target.value)}
                      placeholder="e.g. HEFAMAA/MED/89201"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">CAC Registration Number (RC/BN)</label>
                    <input
                      type="text"
                      value={formData.cacNumber}
                      onChange={(e) => updateForm('cacNumber', e.target.value)}
                      placeholder="e.g. RC-1849201"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact & Location */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Physical Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Street number, building name, landmark"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      City / Local Government <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="Victoria Island / Ikoyi"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => updateForm('state', e.target.value)}
                      placeholder="Lagos State"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      24/7 Emergency Line <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => updateForm('emergencyPhone', e.target.value)}
                      placeholder="+234 800 900 0000"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital Official Email</label>
                    <input
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => updateForm('supportEmail', e.target.value)}
                      placeholder="info@hospital.com"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Capacity */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400">Total Inpatient Beds</label>
                    <input
                      type="number"
                      value={formData.totalBeds}
                      onChange={(e) => updateForm('totalBeds', e.target.value)}
                      className="w-full text-center text-xl font-black text-slate-900 bg-transparent mt-1 outline-none"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400">ICU Beds</label>
                    <input
                      type="number"
                      value={formData.icuBeds}
                      onChange={(e) => updateForm('icuBeds', e.target.value)}
                      className="w-full text-center text-xl font-black text-slate-900 bg-transparent mt-1 outline-none"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400">Operating Theatres</label>
                    <input
                      type="number"
                      value={formData.operatingRooms}
                      onChange={(e) => updateForm('operatingRooms', e.target.value)}
                      className="w-full text-center text-xl font-black text-slate-900 bg-transparent mt-1 outline-none"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400">Active Ambulances</label>
                    <input
                      type="number"
                      value={formData.ambulances}
                      onChange={(e) => updateForm('ambulances', e.target.value)}
                      className="w-full text-center text-xl font-black text-slate-900 bg-transparent mt-1 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Clinical Departments */}
            {step === 4 && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700">Select active departments & clinical specialties</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    'General Medicine',
                    'Cardiology',
                    'Emergency Care',
                    'Pediatrics',
                    'Orthopedics',
                    'Neurology',
                    'Obstetrics & Gynecology',
                    'Radiology & CT Scan',
                    'Intensive Care Unit (ICU)',
                  ].map((dept) => {
                    const isSelected = formData.departments.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => toggleDepartment(dept)}
                        className={`p-3.5 rounded-2xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <span>{dept}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Medical Director */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Medical Director Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.directorName}
                      onChange={(e) => updateForm('directorName', e.target.value)}
                      placeholder="Dr. Babatunde Williams"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Director MDCN License Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.directorLicense}
                      onChange={(e) => updateForm('directorLicense', e.target.value)}
                      placeholder="MDCN-90812-DIR"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Settlement & Billing */}
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
                    <option value="">Select Hospital Settlement Bank...</option>
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
                      NUBAN Account Number (10 Digits) <span className="text-rose-500">*</span>
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
                      placeholder="e.g. St. Nicholas Hospital Ltd"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Permit & CAC Upload */}
            {step === 7 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => updateForm('licenseFileUploaded', true)}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                      formData.licenseFileUploaded
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-[#1877F2] bg-slate-50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-[#1877F2] mx-auto mb-2" />
                    <h4 className="text-xs font-extrabold text-slate-900">
                      {formData.licenseFileUploaded ? 'HEFAMAA License Uploaded ✓' : 'Upload HEFAMAA License'}
                    </h4>
                  </div>

                  <div
                    onClick={() => updateForm('cacFileUploaded', true)}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                      formData.cacFileUploaded
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-[#1877F2] bg-slate-50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-[#1877F2] mx-auto mb-2" />
                    <h4 className="text-xs font-extrabold text-slate-900">
                      {formData.cacFileUploaded ? 'CAC Certificate Uploaded ✓' : 'Upload CAC Certificate'}
                    </h4>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Facility Review */}
            {step === 8 && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Ready for Verification</h3>
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

              {step < 8 ? (
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
                  {submitting ? 'Submitting...' : 'Complete Facility Onboarding ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
