/**
 * Authentication Context for Nox Chat
 * Manages user session state across the app
 * Security-hardened with rate limiting and input validation
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authClient } from './auth-client';
import apiClient from './api-client';
import { API_ENDPOINTS } from './api-config';
import { 
  authRateLimiter, 
  sanitizeInput, 
  isValidEmail, 
  validatePassword,
  clearSensitiveData 
} from './security';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
  role?: string;
  nameColor?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  twoFactorEnabled?: boolean | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      
      if (session.data?.user) {
        setUser(session.data.user as unknown as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Session check failed:', error);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    // Rate limiting check
    if (!authRateLimiter.canAttempt('signIn')) {
      return { success: false, error: 'Too many login attempts. Please wait a minute.' };
    }
    authRateLimiter.recordAttempt('signIn');

    // Input validation
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    if (!isValidEmail(sanitizedEmail)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!password || password.length < 1) {
      return { success: false, error: 'Password is required' };
    }

    try {
      const response = await authClient.signIn.email({
        email: sanitizedEmail,
        password,
      });

      if (response.data?.user) {
        // Reset rate limiter on successful login
        authRateLimiter.reset('signIn');
        
        // Fetch full profile after login
        const cookies = authClient.getCookie();
        const profileRes = await fetch(`${apiClient.getBaseUrl()}${API_ENDPOINTS.profile}`, {
          headers: {
            'Cookie': cookies || '',
          },
          credentials: 'omit',
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.user) {
            setUser(profileData.user);
          } else {
            setUser(response.data.user as unknown as User);
          }
        } else {
          setUser(response.data.user as unknown as User);
        }
        return { success: true };
      }

      const errorMessage = response.error?.message || 'Sign in failed';
      if (errorMessage.toLowerCase().includes('verify')) {
        return { success: false, needsVerification: true, error: errorMessage };
      }

      return { success: false, error: errorMessage };
    } catch (error) {
      return { success: false, error: __DEV__ && error instanceof Error ? error.message : 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    // Rate limiting check
    if (!authRateLimiter.canAttempt('signUp')) {
      return { success: false, error: 'Too many signup attempts. Please wait a minute.' };
    }
    authRateLimiter.recordAttempt('signUp');

    // Input validation
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    const sanitizedName = sanitizeInput(name.trim());

    if (!isValidEmail(sanitizedEmail)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (sanitizedName.length < 2 || sanitizedName.length > 50) {
      return { success: false, error: 'Name must be between 2 and 50 characters' };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors[0] };
    }

    try {
      const response = await authClient.signUp.email({
        email: sanitizedEmail,
        password,
        name: sanitizedName,
      });

      if (response.data?.user) {
        authRateLimiter.reset('signUp');
        return { success: true };
      }

      return { success: false, error: response.error?.message || 'Sign up failed' };
    } catch (error) {
      return { success: false, error: __DEV__ && error instanceof Error ? error.message : 'Sign up failed' };
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      // Clear all sensitive data on logout
      await clearSensitiveData();
      setUser(null);
    } catch (error) {
      if (__DEV__) {
        console.error('Sign out failed:', error);
      }
      // Still clear data even if signout request fails
      await clearSensitiveData();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get<{ user: User }>(API_ENDPOINTS.profile);
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
        updateUser,
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

export default AuthContext;
