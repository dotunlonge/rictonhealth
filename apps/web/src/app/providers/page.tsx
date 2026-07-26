'use client';

import SidebarLayout from '@/components/layout/SidebarLayout';

export default function ProvidersPage() {
  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Doctor Header Profile Banner */}
        <div className="bg-white rounded-3xl p-8 shadow-xs border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-[#1877F2] overflow-hidden flex items-center justify-center font-bold text-3xl text-slate-500">
              👩‍⚕️
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Dr. Tope Olaniyi</h1>
              <p className="text-sm font-semibold text-slate-500 mt-1">Cardiology • On-duty</p>
              <div className="flex items-center gap-3 mt-4">
                <button className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs transition-colors">
                  Call
                </button>
                <button className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs transition-colors">
                  Message
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-xl">
              ⭐ <span>4.5</span> <span className="text-xs text-slate-400 font-medium">Rating</span>
            </div>
            <button className="px-6 py-2 border border-slate-300 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50">
              Edit
            </button>
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Details (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shift Hours Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 grid grid-cols-2 gap-6 items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-2xl font-bold">
                  🕒
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Morning</p>
                  <p className="text-xl font-black text-slate-900">9 AM - 3 PM</p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Evening</p>
                  <p className="text-xl font-black text-slate-900">7 PM - 11 PM</p>
                </div>
              </div>
            </div>

            {/* About / Description / Education Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xs border border-slate-200/60 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Description</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dr. Tope Olaniyi is a consultant cardiologist with over 12 years of clinical experience in interventional cardiology and cardiovascular risk assessment. Dedicated to providing patient-centered care and evidence-based treatments.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Education</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  MBBS - University of Lagos | Fellowship in Cardiology - Royal College of Physicians
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Experience</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  • Senior Consultant Cardiologist at National Hospital (2018 - Present)<br />
                  • Clinical Specialist in Emergency Cardiovascular Care (2014 - 2018)
                </p>
              </div>
            </div>

            {/* Patient Reviews Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xs border border-slate-200/60 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Patients Reviews</h3>
              {[1, 2].map((idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Emma Willson</span>
                    <span className="text-amber-400 text-xs">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Extremely attentive and thorough consultation. Explained the diagnosis clearly and prescribed effective medication.
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Today's Appointment Schedule */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Today Appointment</h4>
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-b border-slate-100 pb-3">
              <span>‹</span>
              <span>27 Jul - 02 Aug</span>
              <span>›</span>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((slot) => (
                <div key={slot} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 bg-[#1877F2] text-white rounded-full text-[9px] font-bold">
                      9:00 AM - 10:00 AM
                    </span>
                    <p className="font-bold text-xs text-slate-900 mt-1">Emma Wilson</p>
                    <p className="text-[10px] text-slate-500">Vomiting</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                    Booked
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
