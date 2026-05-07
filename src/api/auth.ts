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
  account_deletion_requested_at?: string | null;
  account_deletion_scheduled_for?: string | null;
}

export interface AuthResponse {
  user?: AuthenticatedUser;
  authenticated?: boolean;
  requires_login?: boolean;
  message?: string;
  mode?: 'public' | 'disabled';
  access?: string;
  refresh?: string;
  account_deletion_cancelled?: boolean;
}

export interface SignupStatusResponse {
  can_signup: boolean;
  mode: 'public' | 'disabled';
  has_users: boolean;
  email_only: boolean;
  message: string;
}

export interface SecurityDashboardResponse {
  environment: {
    mode: string;
    debug: boolean;
    admin_enabled: boolean;
    public_signup_enabled: boolean;
    allowed_hosts_count: number;
    cors_origins_count: number;
    csrf_trusted_origins_count: number;
    secure_ssl_redirect: boolean;
    session_cookie_secure: boolean;
    csrf_cookie_secure: boolean;
    hsts_seconds: number;
  };
  auth: {
    login_rate: string;
    signup_rate: string;
    token_refresh_rate: string;
    jwt_access_minutes: number;
    jwt_refresh_days: number;
    refresh_rotation_enabled: boolean;
    refresh_blacklist_enabled: boolean;
  };
  google: {
    oauth_configured: boolean;
    oauth_connected: boolean;
    connected_email: string;
    can_list_spreadsheets: boolean;
    total_syncs: number;
    enabled_syncs: number;
    error_syncs: number;
    latest_synced_at: string | null;
    latest_error: string;
  };
  waf: {
    vercel_project: boolean;
    edge_scanner_denies_deployed: boolean;
    firewall_actions_file: string;
    bot_protection_configured: boolean;
    ai_bots_blocked: boolean;
  };
  checked_at: string;
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

export const getSecurityDashboard = () =>
  api.get<SecurityDashboardResponse>('/security/dashboard/');

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
    typeof error.response?.data?.detail === 'string'
      ? error.response.data.detail.toLowerCase()
      : '';

  return (
    status === 401 ||
    (status === 403 &&
      (detail.includes('authentication credentials were not provided') || detail.includes('csrf')))
  );
};
