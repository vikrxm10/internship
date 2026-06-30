/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import API from '../api/axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await API.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Session validation failed:', err);
        // call logout function declared below
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await API.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      console.error('Login request failed:', err);
      const message =
        err.response?.data?.message ||
        (err.request
          ? 'Unable to reach auth server. Check backend is running and the API URL is correct.'
          : 'Login failed. Please check credentials.');
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password, role, location) => {
    try {
      const res = await API.post('/auth/register', { name, email, password, role, location });
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      console.error('Registration request failed:', err);
      const message = err.response?.data?.message || 'Registration failed.';
      return { success: false, error: message };
    }
  };

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
