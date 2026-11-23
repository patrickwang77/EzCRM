import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import type { User } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];
  loading: boolean;
  switchUser: (userId: string) => void;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const users = await db.getUsers();
      setAvailableUsers(users);

      const savedUserId = localStorage.getItem('current_mock_user_id');
      // 優先回溯上次身分；若失效則優先選第一位 ADMIN，避免誤切為一般使用者 (修復 B-3/B-1)
      const defaultUser =
        users.find(u => u.id === savedUserId) ||
        users.find(u => u.role === 'ADMIN') ||
        users[0] ||
        null;

      if (defaultUser) {
        setCurrentUser(defaultUser);
        localStorage.setItem('current_mock_user_id', defaultUser.id);
      }
    } catch (err) {
      console.error('Failed to load mock users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    // 即時監聽人員 CRUD 變更與跨分頁 storage 變更 (修復 B-1)
    const onUsersChanged = () => {
      loadUsers();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'crm_users' || e.key === 'current_mock_user_id') {
        loadUsers();
      }
    };
    window.addEventListener('crm:users-changed', onUsersChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('crm:users-changed', onUsersChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadUsers]);

  const switchUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('current_mock_user_id', user.id);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, availableUsers, loading, switchUser, refreshUsers: loadUsers }}>
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
