/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User } from '../types';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  toasts: Toast[];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (name: string, notificationPreferences: any) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('billing_token'));
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('billing_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('billing_token', response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
      showToast(`Welcome back, ${response.data.user.name}!`, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Authentication failed. Check credentials.';
      showToast(errMsg, 'error');
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password });
      localStorage.setItem('billing_token', response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
      showToast('Account registered successfully!', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Registration failed.';
      showToast(errMsg, 'error');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('billing_token');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully.', 'info');
  };

  const updatePreferences = async (name: string, notificationPreferences: any) => {
    try {
      const response = await axios.post(
        '/api/auth/preferences',
        { name, notificationPreferences },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(response.data);
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update preferences.';
      showToast(errMsg, 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        toasts,
        login,
        register,
        logout,
        updatePreferences,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
