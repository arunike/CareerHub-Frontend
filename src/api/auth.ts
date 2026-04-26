import axios from 'axios';
import api from './client';

export interface AuthenticatedUser {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface AuthResponse {
  user?: AuthenticatedUser;
  authenticated?: boolean;
  requires_login?: boolean;
  message?: string;
  mode?: 'public' | 'disabled';
  access?: string;
  refresh?: string;
}

export interface SignupStatusResponse {
  can_signup: boolean;
  mode: 'public' | 'disabled';
  has_users: boolean;
  email_only: boolean;
  message: string;
}

interface SignupPayload {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
}

export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login/', {
    email,
    password,
  });

export const refreshAccessToken = (refresh: string) =>
  api.post<Pick<AuthResponse, 'access' | 'refresh'>>('/auth/refresh/', { refresh });

export const getSignupStatus = () => api.get<SignupStatusResponse>('/auth/signup-status/');

export const signup = (payload: SignupPayload) => api.post<AuthResponse>('/auth/signup/', payload);

export const logout = (refresh?: string) => api.post('/auth/logout/', refresh ? { refresh } : {});

export const getCurrentUser = () => api.get<AuthResponse>('/auth/me/');

export const updateProfile = (data: { first_name?: string; last_name?: string }) =>
  api.patch<AuthResponse>('/auth/me/', data);

export const changePassword = (data: { old_password?: string; new_password?: string }) =>
  api.post('/auth/password-change/', data);

export const isAuthenticationError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const detail =
    typeof error.response?.data?.detail === 'string' ? error.response.data.detail.toLowerCase() : '';

  return (
    status === 401 ||
    (status === 403 &&
      (detail.includes('authentication credentials were not provided') || detail.includes('csrf')))
  );
};
