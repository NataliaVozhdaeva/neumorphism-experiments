import { createContext, useContext, useEffect, useState } from 'react';

import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

// Хранит текущего пользователя в памяти приложения. register()/login() сами обновляют
// user, поэтому создание аккаунта сразу логинит пользователя без отдельного запроса
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

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

  return <AuthContext.Provider value={{ user, isLoading, register, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
