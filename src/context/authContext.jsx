import { createContext, useContext, useEffect, useState } from 'react';

import { authApi } from '../api/authApi';
import { detectCurrency } from '../api/geoApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  // Валюту определяем по IP один раз и сохраняем в профиль — дальше юзер меняет её сам.
  // Если определить не удалось, ничего не сохраняем и попробуем при следующей загрузке
  useEffect(() => {
    if (!user || user.currency) return;
    detectCurrency().then((currency) => {
      if (currency) authApi.updateCurrency(currency).then(setUser);
    });
  }, [user]);

  const register = async (data) => {
    const registeredUser = await authApi.register(data);
    setUser(registeredUser);
    return registeredUser;
  };

  const login = async (data) => {
    const loggedInUser = await authApi.login(data);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const updatedUser = await authApi.updateProfile(updates);
    setUser(updatedUser);
    return updatedUser;
  };

  return <AuthContext.Provider value={{ user, isLoading, register, login, logout, updateProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
