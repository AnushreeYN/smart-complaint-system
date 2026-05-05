import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = async () => {
    const response = await api.get('/users/me');
    setUser(response.data);
    return response.data;
  };

  const clearSession = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await loadCurrentUser();
      } catch (error) {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData);
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    return loadCurrentUser();
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser: loadCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
