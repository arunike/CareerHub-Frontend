const ACCESS_TOKEN_KEY = 'careerhub_access_token';
const REFRESH_TOKEN_KEY = 'careerhub_refresh_token';

export const AUTH_TOKENS_UPDATED_EVENT = 'careerhub:auth-tokens-updated';

export interface AuthTokenPair {
  access: string;
  refresh: string;
}

interface AuthTokenEventDetail {
  type: 'updated' | 'cleared';
}

const dispatchAuthTokenEvent = (detail: AuthTokenEventDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AuthTokenEventDetail>(AUTH_TOKENS_UPDATED_EVENT, { detail }));
};

const safeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export const getStoredAccessToken = () => safeStorage()?.getItem(ACCESS_TOKEN_KEY) ?? '';

export const getStoredRefreshToken = () => safeStorage()?.getItem(REFRESH_TOKEN_KEY) ?? '';

export const hasStoredAuthTokens = () => !!(getStoredAccessToken() || getStoredRefreshToken());

export const storeAuthTokens = (tokens: AuthTokenPair) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  dispatchAuthTokenEvent({ type: 'updated' });
};

export const updateStoredAccessToken = (accessToken: string) => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return;
  storeAuthTokens({ access: accessToken, refresh: refreshToken });
};

export const clearAuthTokens = () => {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  dispatchAuthTokenEvent({ type: 'cleared' });
};
