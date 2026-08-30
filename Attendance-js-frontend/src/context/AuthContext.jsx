// Attendance-js-frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);       // initial "reading localStorage" state
  const [isLoading, setIsLoading] = useState(false);   // login-in-progress state
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      // Corrupted localStorage data shouldn't crash the app
      console.error('Failed to restore session:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/users/login', { email, password });
      const payload = response.data;

      if (!payload?.token || !payload?.user) {
        throw new Error('Unexpected response from server');
      }

      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));
      setUser(payload.user);
      return payload;
    } catch (err) {
      let message = 'Something went wrong. Please try again.';

      if (err.response) {
        // Server responded with an error status (e.g. 401 Invalid email or password)
        message = err.response.data?.message || `Login failed (${err.response.status})`;
      } else if (err.request) {
        // Request went out but no response came back
        message = 'Unable to reach the server. Please check your connection.';
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
      // Don't rethrow — LoginPage doesn't wrap the call in try/catch,
      // so throwing here would produce an unhandled rejection.
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError('');
  };

  const value = useMemo(
    () => ({ user, loading, isLoading, error, login, logout }),
    [user, loading, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}