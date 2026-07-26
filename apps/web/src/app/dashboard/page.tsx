'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    patients: 187,
    doctors: 89,
    appointments: 375,
  });
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const res = await api.get('/appointments');
      if (res.success && res.data) {
        setAppointments(Array.isArray(res.data) ? res.data : res.data.appointments || []);
      }
    }
    loadData();
  }, []);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Top 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-2xl font-bold">
              👥
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{stats.patients}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-2xl font-bold">
              🩺
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{stats.doctors}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-2xl font-bold">
              📅
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointment</p>
              <h3 className="text-3xl font-black text-slate-900 mt-0.5">{stats.appointments}</h3>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Analytics & Right Calendar/Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Overview Bar Chart Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Patient Overview</h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-1">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/> Child</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/> Adult</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"/> Elderly</span>
                  </div>
                </div>
                <select className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none">
                  <option>Day</option>
                  <option>Week</option>
                  <option>Month</option>
                </select>
              </div>

              {/* Bar Chart Mock Visual */}
              <div className="h-44 flex items-end justify-between px-4 pt-6 pb-2 border-b border-slate-100">
                {[
                  { date: '4 Jul', c: 40, a: 80, e: 20 },
                  { date: '5 Jul', c: 60, a: 110, e: 30 },
                  { date: '6 Jul', c: 70, a: 50, e: 95 },
                  { date: '7 Jul', c: 50, a: 30, e: 115 },
                  { date: '8 Jul', c: 130, a: 85, e: 15 },
                  { date: '9 Jul', c: 65, a: 45, e: 10 },
                  { date: '10 Jul', c: 50, a: 110, e: 40 },
                ].map((bar, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1.5 h-32">
                      <div style={{ height: `${bar.c}%` }} className="w-2.5 bg-emerald-500 rounded-t-sm" />
                      <div style={{ height: `${bar.a}%` }} className="w-2.5 bg-amber-400 rounded-t-sm" />
                      <div style={{ height: `${bar.e}%` }} className="w-2.5 bg-red-500 rounded-t-sm" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{bar.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Monthly Bar Chart Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Revenue</h3>
                <select className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none">
                  <option>Month</option>
                  <option>Year</option>
                </select>
              </div>

              {/* Monthly Revenue Bars */}
              <div className="h-40 flex items-end justify-between px-6 pt-4 pb-2 border-b border-slate-100">
                {[
                  { m: 'Jan', val: 75 },
                  { m: 'Feb', val: 40 },
                  { m: 'March', val: 95 },
                  { m: 'April', val: 80 },
                  { m: 'May', val: 65 },
                  { m: 'June', val: 95 },
                  { m: 'July', val: 85 },
                  { m: 'Aug', val: 50 },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div style={{ height: `${item.val}%` }} className="w-8 bg-[#1877F2] rounded-t-md" />
                    <span className="text-[10px] text-slate-500 font-medium">{item.m}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Summary Earnings */}
              <div className="flex items-center gap-8 pt-2">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  🪙
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Weekly Earning</p>
                  <p className="text-xl font-extrabold text-slate-900">₦3,700</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Earning</p>
                  <p className="text-xl font-extrabold text-slate-900">₦35,000</p>
                </div>
              </div>
            </div>

            {/* Patient Appointment Table Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Patient Appointment</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Doctor</th>
                      <th className="pb-3">Treatment</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(appointments.length > 0
                      ? appointments
                      : [
                          { id: '1', patient: 'Ade Oyeyipo', date: 'July 19th', doctor: 'Dr. Peter Lawal', treatment: 'Cardiac Consultation', status: 'Confirmed' },
                          { id: '2', patient: 'Ade Oyeyipo', date: 'July 19th', doctor: 'Dr. Peter Lawal', treatment: 'Cardiac Consultation', status: 'Confirmed' },
                          { id: '3', patient: 'Ade Oyeyipo', date: 'July 19th', doctor: 'Dr. Peter Lawal', treatment: 'Cardiac Consultation', status: 'Confirmed' },
                        ]
                    ).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900">{row.patient || row.patientName || 'Ade Oyeyipo'}</td>
                        <td className="py-3.5 text-slate-500">{row.date || 'July 19th 9:00 AM'}</td>
                        <td className="py-3.5 font-medium">{row.doctor || row.doctorName || 'Dr. Peter Lawal'}</td>
                        <td className="py-3.5 text-slate-600">{row.treatment || 'General Checkup'}</td>
                        <td className="py-3.5">
                          <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                            {row.status || 'Confirmed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col) Widgets */}
          <div className="space-y-6">
            {/* Calendar Widget Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <button className="text-slate-400 hover:text-slate-600 font-bold">‹</button>
                <span className="font-bold text-sm text-slate-900">July 2025</span>
                <button className="text-slate-400 hover:text-slate-600 font-bold">›</button>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 gap-1">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thur</span><span>Fri</span><span>Sat</span>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-700 gap-y-2">
                <span className="text-slate-300">30</span><span className="text-slate-300">31</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span>
                <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span>
                <span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span>
                <span className="bg-[#1877F2] text-white rounded-full py-1">27</span><span>28</span><span>29</span><span>30</span><span>31</span>
              </div>
            </div>

            {/* New Appointment Widget */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">New appointment</h4>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                    🩺
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">Heart Surgeon</p>
                    <p className="text-[10px] text-slate-500">10 AM - 12 AM • Dr. Salako Wale</p>
                  </div>
                </div>
                <span className="text-slate-400 font-bold">›</span>
              </div>
            </div>

            {/* Complete Profile Gauge */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Complete Profile</h4>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-[#1877F2] flex items-center justify-center font-extrabold text-slate-900 text-sm">
                  35%
                </div>
                <div className="space-y-1 text-[11px] font-semibold text-slate-600">
                  <p className="flex items-center gap-2">Setup account <span className="w-3 h-1.5 bg-red-500 rounded-full" /></p>
                  <p className="flex items-center gap-2">Upload profile <span className="w-3 h-1.5 bg-amber-400 rounded-full" /></p>
                  <p className="flex items-center gap-2">Personal info <span className="w-3 h-1.5 bg-red-500 rounded-full" /></p>
                </div>
              </div>
            </div>

            {/* Doctors Schedule */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Doctors Schedule</h4>
              {[
                { name: 'Dr. Salako Wale', spec: 'Heart Surgeon', status: 'Available', green: true },
                { name: 'Dr. Salako Wale', spec: 'Heart Surgeon', status: 'Available', green: true },
                { name: 'Dr. Salako Wale', spec: 'Heart Surgeon', status: 'Unavailable', green: false },
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
                  <div>
                    <p className="font-bold text-xs text-slate-900">{doc.spec}</p>
                    <p className="text-[10px] text-slate-500">10 AM - 12 AM • {doc.name}</p>
                  </div>
                  <span
                    className={`px-3 py-1 text-[10px] font-bold rounded-full ${
                      doc.green ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {doc.status}
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
