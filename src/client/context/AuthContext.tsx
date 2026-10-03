import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.ts';
import { ApplicationRole, UserProfile } from '../../shared/types.ts';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: ApplicationRole;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  adminLogin: (email: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<ApplicationRole>('USER');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync profile with server after Google authentication
  const syncWithServer = async (fbUser: FirebaseUser) => {
    try {
      setError(null);
      const email = fbUser.email?.toLowerCase().trim() || '';

      // KIIT Domain requirement check
      const isKiit = email.endsWith('@kiit.ac.in');
      const isBootstrappedAdmin = email === 'aditya2024303@gmail.com';

      if (!isKiit && !isBootstrappedAdmin) {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
        setRole('USER');
        setError(`Access restricted. Account "${email}" is not a valid @kiit.ac.in university address. Please sign in with your official KIIT Google Workspace account.`);
        return;
      }

      if (!fbUser.emailVerified) {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
        setRole('USER');
        setError('Your KIIT Google account must be email verified.');
        return;
      }

      const res = await fetch('/api/v1/auth/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified,
          displayName: fbUser.displayName || email.split('@')[0],
          photoURL: fbUser.photoURL || '',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to sync KIIT user profile.');
      }

      const data = await res.json();
      setProfile(data.profile);
      setRole(data.profile.role);
    } catch (err: any) {
      console.error('Profile sync error:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    // Check if an admin session is currently active
    const savedAdmin = localStorage.getItem('kbc_admin_session');
    if (savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        setProfile(parsed);
        setRole('ADMIN');
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem('kbc_admin_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setUser(fbUser);
        await syncWithServer(fbUser);
      } else {
        // If not admin and no Firebase user
        if (!localStorage.getItem('kbc_admin_session')) {
          setUser(null);
          setProfile(null);
          setRole('USER');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      localStorage.removeItem('kbc_admin_session');
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncWithServer(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email: string, pass: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch('/api/v1/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Admin login failed');
      }

      const data = await res.json();
      localStorage.setItem('kbc_admin_session', JSON.stringify(data.user));
      setProfile(data.user);
      setRole('ADMIN');
      setUser(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('kbc_admin_session');
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setRole('USER');
    setError(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    try {
      const res = await fetch('/api/v1/auth/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: profile.uid,
          email: profile.email,
          emailVerified: profile.emailVerified,
          displayName: updates.displayName || profile.displayName,
          personType: updates.personType || profile.personType,
          accommodationType: updates.accommodationType || profile.accommodationType,
          hostelName: updates.hostelName !== undefined ? updates.hostelName : profile.hostelName,
          hostelEmail: updates.hostelEmail !== undefined ? updates.hostelEmail : profile.hostelEmail,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error);
      }
      const data = await res.json();
      setProfile(data.profile);
      setRole(data.profile.role);
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await syncWithServer(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        error,
        signInWithGoogle,
        adminLogin,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
