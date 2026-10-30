import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthValue = {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'editor' | null;
  loading: boolean;
  configured: boolean;
  isMember: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'editor' | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMembership = async () => {
    if (!supabase) { setRole(null); return; }
    const { data: { session: current } } = await supabase.auth.getSession();
    if (!current?.user) { setRole(null); return; }
    const { data } = await supabase.from('project_members').select('role').eq('user_id', current.user.id).maybeSingle();
    setRole(data?.role === 'admin' || data?.role === 'editor' ? data.role : null);
  };

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) await refreshMembership();
      if (alive) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setRole(null);
      else window.setTimeout(() => { void refreshMembership(); }, 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase is not configured yet. Add your project URL and publishable key to the environment variables.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await refreshMembership();
    return { error: null };
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };

  const value = useMemo<AuthValue>(() => ({
    session, user: session?.user ?? null, role, loading, configured: isSupabaseConfigured,
    isMember: role === 'admin' || role === 'editor', isAdmin: role === 'admin',
    signIn, signOut, refreshMembership,
  }), [session, role, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
