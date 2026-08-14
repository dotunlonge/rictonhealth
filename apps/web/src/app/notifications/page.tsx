'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import { Bell, Check, CheckCheck, Trash2, Calendar, Pill, ShieldAlert, CreditCard, Filter } from 'lucide-react';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'APPOINTMENT' | 'PRESCRIPTION' | 'SECURITY' | 'BILLING' | 'GENERAL';
  isRead: boolean;
  date: string;
}

export default function NotificationsPage() {
  const { notifications: storeNotifications, fetchNotifications } = useAppStore();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true);
      await fetchNotifications();
      const res = await api.get('/notifications');
      if (res.success && Array.isArray(res.data)) {
        setNotifications(
          res.data.map((n: any, idx: number) => ({
            id: n.id || `NOTIF-${idx + 1}`,
            title: n.title || 'Health Alert Notification',
            message: n.message || n.content || 'You have a new update regarding your healthcare consultation.',
            type: n.type || 'APPOINTMENT',
            isRead: Boolean(n.isRead),
            date: new Date(n.createdAt || Date.now()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          }))
        );
      } else {
        // High quality fallback notifications
        setNotifications([
          {
            id: 'NOTIF-1',
            title: 'Upcoming Video Telemedicine Call',
            message: 'Your consultation with Dr. Oluwaseun Davies is scheduled today at 4:00 PM.',
            type: 'APPOINTMENT',
            isRead: false,
            date: 'Today, 2:15 PM',
          },
          {
            id: 'NOTIF-2',
            title: 'Prescription Order Dispatched #RX-101',
            message: 'Amoxicillin Trihydrate refill is en route for home delivery.',
            type: 'PRESCRIPTION',
            isRead: false,
            date: 'Yesterday, 10:45 AM',
          },
          {
            id: 'NOTIF-3',
            title: 'Wallet Deposit Confirmed',
            message: '₦10,000 top up received via GTBank online transfer.',
            type: 'BILLING',
            isRead: true,
            date: 'Aug 10, 2026',
          },
          {
            id: 'NOTIF-4',
            title: 'Security Alert: New Login Device',
            message: 'Your account was accessed from macOS Safari (Lagos, Nigeria).',
            type: 'SECURITY',
            isRead: true,
            date: 'Aug 8, 2026',
          },
        ]);
      }
      setLoading(false);
    }
    loadNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.post('/notifications/mark-read', { all: true });
  };

  const handleMarkSingleRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await api.patch(`/notifications/${id}`, { isRead: true });
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredNotifications = notifications.filter(
    (n) => filterType === 'ALL' || n.type === filterType
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="w-5 h-5 text-[#1877F2]" />;
      case 'PRESCRIPTION':
        return <Pill className="w-5 h-5 text-emerald-600" />;
      case 'SECURITY':
        return <ShieldAlert className="w-5 h-5 text-amber-600" />;
      case 'BILLING':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-[#1877F2]" />;
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-[#1877F2]" /> Notifications & Activity Center
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Real-time clinical alerts, appointment reminders, prescription updates, and billing receipts
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-5 py-2 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap border-b border-slate-200 pb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 mr-2">Category Filter:</span>
          {[
            { id: 'ALL', label: 'All Notifications' },
            { id: 'APPOINTMENT', label: 'Consultations' },
            { id: 'PRESCRIPTION', label: 'Prescriptions' },
            { id: 'BILLING', label: 'Billing & Wallet' },
            { id: 'SECURITY', label: 'Security' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterType(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterType === cat.id
                  ? 'bg-[#1877F2] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notifications List Container */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading notification stream...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">No notifications in this category.</div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    notif.isRead
                      ? 'bg-slate-50/50 border-slate-100 opacity-85'
                      : 'bg-blue-50/40 border-blue-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-100 shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">{notif.title}</h3>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#1877F2] animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] font-semibold text-slate-400 mt-2 block">{notif.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkSingleRead(notif.id)}
                        title="Mark as read"
                        className="p-2 rounded-full hover:bg-slate-200/60 text-slate-500 transition-colors"
                      >
                        <Check className="w-4 h-4 text-[#1877F2]" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(notif.id)}
                      title="Dismiss"
                      className="p-2 rounded-full hover:bg-rose-100/60 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
