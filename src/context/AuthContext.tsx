/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  isAuthenticationError,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
  type AuthResponse,
  type AuthenticatedUser,
} from '../api/auth';
import {
  AUTH_TOKENS_UPDATED_EVENT,
  clearAuthTokens,
  getStoredRefreshToken,
  hasStoredAuthTokens,
  storeAuthTokens,
} from '../lib/authTokens';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    email: string;
    full_name: string;
    password: string;
    confirm_password: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      if (!hasStoredAuthTokens()) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await getCurrentUser();
        if (!cancelled) {
          setUser(response.data.user ?? null);
        }
      } catch (error) {
        if (!cancelled && isAuthenticationError(error)) {
          clearAuthTokens();
          setUser(null);
        }
        if (!cancelled && !isAuthenticationError(error)) {
          console.error('Unable to restore auth state.', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapAuth();

    const handleTokenEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: 'updated' | 'cleared' }>;
      if (customEvent.detail?.type === 'cleared') {
        setUser(null);
        setIsLoading(false);
      }
    };

    window.addEventListener(AUTH_TOKENS_UPDATED_EVENT, handleTokenEvent as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_TOKENS_UPDATED_EVENT, handleTokenEvent as EventListener);
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await loginRequest(email, password);
    if (response.data.access && response.data.refresh) {
      storeAuthTokens({
        access: response.data.access,
        refresh: response.data.refresh,
      });
    }
    setUser(response.data.user ?? null);
  }

  async function signup(payload: {
    email: string;
    full_name: string;
    password: string;
    confirm_password: string;
  }) {
    const response = await signupRequest(payload);
    if (
      response.data.user &&
      response.data.authenticated !== false &&
      response.data.access &&
      response.data.refresh
    ) {
      storeAuthTokens({
        access: response.data.access,
        refresh: response.data.refresh,
      });
      setUser(response.data.user);
    } else {
      setUser(null);
    }
    return response.data;
  }

  async function logout() {
    const refreshToken = getStoredRefreshToken();
    try {
      await logoutRequest(refreshToken || undefined);
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
