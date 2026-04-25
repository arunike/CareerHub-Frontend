import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { clearAuthTokens, getStoredAccessToken, getStoredRefreshToken, storeAuthTokens } from '../lib/authTokens';
import { getApiBaseUrl } from '../lib/runtimeConfig';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

const shouldSkipRefresh = (url?: string) => {
  if (!url) return false;
  return ['/auth/login/', '/auth/signup/', '/auth/refresh/'].some((segment) => url.includes(segment));
};

api.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken();
  if (!accessToken) {
    return config;
  }

  const headers = AxiosHeaders.from(config.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  config.headers = headers;
  return config;
});

const performRefresh = async () => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('Missing refresh token.');
  }

  const response = await refreshClient.post('/auth/refresh/', { refresh: refreshToken });
  const nextAccess = response.data?.access;
  const nextRefresh = response.data?.refresh || refreshToken;

  if (!nextAccess) {
    throw new Error('Refresh endpoint did not return an access token.');
  }

  storeAuthTokens({ access: nextAccess, refresh: nextRefresh });
  return nextAccess;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (!getStoredRefreshToken()) {
      clearAuthTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const nextAccessToken = await refreshPromise;
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('Authorization', `Bearer ${nextAccessToken}`);
      originalRequest.headers = headers;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
