'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const STEPS = [
  { id: 1, title: 'Basic Information', description: 'Hospital name and core details' },
  { id: 2, title: 'Contact Details', description: 'Where patients can find you' },
  { id: 3, title: 'Facilities', description: 'Beds, ICUs, and infrastructure' },
  { id: 4, title: 'Departments', description: 'Specialties and services offered' },
  { id: 5, title: 'Administration', description: 'Medical director details' },
  { id: 6, title: 'Billing Info', description: 'Bank and payout details' },
  { id: 7, title: 'Verification', description: 'Upload licenses and documents' },
];

export default function HospitalOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1
    hospitalName: '',
    registrationNumber: '',
    hospitalType: 'General',
    // Step 2
    address: '',
    city: '',
    state: '',
    supportEmail: '',
    supportPhone: '',
    // Step 3
    totalBeds: '',
    icuBeds: '',
    operatingRooms: '',
    // Step 4
    departments: [] as string[],
    // Step 5
    adminName: '',
    adminPhone: '',
    // Step 6
    bankName: '',
    accountNumber: '',
    // Step 7
    licenseFile: null as File | null,
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 7));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    // In a real app, we'd upload the file first if exists, then save profile
    const res = await api.put('/users/me', {
      hospitalAdminProfile: {
        hospitalName: formData.hospitalName,
        address: formData.address,
        license: formData.registrationNumber,
        // We can pass other fields if the backend schema supports them
        metadata: formData, 
      },
    });
    setSubmitting(false);

    if (res.success) {
      router.push('/dashboard/hospital');
    } else {
      alert(res.error?.message || 'Hospital onboarding failed.');
    }
  };

  const toggleDepartment = (dept: string) => {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased">
      {/* Sidebar Progress */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden md:flex flex-col p-8">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm shadow-md">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Ricton</span>
        </div>

        <div className="flex-1">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Onboarding Progress</h2>
          <div className="space-y-6">
            {STEPS.map((s) => {
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <div key={s.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/20'
                          : isPast
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPast ? '✓' : s.id}
                    </div>
                    {s.id !== 7 && (
                      <div className={`w-0.5 h-full mt-2 transition-colors ${isPast ? 'bg-green-100' : 'bg-slate-100'}`} />
                    )}
                  </div>
                  <div className="pb-4 pt-1">
                    <h3 className={`text-sm font-bold ${isActive ? 'text-slate-900' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                      {s.title}
                    </h3>
                    <p className={`text-xs mt-1 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">Need help? Contact support@ricton.com</div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 max-w-2xl mx-auto w-full p-8 md:p-12 flex flex-col justify-center">
          
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            {/* Form Headers */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">{STEPS[step - 1].title}</h1>
              <p className="text-sm text-slate-500 mt-1">{STEPS[step - 1].description}</p>
            </div>

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital Name</label>
                  <input
                    type="text"
                    value={formData.hospitalName}
                    onChange={(e) => updateForm('hospitalName', e.target.value)}
                    placeholder="e.g. Ricton General Hospital"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Registration Number</label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => updateForm('registrationNumber', e.target.value)}
                      placeholder="e.g. HEFAMAA/1234"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital Type</label>
                    <select
                      value={formData.hospitalType}
                      onChange={(e) => updateForm('hospitalType', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                    >
                      <option>General</option>
                      <option>Specialist</option>
                      <option>Clinic</option>
                      <option>Teaching Hospital</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Street address"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="Lagos"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => updateForm('state', e.target.value)}
                      placeholder="Lagos State"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Support Email</label>
                    <input
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => updateForm('supportEmail', e.target.value)}
                      placeholder="support@hospital.com"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Support Phone</label>
                    <input
                      type="tel"
                      value={formData.supportPhone}
                      onChange={(e) => updateForm('supportPhone', e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Facilities */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Total Beds</label>
                    <input
                      type="number"
                      value={formData.totalBeds}
                      onChange={(e) => updateForm('totalBeds', e.target.value)}
                      placeholder="50"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ICU Beds</label>
                    <input
                      type="number"
                      value={formData.icuBeds}
                      onChange={(e) => updateForm('icuBeds', e.target.value)}
                      placeholder="5"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Operating Rooms</label>
                    <input
                      type="number"
                      value={formData.operatingRooms}
                      onChange={(e) => updateForm('operatingRooms', e.target.value)}
                      placeholder="2"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-[#1877F2]/5 border border-[#1877F2]/20 text-sm text-[#1877F2] font-medium flex gap-3">
                  <span className="text-xl">ℹ️</span>
                  <span>This information helps us route emergency telemedicine requests appropriately based on your capacity.</span>
                </div>
              </div>
            )}

            {/* Step 4: Departments */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="block text-xs font-bold text-slate-700 mb-3">Select available specialties</label>
                <div className="flex flex-wrap gap-2">
                  {['Cardiology', 'Pediatrics', 'Neurology', 'Orthopedics', 'Gynecology', 'Oncology', 'Dermatology', 'Psychiatry', 'Urology', 'Radiology', 'Emergency'].map((dept) => {
                    const isSelected = formData.departments.includes(dept);
                    return (
                      <button
                        key={dept}
                        onClick={() => toggleDepartment(dept)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                          isSelected 
                            ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-md shadow-blue-500/20' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {dept}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Administration */}
            {step === 5 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Medical Director Name</label>
                  <input
                    type="text"
                    value={formData.adminName}
                    onChange={(e) => updateForm('adminName', e.target.value)}
                    placeholder="Dr. John Doe"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Director Phone Number</label>
                  <input
                    type="tel"
                    value={formData.adminPhone}
                    onChange={(e) => updateForm('adminPhone', e.target.value)}
                    placeholder="+234..."
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Billing Info */}
            {step === 6 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name</label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => updateForm('bankName', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                  >
                    <option value="">Select a Bank...</option>
                    <option>Guaranty Trust Bank</option>
                    <option>Access Bank</option>
                    <option>Zenith Bank</option>
                    <option>United Bank for Africa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => updateForm('accountNumber', e.target.value)}
                    placeholder="0000000000"
                    maxLength={10}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 7: Verification */}
            {step === 7 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-6">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 text-[#1877F2]">
                  📄
                </div>
                <h3 className="text-lg font-bold text-slate-900">Upload operating license</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Please upload a scanned copy of your state health board operating license to complete verification.
                </p>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-slate-50 hover:border-[#1877F2] transition-colors cursor-pointer group">
                  <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">⬆️</span>
                  <span className="text-sm font-semibold text-[#1877F2]">Click to upload</span>
                  <span className="text-xs text-slate-400 block mt-1">PDF, JPG or PNG (Max 5MB)</span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handlePrev}
              disabled={step === 1 || submitting}
              className={`px-6 py-3 rounded-full font-bold text-sm transition-colors ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ← Back
            </button>
            
            {step < 7 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-full font-bold text-sm bg-[#1877F2] hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 rounded-full font-bold text-sm bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Complete Registration ✓'}
              </button>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
