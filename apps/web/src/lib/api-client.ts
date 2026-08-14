const OVERRIDE_API_URL = process.env.NEXT_PUBLIC_API_URL;

// Local port mappings when testing on localhost
const LOCAL_SERVICE_PORTS: Record<string, number> = {
  auth: 3001,
  user: 3002,
  users: 3002,
  prescription: 3004,
  prescriptions: 3004,
  appointment: 3005,
  appointments: 3005,
  pharmacy: 3006,
  payment: 3007,
  payments: 3007,
  wallet: 3008,
  notification: 3009,
  notifications: 3009,
  admin: 3010,
  rewards: 3011,
  telemedicine: 3013,
};

function getEndpointUrl(endpoint: string): string {
  // If endpoint is an absolute URL, return as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // If in browser and on localhost, route to local service ports
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const pathParts = cleanEndpoint.split('/');
    const servicePrefix = pathParts[0];

    const targetPort = LOCAL_SERVICE_PORTS[servicePrefix];
    if (targetPort) {
      return `http://localhost:${targetPort}/api/${cleanEndpoint}`;
    }
    return `http://localhost:3001/api/${cleanEndpoint}`;
  }

  // Default to production API Gateway or environment variable
  const baseUrl = OVERRIDE_API_URL || 'https://api.ricton.com';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (cleanPath.startsWith('/api/')) {
    return `${cleanBase}${cleanPath}`;
  }
  return `${cleanBase}/api${cleanPath}`;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ricton_access_token');
    }
    return null;
  }

  public setToken(token: string | null) {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('ricton_access_token', token);
      } else {
        localStorage.removeItem('ricton_access_token');
      }
    }
  }

  public clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ricton_access_token');
      localStorage.removeItem('ricton_user');
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = getEndpointUrl(endpoint);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: data.message || `Request failed with status ${response.status}`,
          },
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network error occurred. Please check your connection.',
        },
      };
    }
  }

  public get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}

export const api = new ApiClient();
