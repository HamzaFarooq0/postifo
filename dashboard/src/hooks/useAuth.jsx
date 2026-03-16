import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ll_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ll_token');
    if (token) {
      api.auth.me()
        .then(u => { setUser(u); localStorage.setItem('ll_user', JSON.stringify(u)); })
        .catch(() => { localStorage.removeItem('ll_token'); localStorage.removeItem('ll_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('ll_token', data.token);
    localStorage.setItem('ll_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (email, password, name) => {
    const data = await api.auth.register({ email, password, name });
    localStorage.setItem('ll_token', data.token);
    localStorage.setItem('ll_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
