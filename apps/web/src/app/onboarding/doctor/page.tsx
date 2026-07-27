'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function DoctorOnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    specialty: 'Cardiology',
    licenseNumber: '',
    yearsExperience: '5',
    consultationFee: '15000',
    bio: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 7) {
      setStep((prev) => prev + 1);
    } else {
      setSubmitting(true);
      const res = await api.put('/users/me', {
        providerProfile: {
          specialty: formData.specialty,
          licenseNumber: formData.licenseNumber,
          yearsExperience: parseInt(formData.yearsExperience, 10),
          consultationFee: parseFloat(formData.consultationFee),
          bio: formData.bio,
          onboardingStep: 7,
        },
      });
      setSubmitting(false);

      if (res.success) {
        window.location.href = '/dashboard';
      } else {
        alert(res.error?.message || 'Onboarding update failed.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EEF9] flex flex-col justify-between p-6">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-lg">
            💙
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Ricton Consultant Onboarding</span>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200">
          Step {step} of 7
        </span>
      </header>

      {/* Main Onboarding Card */}
      <main className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-8 shadow-md border border-slate-200/80 my-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Doctor Credentials Verification</h1>
          <p className="text-xs text-slate-500 mt-1">Please provide your medical practicing license and specialty information</p>
        </div>

        <form onSubmit={handleNext} className="space-y-4">
          {step === 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700">Primary Specialty</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Neurology">Neurology</option>
              </select>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-xs font-bold text-slate-700">Medical Council License Number</label>
              <input
                type="text"
                required
                placeholder="MDCN/REG/2026/8942"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="block text-xs font-bold text-slate-700">Years of Clinical Experience</label>
              <input
                type="number"
                required
                value={formData.yearsExperience}
                onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
              />
            </div>
          )}

          {step >= 4 && (
            <div>
              <label className="block text-xs font-bold text-slate-700">Consultation Fee (NGN)</label>
              <input
                type="number"
                required
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="px-6 py-3 border border-slate-300 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : step === 7 ? 'Complete Onboarding' : 'Continue Step →'}
            </button>
          </div>
        </form>
      </main>

      <footer className="text-center text-xs text-slate-400">
        © 2026 Ricton Healthcare Platform
      </footer>
    </div>
  );
}
