import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authService } from '@/features/auth/auth-service';
import type {
  MobileUser,
  OtpVerifyInput,
  RegisterInput,
  RegisterResult,
  SignInInput,
  SignInResult,
} from '@/features/auth/types';
import { apiClient, ApiClientError } from '@/lib/api/client';

type SessionStatus = 'booting' | 'authenticated' | 'unauthenticated' | 'unavailable';

interface SessionContextValue {
  status: SessionStatus;
  user: MobileUser | null;
  recoveryMessage: string | null;
  signIn(input: SignInInput): Promise<SignInResult>;
  signInWithProvider(
    provider: 'GOOGLE' | 'APPLE',
    idToken: string,
    totpCode?: string
  ): Promise<SignInResult>;
  verifyOtp(input: OtpVerifyInput): Promise<SignInResult>;
  register(input: RegisterInput): Promise<RegisterResult>;
  signOut(options?: { pushToken?: string }): Promise<void>;
  logoutAll(): Promise<void>;
  retryRestore(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>('booting');
  const [user, setUser] = useState<MobileUser | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const restore = useCallback(async () => {
    setStatus('booting');
    setRecoveryMessage(null);
    try {
      const restoredUser = await authService.restoreSession();
      setUser(restoredUser);
      setStatus(restoredUser ? 'authenticated' : 'unauthenticated');
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') {
        setRecoveryMessage(
          'We could not securely verify this session. Check your connection and try again.'
        );
        setStatus('unavailable');
        return;
      }
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    apiClient.setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => apiClient.setSessionExpiredHandler();
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    const result = await authService.signIn(input);
    if (result.kind === 'authenticated') {
      setUser(result.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const signInWithProvider = useCallback(
    async (provider: 'GOOGLE' | 'APPLE', idToken: string, totpCode?: string) => {
      const result = await authService.signInWithProvider(provider, idToken, totpCode);
      if (result.kind === 'authenticated') {
        setUser(result.user);
        setStatus('authenticated');
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async (options?: { pushToken?: string }) => {
    try {
      await authService.signOut(options);
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authService.register(input);
    if (result.kind === 'authenticated') {
      setUser(result.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const verifyOtp = useCallback(async (input: OtpVerifyInput) => {
    const result = await authService.verifyOtp(input);
    if (result.kind === 'authenticated') {
      setUser(result.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      recoveryMessage,
      signIn,
      signInWithProvider,
      register,
      verifyOtp,
      signOut,
      logoutAll,
      retryRestore: restore,
    }),
    [
      recoveryMessage,
      restore,
      signIn,
      signInWithProvider,
      register,
      verifyOtp,
      signOut,
      logoutAll,
      status,
      user,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider.');
  return context;
}
