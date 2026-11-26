import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, STORAGE_MODE } from '../services/db';
import type { User } from '../services/db';
import { firebaseAuth, googleProvider } from '../services/firebase';

export type AuthStatus = 'loading' | 'unauthenticated' | 'unauthorized' | 'authenticated';

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];
  loading: boolean;
  authMode: 'firebase' | 'local';
  authStatus: AuthStatus;
  firebaseEmail: string | null;
  authError: string | null;
  switchUser: (userId: string) => void;
  refreshUsers: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser]);

  const loadLocalUsers = useCallback(async () => {
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
        db.setSessionUser(defaultUser);
        localStorage.setItem('current_mock_user_id', defaultUser.id);
      }
      setAuthStatus('authenticated');
    } catch (err) {
      console.error('Failed to load local users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFirebaseUsers = useCallback(async () => {
    if (STORAGE_MODE !== 'firebase') return;
    try {
      const users = await db.getUsers();
      setAvailableUsers(users);
      if (currentUserIdRef.current) {
        const refreshed = users.find(u => u.id === currentUserIdRef.current) || null;
        if (refreshed) {
          setCurrentUser(refreshed);
          db.setSessionUser(refreshed);
        }
      }
    } catch (err) {
      console.error('Failed to refresh Firebase users', err);
    }
  }, []);

  useEffect(() => {
    if (STORAGE_MODE === 'local' || !firebaseAuth) {
      loadLocalUsers();

      const onUsersChanged = () => {
        loadLocalUsers();
      };
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'crm_users' || e.key === 'current_mock_user_id') {
          loadLocalUsers();
        }
      };
      window.addEventListener('crm:users-changed', onUsersChanged);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener('crm:users-changed', onUsersChanged);
        window.removeEventListener('storage', onStorage);
      };
    }

    // Firebase Auth 監聽
    const unsubscribe = onAuthStateChanged(firebaseAuth, async fbUser => {
      setAuthError(null);
      if (!fbUser || !fbUser.email) {
        db.setSessionUser(null);
        setCurrentUser(null);
        setAvailableUsers([]);
        setFirebaseEmail(null);
        setAuthStatus('unauthenticated');
        setLoading(false);
        return;
      }

      setLoading(true);
      setFirebaseEmail(fbUser.email);

      if (!fbUser.emailVerified) {
        db.setSessionUser(null);
        setCurrentUser(null);
        setAvailableUsers([]);
        setAuthError('您的 Google 帳號尚未完成 Email 驗證，無法登入系統。');
        setAuthStatus('unauthorized');
        setLoading(false);
        return;
      }

      try {
        const authorizedUser = await db.resolveAuthorizedUser(
          fbUser.email,
          fbUser.uid,
          fbUser.photoURL
        );

        if (!authorizedUser) {
          db.setSessionUser(null);
          setCurrentUser(null);
          setAvailableUsers([]);
          setAuthStatus('unauthorized');
          setLoading(false);
          return;
        }

        db.setSessionUser(authorizedUser);
        if (authorizedUser.role === 'ADMIN') {
          await db.bootstrapCleanStartIfEmpty();
        }

        const users = await db.getUsers();
        const latestUser = users.find(u => u.id === authorizedUser.id) || authorizedUser;
        setAvailableUsers(users);
        setCurrentUser(latestUser);
        db.setSessionUser(latestUser);
        setAuthStatus('authenticated');
      } catch (err) {
        console.error('Firebase authorization check failed:', err);
        db.setSessionUser(null);
        setCurrentUser(null);
        setAvailableUsers([]);
        setAuthError('驗證帳號授權時發生錯誤，請確認網路連線或聯繫管理員。');
        setAuthStatus('unauthorized');
      } finally {
        setLoading(false);
      }
    });

    const onUsersChanged = () => {
      refreshFirebaseUsers();
    };
    window.addEventListener('crm:users-changed', onUsersChanged);

    return () => {
      unsubscribe();
      window.removeEventListener('crm:users-changed', onUsersChanged);
    };
  }, [loadLocalUsers, refreshFirebaseUsers]);

  const switchUser = (userId: string) => {
    if (STORAGE_MODE !== 'local') return;
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      db.setSessionUser(user);
      localStorage.setItem('current_mock_user_id', user.id);
      window.location.reload();
    }
  };

  const signInWithGoogle = async () => {
    if (!firebaseAuth || !googleProvider) return;
    setAuthError(null);
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        setAuthError('目前網域尚未加入 Firebase Auth 授權網域清單，請聯繫管理員設定。');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('瀏覽器已封鎖登入彈窗，請允許彈出式視窗後再試一次。');
      } else {
        setAuthError('Google 登入失敗，請稍後再試。');
      }
      console.error('Google sign-in error:', err);
    }
  };

  const signOutUser = async () => {
    if (!firebaseAuth) return;
    setAuthError(null);
    await signOut(firebaseAuth);
    db.setSessionUser(null);
    setCurrentUser(null);
    setAvailableUsers([]);
    setFirebaseEmail(null);
    setAuthStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        loading,
        authMode: STORAGE_MODE,
        authStatus,
        firebaseEmail,
        authError,
        switchUser,
        refreshUsers: STORAGE_MODE === 'firebase' ? refreshFirebaseUsers : loadLocalUsers,
        signInWithGoogle,
        signOutUser,
      }}
    >
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
