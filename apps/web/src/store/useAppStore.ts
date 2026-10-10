import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { api, setLastKnownUser } from '@/lib/api-client';

export type UserRole = 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';

export interface BankDetails {
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  settlementFrequency?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  bankDetails?: BankDetails;
  patientProfile?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  providerProfile?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    specialization?: string;
    bankDetails?: BankDetails;
  };
}

export interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  durationMinutes?: number;
}

export interface Prescription {
  id: string;
  patientName: string;
  doctor: string;
  medication: string;
  dosage: string;
  frequency: string;
  strength: string;
  form: string;
  quantity: number;
  date: string;
  status: 'Pending' | 'Delivered' | 'Filled';
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  channel?: string;
  isRead: boolean;
  createdAt: string;
}

interface AppState {
  user: UserProfile | null;
  appointments: Appointment[];
  prescriptions: Prescription[];
  notifications: NotificationItem[];
  walletBalance: number;
  walletStatus: 'idle' | 'loading' | 'ready' | 'error';
  walletError: string | null;
  rewardsPoints: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  restoreSession: () => Promise<boolean>;
  fetchUser: () => Promise<UserProfile | null>;
  updateUserOptimistic: (patch: Partial<UserProfile>) => void;
  fetchAppointments: () => Promise<void>;
  addAppointmentOptimistic: (appt: Appointment) => void;
  fetchPrescriptions: () => Promise<void>;
  addPrescriptionOptimistic: (rx: Prescription) => void;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  fetchWallet: () => Promise<void>;
  fetchRewards: () => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  user: null,
  appointments: [],
  prescriptions: [],
  notifications: [],
  walletBalance: 0,
  walletStatus: 'idle',
  walletError: null,
  rewardsPoints: 0,
  isLoading: false,
  error: null,

  setUser: (user) => {
    if (user) {
      const existing = get().user || ({} as UserProfile);
      const merged = { ...existing, ...user };
      set({ user: merged });
      // Remember the last successfully signed-in person (display info only)
      // so the login screen can prefill + greet them next visit.
      setLastKnownUser({
        email: merged.email,
        firstName:
          merged.firstName ?? merged.patientProfile?.firstName ?? merged.providerProfile?.firstName,
        lastName:
          merged.lastName ?? merged.patientProfile?.lastName ?? merged.providerProfile?.lastName,
        role: merged.role,
        avatarUrl: merged.avatarUrl,
      });
    } else {
      set({ user: null });
    }
  },

  updateUserOptimistic: (patch) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...patch } });
    }
  },

  restoreSession: async () => {
    const refreshed = await api.refreshAccessToken();
    if (!refreshed) return false;
    const user = await get().fetchUser();
    return Boolean(user);
  },

  fetchUser: async () => {
    try {
      const res = await api.get('/users/me');
      if (res.success && res.data) {
        const u = res.data as UserProfile;
        const existing = get().user;
        const merged: UserProfile = {
          ...u,
          avatarUrl:
            u.avatarUrl ||
            u.patientProfile?.avatarUrl ||
            u.providerProfile?.avatarUrl ||
            existing?.avatarUrl,
          firstName:
            u.firstName ||
            u.patientProfile?.firstName ||
            u.providerProfile?.firstName ||
            existing?.firstName,
          lastName:
            u.lastName ||
            u.patientProfile?.lastName ||
            u.providerProfile?.lastName ||
            existing?.lastName,
        };
        set({ user: merged });
        setLastKnownUser({
          email: merged.email,
          firstName: merged.firstName,
          lastName: merged.lastName,
          role: merged.role,
          avatarUrl: merged.avatarUrl,
        });
        return merged;
      }
    } catch (err: unknown) {
      console.warn('Failed fetching current user profile', err);
    }
    // No server user = no authenticated user. Returning the stale in-memory
    // user here used to paint dashboards as "Account"/"User" with no session.
    return null;
  },

  fetchAppointments: async () => {
    try {
      const res = await api.get<{ appointments: Appointment[] }>('/appointments');
      if (res.success && Array.isArray(res.data?.appointments)) {
        set({ appointments: res.data.appointments });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching appointments', err);
    }
  },

  addAppointmentOptimistic: (appt) => {
    set({ appointments: [appt, ...get().appointments] });
  },

  fetchPrescriptions: async () => {
    try {
      const res = await api.get<Prescription[]>('/prescriptions');
      const raw = res.success && Array.isArray(res.data) ? res.data : [];
      set({ prescriptions: raw });
    } catch (err: unknown) {
      console.warn('Failed fetching prescriptions', err);
    }
  },

  addPrescriptionOptimistic: (rx) => {
    set({ prescriptions: [rx, ...get().prescriptions] });
  },

  fetchNotifications: async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success && Array.isArray(res.data?.notifications)) {
        set({ notifications: res.data.notifications });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching notifications', err);
    }
  },

  markNotificationRead: async (id: string) => {
    // Optimistic UI update with rollback: the api client returns an
    // envelope (no throw) on HTTP errors, so !success must restore the
    // snapshot or the UI lies about server state.
    const snapshot = get().notifications;
    set({
      notifications: snapshot.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    });
    try {
      const res = await api.patch(`/notifications/${id}/read`, {});
      if (!res.success) {
        set({ notifications: snapshot });
        console.warn('Failed to mark notification read', res.error?.message);
      }
    } catch (err) {
      set({ notifications: snapshot });
      console.warn('Failed to mark notification read', err);
    }
  },

  fetchWallet: async () => {
    set({ walletStatus: 'loading', walletError: null });
    try {
      const res = await api.get<{ balance: number }>('/wallets/me');
      if (res.success && res.data?.balance !== undefined) {
        set({ walletBalance: res.data.balance, walletStatus: 'ready', walletError: null });
      } else {
        set({
          walletStatus: 'error',
          walletError: res.error?.message || 'Wallet balance could not be loaded',
        });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching wallet balance', err);
      set({
        walletStatus: 'error',
        walletError: err instanceof Error ? err.message : 'Wallet balance could not be loaded',
      });
    }
  },

  fetchRewards: async () => {
    try {
      const res = await api.get('/rewards/balance');
      if (res.success && res.data?.balance !== undefined) {
        set({ rewardsPoints: res.data.balance });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching rewards balance', err);
    }
  },

  logout: () => {
    api.logout();
    set({
      user: null,
      appointments: [],
      prescriptions: [],
      notifications: [],
      walletBalance: 0,
      walletStatus: 'idle',
      walletError: null,
      rewardsPoints: 0,
    });
  },
}));

// Granular Atomic Selectors (Re-render Optimization Custom Hooks)
export const useCurrentUser = () => useAppStore((state) => state.user);
export const useWalletState = () =>
  useAppStore(
    useShallow((state) => ({
      walletBalance: state.walletBalance,
      walletStatus: state.walletStatus,
      walletError: state.walletError,
      rewardsPoints: state.rewardsPoints,
      fetchWallet: state.fetchWallet,
      fetchRewards: state.fetchRewards,
    }))
  );
export const useNotificationsState = () =>
  useAppStore(
    useShallow((state) => ({
      notifications: state.notifications,
      unreadCount: state.notifications.filter((n) => !n.isRead).length,
      fetchNotifications: state.fetchNotifications,
      markNotificationRead: state.markNotificationRead,
    }))
  );
export const useAppointmentsState = () =>
  useAppStore(
    useShallow((state) => ({
      appointments: state.appointments,
      fetchAppointments: state.fetchAppointments,
      addAppointmentOptimistic: state.addAppointmentOptimistic,
    }))
  );
export const usePrescriptionsState = () =>
  useAppStore(
    useShallow((state) => ({
      prescriptions: state.prescriptions,
      fetchPrescriptions: state.fetchPrescriptions,
      addPrescriptionOptimistic: state.addPrescriptionOptimistic,
    }))
  );
export const useAuthActions = () =>
  useAppStore(
    useShallow((state) => ({
      setUser: state.setUser,
      restoreSession: state.restoreSession,
      fetchUser: state.fetchUser,
      updateUserOptimistic: state.updateUserOptimistic,
      logout: state.logout,
    }))
  );
