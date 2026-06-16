import { createContext, useEffect, useState, useContext, useCallback } from "react";
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState(null);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setAuthModal("signin");
    };
    window.addEventListener("auth:expired", handleExpired);

    api.get("/profile")
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("auth:expired", handleExpired);
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    const profile = await api.get("/profile");
    setUser(profile);
  };

  const register = async (fullName, email, password) => {
    const data = await api.post("/auth/register", { fullName, email, password });
    return data;
  };

  const resendVerification = async (email) => {
    const data = await api.post("/auth/resend-verification", { email });
    return data;
  };

  const updateUser = useCallback((updates) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, resendVerification, updateUser, logout, authModal, setAuthModal }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
