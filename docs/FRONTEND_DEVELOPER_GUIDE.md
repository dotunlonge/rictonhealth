# Frontend Developer Guide

> This guide is for web developers (React, Next.js, Vue, etc.) building against the Ricton API.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication & Session Management](#authentication--session-management)
3. [HTTP Client Setup](#http-client-setup)
4. [Error Handling Strategy](#error-handling-strategy)
5. [Response Envelope](#response-envelope)
6. [Pagination](#pagination)
7. [File Uploads](#file-uploads)
8. [Real-time Features](#real-time-features)
9. [Caching Strategies](#caching-strategies)
10. [Webhooks](#webhooks)
11. [Role-Based UI](#role-based-ui)
12. [Common Patterns](#common-patterns)

---

## Quick Start

```bash
# Install HTTP client (if using axios)
npm install axios

# Or use native fetch (recommended for Next.js/React 18+)
```

### Minimal API Client

```typescript
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.error.code, error.error.message, response.status);
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## Authentication & Session Management

### Token Lifecycle

| Token         | Lifetime   | Storage                                            | Usage                |
| ------------- | ---------- | -------------------------------------------------- | -------------------- |
| Access Token  | 15 minutes | Memory (React state/Zustand)                       | Authorization header |
| Refresh Token | 7 days     | HttpOnly cookie (preferred) or Secure localStorage | `/api/auth/refresh`  |

### Recommended Auth Flow

```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

interface Session {
  user: UserProfile;
  accessToken: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Silent refresh on app load
  useEffect(() => {
    async function hydrate() {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await api<AuthResponse>('/api/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });

        setSession({
          user: data.user,
          accessToken: data.token,
        });
      } catch (e) {
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    }

    hydrate();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('refresh_token', data.refreshToken);
    setSession({
      user: data.user,
      accessToken: data.token,
    });
    return data;
  };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('refresh_token');
    setSession(null);
  };

  return { session, loading, login, logout };
}
```

### Axios Interceptor Pattern

```typescript
// lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });

        localStorage.setItem('access_token', data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (refreshError) {
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## HTTP Client Setup

### Next.js App Router Example

```typescript
// app/providers.tsx
'use client';

import { SessionProvider } from '@/context/session';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### TanStack Query (React Query) Setup

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error) => {
        if (error.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});
```

---

## Error Handling Strategy

### Error Codes Reference

| Code               | HTTP Status | Meaning            | Action                              |
| ------------------ | ----------- | ------------------ | ----------------------------------- |
| `VALIDATION_ERROR` | 400         | Invalid input      | Show field errors from `details`    |
| `UNAUTHORIZED`     | 401         | No/invalid token   | Redirect to login                   |
| `FORBIDDEN`        | 403         | Insufficient role  | Show "access denied"                |
| `NOT_FOUND`        | 404         | Resource missing   | Show "not found" state              |
| `CONFLICT_ERROR`   | 409         | Duplicate/conflict | Show specific conflict message      |
| `RATE_LIMITED`     | 429         | Too many requests  | Back off, retry after `Retry-After` |
| `INTERNAL_ERROR`   | 500         | Server error       | Show generic error, retry once      |

### Global Error Handler

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: ApiError) => ReactNode;
}

interface State {
  error: ApiError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: ApiError): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Response Envelope

All API responses follow this structure:

```typescript
interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string | string[]>;
  };
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    page?: number;
    totalPages?: number;
  };
}
```

### Parsing Helper

```typescript
function parseResponse<T>(json: any): ApiResponse<T> {
  if (json.success === false && json.error) {
    throw new ApiError(json.error.code, json.error.message, 400);
  }
  return json;
}
```

---

## Pagination

All list endpoints support cursor-based or offset-based pagination:

```typescript
// GET /api/appointments?limit=20&offset=0
interface ListResponse<T> {
  success: boolean;
  data: {
    appointments: T[];
    meta: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

function usePaginatedList<T>(endpoint: string, limit = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const data = await api<ListResponse<T>>(`${endpoint}?limit=${limit}&offset=${offset}`);

      setItems((prev) => [...prev, ...data.data.appointments]);
      setHasMore(data.data.meta.hasMore);
      setOffset((prev) => prev + limit);
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    hasMore,
    loading,
    loadMore,
    reset: () => {
      setItems([]);
      setOffset(0);
      setHasMore(true);
    },
  };
}
```

---

## File Uploads

### Avatar Upload (S3 Presigned URL)

```typescript
async function uploadAvatar(file: File) {
  // 1. Get presigned URL
  const { data } = await api<{ uploadUrl: string; fileUrl: string }>('/api/users/me/avatar', {
    method: 'PUT',
    body: JSON.stringify({ fileType: file.type }),
  });

  // 2. Upload directly to S3
  await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  // 3. Return the public URL
  return data.fileUrl;
}
```

### Prescription Document Upload

```typescript
async function uploadPrescriptionDocument(prescriptionId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prescriptionId', prescriptionId);

  const response = await fetch(`${BASE_URL}/api/prescriptions/${prescriptionId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // DO NOT set Content-Type - browser sets multipart boundary
    },
    body: formData,
  });

  return response.json();
}
```

---

## Real-time Features

### Messaging (WebSocket)

The messaging service uses Socket.IO for real-time chat:

```typescript
// lib/socket.ts
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000', {
  auth: {
    token: localStorage.getItem('access_token'),
  },
});

export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket.emit('join:conversation', conversationId);

    socket.on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('message:read', (data: { messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((msg) => (data.messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg))
      );
    });

    return () => {
      socket.emit('leave:conversation', conversationId);
      socket.off('message:new');
      socket.off('message:read');
    };
  }, [conversationId]);

  const sendMessage = (body: string) => {
    socket.emit('message:send', { conversationId, body });
  };

  const markAsRead = (messageIds: string[]) => {
    socket.emit('message:mark:read', { conversationId, messageIds });
  };

  return { messages, sendMessage, markAsRead };
}
```

### Notifications

```typescript
// Listen for push notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Poll for notifications (or use WebSocket if available)
    const interval = setInterval(async () => {
      const { data } = await api<Notification[]>('/api/notifications?unread=true');
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    }, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (ids: string[]) => {
    await api('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds: ids }),
    });
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
  };

  return { notifications, unreadCount, markAsRead };
}
```

---

## Caching Strategies

### React Query Cache Keys

```typescript
// query-keys.ts
export const queryKeys = {
  user: {
    me: ['user', 'me'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
  },
  appointments: {
    list: (filters: AppointmentFilters) => ['appointments', filters] as const,
    detail: (id: string) => ['appointments', id] as const,
    availability: (providerId: string, date: string) =>
      ['appointments', 'availability', providerId, date] as const,
  },
  prescriptions: {
    list: ['prescriptions'] as const,
    detail: (id: string) => ['prescriptions', id] as const,
  },
};
```

### SWR Alternative

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => api(url);

function useUser() {
  const { data, error, isLoading, mutate } = useSWR('/api/users/me', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    user: data?.data,
    isLoading,
    isError: error,
    mutate,
  };
}
```

---

## Webhooks

### Payment Webhooks (Server-side)

```typescript
// app/api/webhooks/paystack/route.ts
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';

  // Verify signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  switch (event.event) {
    case 'charge.success':
      await handlePaymentSuccess(event.data);
      break;
    case 'charge.failed':
      await handlePaymentFailed(event.data);
      break;
  }

  return Response.json({ received: true });
}
```

---

## Role-Based UI

### Available Roles

```typescript
type UserRole = 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
```

### Route Protection

```typescript
// components/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@ricton/shared';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  fallback = null
}: Props) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!session) return <LoginPrompt />;
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return fallback || <AccessDenied />;
  }

  return <>{children}</>;
}
```

### Usage

```tsx
// app/dashboard/page.tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@ricton/shared';

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CONSULTANT]}>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

---

## Common Patterns

### Optimistic Updates

```typescript
const updateProfile = useMutation({
  mutationFn: (data: UpdateProfileInput) =>
    api('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['user', 'me'] });
    const previous = queryClient.getQueryData(['user', 'me']);
    queryClient.setQueryData(['user', 'me'], (old: any) => ({
      ...old,
      data: { ...old.data, ...newData },
    }));
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['user', 'me'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
  },
});
```

### Form Validation (Zod)

```typescript
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginInput = z.infer<typeof LoginSchema>;

function LoginForm() {
  const [errors, setErrors] = useState<Partial<LoginInput>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const input = LoginSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    try {
      await login(input.email, input.password);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        setErrors(error.details as any);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" />
      {errors.email && <span>{errors.email}</span>}
      <input name="password" type="password" />
      {errors.password && <span>{errors.password}</span>}
      <button type="submit">Login</button>
    </form>
  );
}
```

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    if (error.status && error.status < 500) throw error;

    await new Promise((r) => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// Usage
const data = await withRetry(() => api('/api/analytics/overview'));
```
