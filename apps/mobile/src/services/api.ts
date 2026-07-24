import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class MobileApiClient {
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('ricton_access_token');
    } catch {
      return null;
    }
  }

  public async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('ricton_access_token', token);
    } catch (_err) {
      // Ignore storage write errors
    }
  }

  public async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('ricton_access_token');
      await AsyncStorage.removeItem('ricton_user');
    } catch (_err) {
      // Ignore storage removal errors
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
}

export const mobileApi = new MobileApiClient();
