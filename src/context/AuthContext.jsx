import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, firebaseConfigured } from '../firebase/firebase';
import {
  loginUser,
  logoutUser,
  resetPassword,
  setAuthPersistence,
  subscribeToAuthState,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    try {
      setAuthPersistence().catch((error) => {
        console.error('No se pudo configurar la persistencia de sesión:', error);
      });

      return subscribeToAuthState((nextUser) => {
        setUser(nextUser);
        setLoading(false);
      });
    } catch (error) {
      console.error('No se pudo observar el estado de autenticación:', error);
      setLoading(false);
      return undefined;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const authenticatedUser = await loginUser(email, password);
    setUser(authenticatedUser);
    setLoading(false);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setLoading(false);
  }, []);

  const requestPasswordReset = useCallback((email) => resetPassword(email), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isFirebaseConfigured: firebaseConfigured,
      login,
      logout,
      resetPassword: requestPasswordReset,
    }),
    [loading, login, logout, requestPasswordReset, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }

  return context;
}
