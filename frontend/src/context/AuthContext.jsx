import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

// create the auth context
const AuthContext = createContext(null);

// keys we use in localStorage
const TOKEN_KEY = 'ttm_token';
const USER_KEY = 'ttm_user';

// load user from localStorage if it exists
function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function AuthProvider({ children }) {
  // user state - starts from localStorage so refresh keeps you logged in
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  // when app loads, if we have a token, get the latest user info from backend
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/api/auth/me')
      .then(function (response) {
        setUser(response.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      })
      .catch(function () {
        // token is bad, clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(function () {
        setLoading(false);
      });
  }, []);

  // login function
  async function login(email, password) {
    const response = await api.post('/api/auth/login', {
      email: email,
      password: password
    });
    const data = response.data;

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  // signup function
  async function signup(name, email, password) {
    const response = await api.post('/api/auth/signup', {
      name: name,
      email: email,
      password: password
    });
    const data = response.data;

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  // logout function
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  // value passed down to all components
  const contextValue = {
    user: user,
    loading: loading,
    login: login,
    signup: signup,
    logout: logout,
    isAdmin: user && user.role === 'admin'
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
