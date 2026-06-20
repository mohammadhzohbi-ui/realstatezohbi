import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Permissions, NavSection, UserRole, PagePermission } from '../types';
import { DEFAULT_PERMISSIONS } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  canRead: (page: NavSection) => boolean;
  canWrite: (page: NavSection) => boolean;
  getPermission: (page: NavSection) => PagePermission;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) setProfile(data as UserProfile);
    else setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        (async () => {
          await fetchProfile(s.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getEffectivePermissions = (): Permissions => {
    if (!profile) return {};
    const role = profile.role as UserRole;
    const defaults = DEFAULT_PERMISSIONS[role] ?? {};
    const overrides = profile.permissions ?? {};
    const merged: Permissions = { ...defaults };
    for (const page of Object.keys(overrides) as NavSection[]) {
      merged[page] = { ...(defaults[page] ?? { read: false, write: false }), ...overrides[page] };
    }
    return merged;
  };

  const getPermission = (page: NavSection): PagePermission => {
    if (!profile) return { read: false, write: false };
    if (profile.role === 'admin') return { read: true, write: true };
    const perms = getEffectivePermissions();
    return perms[page] ?? { read: false, write: false };
  };

  const canRead = (page: NavSection) => getPermission(page).read;
  const canWrite = (page: NavSection) => getPermission(page).write;
  const isAdmin = profile?.role === 'admin';

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, profile, loading,
      isAdmin, canRead, canWrite, getPermission, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
