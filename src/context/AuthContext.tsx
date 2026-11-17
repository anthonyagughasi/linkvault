import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  createUserWithEmailAndPassword,
  googleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '../lib/firebase.ts';
import { syncUserProfile } from '../lib/firestore-service.ts';
import type { DbUser } from '../types/linkvault.ts';

interface AuthContextValue {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (firebaseUser: User) => {
    try {
      const profile = await syncUserProfile(firebaseUser);
      setDbUser(profile);
    } catch (err) {
      console.error('Failed to sync Firestore user profile:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncProfile(firebaseUser);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncProfile]);

  const loginWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    await syncProfile(cred.user);
  }, [syncProfile]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncProfile(cred.user);
    },
    [syncProfile]
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await syncProfile(cred.user);
    },
    [syncProfile]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setDbUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        requestPasswordReset,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
