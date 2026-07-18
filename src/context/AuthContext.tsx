import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse, AuthenticatedUser } from '../api/auth';
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
  updateProfile: (data: { first_name?: string; last_name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const loadAuthApi = () => import('../api/auth');

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

      let authApi: Awaited<ReturnType<typeof loadAuthApi>> | undefined;

      try {
        authApi = await loadAuthApi();
        const response = await authApi.getCurrentUser();
        if (!cancelled) {
          setUser(response.data.user ?? null);
        }
      } catch (error) {
        const isAuthenticationError = authApi?.isAuthenticationError(error) ?? false;
        if (!cancelled && isAuthenticationError) {
          clearAuthTokens();
          setUser(null);
        }
        if (!cancelled && !isAuthenticationError) {
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
    const { login: loginRequest } = await loadAuthApi();
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
    const { signup: signupRequest } = await loadAuthApi();
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
      const { logout: logoutRequest } = await loadAuthApi();
      await logoutRequest(refreshToken || undefined);
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  }

  async function updateProfile(data: { first_name?: string; last_name?: string }) {
    const { updateProfile: updateProfileRequest } = await loadAuthApi();
    const response = await updateProfileRequest(data);
    if (response.data.user) {
      setUser(response.data.user);
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
        updateProfile,
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
