'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useNotificationsState, useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Pill,
  ShieldAlert,
  CreditCard,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { NotificationItem } from '@/store/useAppStore';
import { NOTIFICATION_TARGETS, getNotificationTarget } from '@/lib/notification-targets';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications: storeNotifications,
    fetchNotifications,
    markNotificationRead,
  } = useNotificationsState();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchNotifications();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.success) {
        useAppStore.setState({
          notifications: storeNotifications.map((n) => ({ ...n, isRead: true })),
        });
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const handleMarkSingleRead = (id: string) => {
    markNotificationRead(id);
  };

  const handleDelete = async (id: string) => {
    const previous = storeNotifications;
    useAppStore.setState({
      notifications: previous.filter((n) => n.id !== id),
    });
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (!res.success) {
        useAppStore.setState({ notifications: previous });
      }
    } catch {
      useAppStore.setState({ notifications: previous });
    }
  };

  const filteredNotifications = storeNotifications.filter(
    (n) => filterType === 'ALL' || n.type === filterType
  );

  const openTarget = (notif: NotificationItem) => {
    const target = getNotificationTarget(notif.type);
    if (target && (NOTIFICATION_TARGETS as readonly string[]).includes(target)) {
      if (!notif.isRead) handleMarkSingleRead(notif.id);
      router.push(target);
    }
  };

  const getIcon = (type: string) => {
    const t = type?.toUpperCase() || '';
    if (t.includes('APPOINTMENT')) return <Calendar className="w-5 h-5 text-[#1877F2]" />;
    if (t.includes('PRESCRIPTION')) return <Pill className="w-5 h-5 text-emerald-600" />;
    if (t.includes('SECURITY')) return <ShieldAlert className="w-5 h-5 text-amber-600" />;
    if (t.includes('BILLING') || t.includes('PAYMENT') || t.includes('WALLET'))
      return <CreditCard className="w-5 h-5 text-purple-600" />;
    return <Bell className="w-5 h-5 text-[#1877F2]" />;
  };

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-[#1877F2]" /> Notifications & Activity Center
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Real-time clinical alerts, appointment reminders, prescription updates, and billing
              receipts
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

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              Loading notification stream...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No notifications in this category.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => {
                const target = getNotificationTarget(notif.type);
                return (
                  <div
                    key={notif.id}
                    className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                      notif.isRead
                        ? 'bg-slate-50/50 border-slate-100 opacity-85'
                        : 'bg-blue-50/40 border-blue-200 shadow-xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => target && openTarget(notif)}
                      disabled={!target}
                      aria-label={target ? `Open ${notif.title}` : undefined}
                      className={`flex items-start gap-4 text-left min-w-0 flex-1 ${
                        target ? 'cursor-pointer rounded-xl' : 'cursor-default'
                      }`}
                    >
                      <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-100 shrink-0">
                        {getIcon(notif.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">{notif.title}</h3>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#1877F2] animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                          {notif.body}
                        </p>
                        <span className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-2">
                          <span>
                            {new Date(notif.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {target && (
                            <span className="inline-flex items-center gap-1 text-[#1877F2]">
                              View <ArrowRight className="w-3 h-3" />
                            </span>
                          )}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkSingleRead(notif.id)}
                          title="Mark as read"
                          aria-label={`Mark as read: ${notif.title}`}
                          className="p-2 rounded-full hover:bg-slate-200/60 text-slate-500 transition-colors"
                        >
                          <Check className="w-4 h-4 text-[#1877F2]" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(notif.id)}
                        title="Dismiss"
                        aria-label={`Dismiss notification: ${notif.title}`}
                        className="p-2 rounded-full hover:bg-rose-100/60 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
