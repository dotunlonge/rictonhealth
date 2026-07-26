'use client';

import { useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

export default function AppointmentsPage() {
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [statusFilter, setStatusFilter] = useState('Pending');

  const morningSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM'];
  const eveningSlots = ['7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM', '12:00 AM', '1:00 AM'];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Top Calendar & Slots Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Selector Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">July 2025</span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 p-1 rounded-xl">
                <button className="px-2.5 py-1 rounded-lg">Day</button>
                <button className="px-2.5 py-1 rounded-lg">Week</button>
                <button className="px-2.5 py-1 bg-[#1877F2] text-white rounded-lg font-bold">Month</button>
                <button className="px-2.5 py-1 rounded-lg">Year</button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 gap-1">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thur</span><span>Fri</span><span>Sat</span>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-700 gap-y-3">
              <span className="text-slate-300">30</span><span className="text-slate-300">31</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span>
              <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span>
              <span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span>
              <span className="bg-[#1877F2] text-white rounded-full py-1.5 shadow-sm">27</span><span>28</span><span>29</span><span>30</span><span>31</span>
            </div>
          </div>

          {/* Time Slot Picker Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-900 uppercase">Morning (9:00 AM to 12:00 PM)</span>
                <span className="text-[10px] font-bold text-[#1877F2] cursor-pointer">+ Add slot</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {morningSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedSlot === slot
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-900 uppercase">Evening (7:00 PM to 1:00 AM)</span>
                <span className="text-[10px] font-bold text-[#1877F2] cursor-pointer">+ Add slot</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {eveningSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedSlot === slot
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Badges Bar */}
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 bg-[#1EBA28] text-white font-extrabold text-xs rounded-full flex items-center gap-2 shadow-xs">
            <span>Booked</span> <span className="bg-white text-[#1EBA28] rounded-full w-5 h-5 flex items-center justify-center text-[10px]">12</span>
          </div>
          <div className="px-6 py-3 bg-[#FFC107] text-white font-extrabold text-xs rounded-full flex items-center gap-2 shadow-xs">
            <span>Pending</span> <span className="bg-white text-[#FFC107] rounded-full w-5 h-5 flex items-center justify-center text-[10px]">12</span>
          </div>
          <div className="px-6 py-3 bg-[#D32F2F] text-white font-extrabold text-xs rounded-full flex items-center gap-2 shadow-xs">
            <span>Cancelled</span> <span className="bg-white text-[#D32F2F] rounded-full w-5 h-5 flex items-center justify-center text-[10px]">12</span>
          </div>
        </div>

        {/* Appointments Data Table Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Appointments List</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[#1877F2] text-white rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="Pending">Pending</option>
              <option value="Booked">Booked</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Date/Time</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {[1, 2, 3, 4].map((row) => (
                  <tr key={row} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 font-bold text-slate-700">{statusFilter}</td>
                    <td className="py-4 font-bold text-slate-900">John Doe</td>
                    <td className="py-4 text-slate-500">July 20th 9:00 AM</td>
                    <td className="py-4 font-medium text-slate-700">New Patient</td>
                    <td className="py-4 text-slate-500">Doe@gmail.com</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
