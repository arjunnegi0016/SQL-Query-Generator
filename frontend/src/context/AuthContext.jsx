import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isTerminalUnlocked, setTerminalUnlocked] = useState(false);

  useEffect(() => {
    // If there is a token in localStorage, we consider the user logged in
    // In a more robust implementation, we would verify this token with the backend
    // to get the full user profile. For now, we restore state from localStorage.
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Setup axios default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch and apply user theme globally
      axios.get("http://localhost:5000/api/settings")
        .then(res => {
          if (res.data.success && res.data.data.theme) {
            const theme = res.data.data.theme;
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              // 'light' or 'system' defaults to white as requested
              document.documentElement.classList.remove('dark');
            }
          }
        })
        .catch(err => console.error("Failed to fetch global theme:", err));
    }
    setLoading(false);
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setTerminalUnlocked(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isTerminalUnlocked, setTerminalUnlocked }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
