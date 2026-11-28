import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthResponse } from '../types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8088';

const ACCESS_TOKEN_KEY = 'spotki_access_token';
const REFRESH_TOKEN_KEY = 'spotki_refresh_token';
const USER_KEY = 'spotki_user';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setSession: (auth: AuthResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        userId: auth.userId,
        username: auth.username,
        fullName: auth.fullName,
        role: auth.role,
        hotelId: auth.hotelId,
      })
    );
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clear();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((newToken) => {
            if (!newToken) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post<ApiResponse<AuthResponse>>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );
        const authData = res.data.data;
        tokenStorage.setSession(authData);
        resolveQueue(authData.accessToken);
        originalRequest.headers.Authorization = `Bearer ${authData.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(null);
        tokenStorage.clear();
        window.dispatchEvent(new Event('spotki-auth-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; data?: Record<string, string> } | undefined;
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      const firstVal = Object.values(data.data)[0];
      if (firstVal) return `${data.message || 'Lỗi'}: ${firstVal}`;
    }
    if (data?.message) return data.message;
    if (err.response?.status === 429) {
      return 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 60 giây.';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
}
