import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Проверка токена при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, token: accessToken } = res.data.data;
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/dashboard');
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { user: userData, token: accessToken } = res.data.data;
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/dashboard');
  };

  const logout = async () => {
    // Очищаем refresh cookie на сервере
    try {
      await api.post('/auth/logout');
    } catch {
      // Не блокируем logout если сервер недоступен
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}
