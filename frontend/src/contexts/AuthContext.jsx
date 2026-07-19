import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    // Initialize from localStorage if available
    return localStorage.getItem('niftyiq_user') || null;
  });

  const login = (username) => {
    const trimmed = username.trim();
    if (trimmed) {
      setCurrentUser(trimmed);
      localStorage.setItem('niftyiq_user', trimmed);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('niftyiq_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
