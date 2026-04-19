/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ensureCsrfCookie,
  getCurrentUser,
  isAuthenticationError,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
  type AuthenticatedUser,
} from '../api/auth';

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
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const response = await getCurrentUser();
        if (!cancelled) {
          setUser(response.data.user);
        }
      } catch (error) {
        if (!cancelled && isAuthenticationError(error)) {
          setUser(null);
        }
        if (!cancelled && !isAuthenticationError(error)) {
          console.error('Unable to restore session state.', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    await ensureCsrfCookie();
    const response = await loginRequest(email, password);
    setUser(response.data.user);
  }

  async function signup(payload: {
    email: string;
    full_name: string;
    password: string;
    confirm_password: string;
  }) {
    await ensureCsrfCookie();
    const response = await signupRequest(payload);
    setUser(response.data.user);
  }

  async function logout() {
    try {
      await ensureCsrfCookie();
      await logoutRequest();
    } finally {
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
