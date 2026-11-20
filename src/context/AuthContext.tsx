import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { User } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];
  loading: boolean;
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await db.getUsers();
        setAvailableUsers(users);
        
        // 嘗試從 localStorage 載入前一次選擇的使用者，否則預設使用第一個 (Admin)
        const savedUserId = localStorage.getItem('current_mock_user_id');
        const defaultUser = users.find(u => u.id === savedUserId) || users[0];
        
        if (defaultUser) {
          setCurrentUser(defaultUser);
          localStorage.setItem('current_mock_user_id', defaultUser.id);
        }
      } catch (err) {
        console.error('Failed to load mock users', err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const switchUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('current_mock_user_id', user.id);
      // 重新整理頁面以讓所有狀態與 LocalStorage 同步
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, availableUsers, loading, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
