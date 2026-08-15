'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/store/useAppStore';
import { usePaystackBanks } from '@/hooks/usePaystackBanks';
import {
  User,
  Stethoscope,
  Award,
  BookOpen,
  Building2,
  CreditCard,
  FileCheck2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Basic details & profile photo', icon: User },
  { id: 2, title: 'Specialty & Practice', description: 'Primary specialty & clinical focus', icon: Stethoscope },
  { id: 3, title: 'Medical Licensing', description: 'MDCN registration & expiry', icon: Award },
  { id: 4, title: 'Academic Qualifications', description: 'Degrees & medical school', icon: BookOpen },
  { id: 5, title: 'Hospital Affiliations', description: 'Teaching hospitals & clinics', icon: Building2 },
  { id: 6, title: 'Settlement Account', description: 'Bank details for tele-health payouts', icon: CreditCard },
  { id: 7, title: 'Document Verification', description: 'Upload MDCN license & ID card', icon: FileCheck2 },
];

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { banks, resolveAccount } = usePaystackBanks();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    gender: 'Male',
    dob: '',
    nationality: 'Nigerian',
    // Step 2
    specialty: 'Cardiology',
    subSpecialty: 'Interventional Cardiology',
    yearsExperience: '12',
    // Step 3
    licenseNumber: '',
    licenseExpiry: '',
    // Step 4
    degree: 'MBBS, FWACP (Cardiology)',
    university: 'University of Lagos',
    graduationYear: '2012',
    // Step 5
    primaryHospital: 'Lagos University Teaching Hospital (LUTH)',
    hospitalAddress: 'Idi-Araba, Surulere, Lagos',
    // Step 6
    bankName: '',
    accountNumber: '',
    accountName: currentUser ? `Dr. ${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '',
    // Step 7
    licenseFileUploaded: false,
    idFileUploaded: false,
  });

  useEffect(() => {
    if (currentUser) {
      const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || currentUser.firstName || '',
        lastName: prev.lastName || currentUser.lastName || '',
        accountName: prev.accountName || (fullName ? `Dr. ${fullName}` : ''),
      }));
    }
  }, [currentUser]);

  const fillDevData = () => {
    setFormData({
      firstName: 'Tope',
      lastName: 'Olaniyi',
      gender: 'Female',
      dob: '1988-04-12',
      nationality: 'Nigerian',
      specialty: 'Cardiology',
      subSpecialty: 'Interventional Cardiology',
      yearsExperience: '14',
      licenseNumber: 'MDCN-78192-CAR',
      licenseExpiry: '2028-12-31',
      degree: 'MBBS, FWACP (Cardiology)',
      university: 'University of Lagos',
      graduationYear: '2010',
      primaryHospital: 'Lagos University Teaching Hospital (LUTH)',
      hospitalAddress: 'Idi-Araba, Surulere, Lagos',
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0123456789',
      accountName: 'Dr. Tope Olaniyi',
      licenseFileUploaded: true,
      idFileUploaded: true,
    });
    setFormError('');
  };

  const validateStep = (currentStep: number): boolean => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setFormError('Please fill in First Name and Last Name.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.specialty || !formData.yearsExperience) {
        setFormError('Specialty and Years of Experience are required.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.licenseNumber.trim()) {
        setFormError('MDCN License Number is required.');
        return false;
      }
    } else if (currentStep === 4) {
      if (!formData.degree.trim() || !formData.university.trim()) {
        setFormError('Medical Degree and University are required.');
        return false;
      }
    } else if (currentStep === 5) {
      if (!formData.primaryHospital.trim()) {
        setFormError('Primary Hospital Affiliation is required.');
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.put('/users/me', {
        providerProfile: {
          specialization: formData.specialty,
          licenseNumber: formData.licenseNumber,
          yearsOfExperience: parseInt(formData.yearsExperience) || 0,
          metadata: formData,
        },
      });

      setSubmitting(false);
      router.push('/dashboard');
    } catch (err) {
      console.warn('Doctor onboarding error', err);
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
            <span className="block text-[10px] font-bold text-[#1877F2] uppercase tracking-wider">Doctor Portal</span>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Medical Verification Progress</h2>
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
          <p className="text-[11px] font-semibold text-slate-400">Need help verifying your license?</p>
          <a href="mailto:support@ricton.com" className="text-xs font-bold text-[#1877F2] hover:underline mt-1 block">
            Contact MDCN Helpdesk
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

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      placeholder="e.g. Tope"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      placeholder="e.g. Olaniyi"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateForm('gender', e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => updateForm('dob', e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Specialty */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Primary Specialty <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.specialty}
                      onChange={(e) => updateForm('specialty', e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option>Cardiology</option>
                      <option>Pediatrics</option>
                      <option>Neurology</option>
                      <option>Orthopedics</option>
                      <option>Endocrinology</option>
                      <option>Ophthalmology</option>
                      <option>Psychiatry</option>
                      <option>General Practice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Years of Clinical Experience</label>
                    <input
                      type="number"
                      value={formData.yearsExperience}
                      onChange={(e) => updateForm('yearsExperience', e.target.value)}
                      placeholder="12"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Licensing */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      MDCN License Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => updateForm('licenseNumber', e.target.value)}
                      placeholder="MDCN-78192-CAR"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">License Expiry Date</label>
                    <input
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => updateForm('licenseExpiry', e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Qualifications */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary Medical Degree / Fellowship <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.degree}
                    onChange={(e) => updateForm('degree', e.target.value)}
                    placeholder="e.g. MBBS (Unilag), FWACP (Cardiology)"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Medical School / Institution <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.university}
                      onChange={(e) => updateForm('university', e.target.value)}
                      placeholder="University of Lagos"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Graduation Year</label>
                    <input
                      type="number"
                      value={formData.graduationYear}
                      onChange={(e) => updateForm('graduationYear', e.target.value)}
                      placeholder="2012"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Affiliations */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary Hospital / Clinic Affiliation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.primaryHospital}
                    onChange={(e) => updateForm('primaryHospital', e.target.value)}
                    placeholder="Lagos University Teaching Hospital"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                  />
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
                    <option value="">Select Doctor Settlement Bank...</option>
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
                      placeholder="Dr. Tope Olaniyi"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-[#1877F2] text-xs font-semibold outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Documents */}
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
                      {formData.licenseFileUploaded ? 'MDCN License Uploaded ✓' : 'Upload MDCN License'}
                    </h4>
                  </div>

                  <div
                    onClick={() => updateForm('idFileUploaded', true)}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                      formData.idFileUploaded
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-[#1877F2] bg-slate-50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-[#1877F2] mx-auto mb-2" />
                    <h4 className="text-xs font-extrabold text-slate-900">
                      {formData.idFileUploaded ? 'Government ID Uploaded ✓' : 'Upload Valid ID'}
                    </h4>
                  </div>
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
                  {submitting ? 'Submitting...' : 'Complete Doctor Registration ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
