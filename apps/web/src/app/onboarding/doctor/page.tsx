'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Basic details and profile photo' },
  { id: 2, title: 'Professional Details', description: 'Specialty and experience' },
  { id: 3, title: 'Licensing', description: 'Medical credentials' },
  { id: 4, title: 'Education', description: 'Qualifications and degrees' },
  { id: 5, title: 'Affiliations', description: 'Hospital and clinic ties' },
  { id: 6, title: 'Billing', description: 'Bank and payout details' },
  { id: 7, title: 'Verification', description: 'Document uploads' },
];

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    nationality: '',
    // Step 2
    specialty: '',
    subSpecialty: '',
    yearsExperience: '',
    // Step 3
    licenseNumber: '',
    licenseExpiry: '',
    // Step 4
    degree: '',
    university: '',
    graduationYear: '',
    // Step 5
    primaryHospital: '',
    hospitalAddress: '',
    // Step 6
    bankName: '',
    accountNumber: '',
    // Step 7
    idFile: null as File | null,
    licenseFile: null as File | null,
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 7));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    
    // In a real implementation we would hit an endpoint specifically for provider onboarding
    // For now we map it to user profile update
    const res = await api.put('/users/me', {
      consultantProfile: {
        specialization: formData.specialty,
        licenseNumber: formData.licenseNumber,
        yearsOfExperience: parseInt(formData.yearsExperience) || 0,
        metadata: formData,
      },
    });
    setSubmitting(false);

    if (res.success) {
      router.push('/dashboard/provider');
    } else {
      alert(res.error?.message || 'Provider onboarding failed.');
    }
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

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      placeholder="e.g. John"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      placeholder="e.g. Doe"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateForm('gender', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => updateForm('dob', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => updateForm('nationality', e.target.value)}
                    placeholder="e.g. Nigerian"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Professional Details */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Specialty</label>
                  <select
                    value={formData.specialty}
                    onChange={(e) => updateForm('specialty', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                  >
                    <option value="">Select a specialty...</option>
                    <option>General Practice</option>
                    <option>Cardiology</option>
                    <option>Pediatrics</option>
                    <option>Neurology</option>
                    <option>Orthopedics</option>
                    <option>Psychiatry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Sub-Specialty (Optional)</label>
                  <input
                    type="text"
                    value={formData.subSpecialty}
                    onChange={(e) => updateForm('subSpecialty', e.target.value)}
                    placeholder="e.g. Pediatric Cardiology"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => updateForm('yearsExperience', e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Licensing */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Medical License Number (e.g. MDCN)</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => updateForm('licenseNumber', e.target.value)}
                    placeholder="Enter your license number"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">License Expiry Date</label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => updateForm('licenseExpiry', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Education */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Medical Degree</label>
                  <input
                    type="text"
                    value={formData.degree}
                    onChange={(e) => updateForm('degree', e.target.value)}
                    placeholder="e.g. MBBS, MD"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">University / Institution</label>
                  <input
                    type="text"
                    value={formData.university}
                    onChange={(e) => updateForm('university', e.target.value)}
                    placeholder="e.g. University of Lagos"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Graduation Year</label>
                  <input
                    type="number"
                    value={formData.graduationYear}
                    onChange={(e) => updateForm('graduationYear', e.target.value)}
                    placeholder="e.g. 2015"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Affiliations */}
            {step === 5 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Hospital / Clinic Affiliation</label>
                  <input
                    type="text"
                    value={formData.primaryHospital}
                    onChange={(e) => updateForm('primaryHospital', e.target.value)}
                    placeholder="e.g. St. Jude Hospital"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital Address</label>
                  <input
                    type="text"
                    value={formData.hospitalAddress}
                    onChange={(e) => updateForm('hospitalAddress', e.target.value)}
                    placeholder="Full address of the hospital"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Number (For Telemedicine payouts)</label>
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
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-2 text-[#1877F2]">
                  🩺
                </div>
                <h3 className="text-lg font-bold text-slate-900">Upload Credentials</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Please upload your medical license and a valid government ID.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-slate-50 hover:border-[#1877F2] transition-colors cursor-pointer group">
                    <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">📄</span>
                    <span className="text-xs font-semibold text-[#1877F2]">Upload Medical License</span>
                  </div>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-slate-50 hover:border-[#1877F2] transition-colors cursor-pointer group">
                    <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🪪</span>
                    <span className="text-xs font-semibold text-[#1877F2]">Upload Valid ID</span>
                  </div>
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
                {submitting ? 'Submitting...' : 'Complete Profile ✓'}
              </button>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
