import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { SEED_USERS, TEAMS, getRoleForEmail } from '../lib/trackerConfig';

const AuthContext = createContext(null);
const seedVersion = 'v5';

function fullNameFromAuthUser(authUser) {
  return (
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')[0] ||
    'Team Member'
  );
}

function localSessionFromUser(found) {
  const session = { ...found };
  delete session.password;
  return session;
}

function normalizeProfile(authUser, profile) {
  const email = authUser?.email || profile?.email || '';
  return {
    id: authUser?.id || profile?.id,
    name: profile?.full_name || fullNameFromAuthUser(authUser),
    email,
    role: profile?.role || getRoleForEmail(email),
    team: profile?.team || authUser?.user_metadata?.team || TEAMS[0],
    avatarUrl: profile?.avatar_url || authUser?.user_metadata?.avatar_url || '',
    profileCompleted: profile?.profile_completed ?? Boolean(authUser?.user_metadata?.team),
  };
}

function authRedirectUrl() {
  return window.location.href.split('#')[0];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const authBackend = isSupabaseConfigured ? 'supabase' : 'local';

  const ensureProfile = useCallback(async (authUser) => {
    if (!authUser || !supabase) return null;

    const email = authUser.email || '';
    const baseProfile = {
      id: authUser.id,
      email,
      full_name: fullNameFromAuthUser(authUser),
      role: getRoleForEmail(email, authUser.user_metadata?.role || 'collaborator'),
      team: authUser.user_metadata?.team || TEAMS[0],
      avatar_url: authUser.user_metadata?.avatar_url || '',
      profile_completed: Boolean(authUser.user_metadata?.team),
    };

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, team, avatar_url, profile_completed')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) throw error;

    if (profile) {
      return normalizeProfile(authUser, profile);
    }

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert(baseProfile)
      .select('id, email, full_name, role, team, avatar_url, profile_completed')
      .single();

    if (insertError) throw insertError;
    return normalizeProfile(authUser, created);
  }, []);

  const hydrateSupabaseUser = useCallback(async (authUser) => {
    try {
      const profileUser = await ensureProfile(authUser);
      setUser(profileUser);
      setAuthError('');
      return profileUser;
    } catch (error) {
      setAuthError(error.message);
      setUser(null);
      return null;
    }
  }, [ensureProfile]);

  useEffect(() => {
    let mounted = true;
    let subscription;

    const boot = async () => {
      setLoading(true);

      if (!isSupabaseConfigured) {
        const stored = localStorage.getItem('abl_session');

        if (localStorage.getItem('abl_seed_version') !== seedVersion) {
          localStorage.setItem('abl_users', JSON.stringify(SEED_USERS));
          localStorage.setItem('abl_seed_version', seedVersion);
          localStorage.removeItem('abl_session');
          if (mounted) setUser(null);
        } else if (stored && mounted) {
          setUser(JSON.parse(stored));
        }

        if (mounted) setLoading(false);
        return;
      }

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error && mounted) setAuthError(error.message);

      if (sessionData.session?.user && mounted) {
        await hydrateSupabaseUser(sessionData.session.user);
      } else if (mounted) {
        setUser(null);
      }

      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (!session?.user) {
          setUser(null);
          return;
        }

        hydrateSupabaseUser(session.user);
      });

      subscription = listener.data.subscription;
      if (mounted) setLoading(false);
    };

    boot();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [hydrateSupabaseUser]);

  const getUsers = () => JSON.parse(localStorage.getItem('abl_users') || '[]');

  const login = async (email, password) => {
    setAuthError('');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }

      const profileUser = await hydrateSupabaseUser(data.user);
      return { ok: true, user: profileUser };
    }

    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return { error: 'Invalid email or password.' };

    const session = localSessionFromUser(found);
    localStorage.setItem('abl_session', JSON.stringify(session));
    setUser(session);
    return { ok: true, user: session };
  };

  const register = async ({ name, email, password, team }) => {
    setAuthError('');

    if (isSupabaseConfigured) {
      const safeRole = getRoleForEmail(email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: safeRole,
            team,
            profile_completed: true,
          },
          emailRedirectTo: authRedirectUrl(),
        },
      });

      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }

      if (!data.session) {
        return {
          ok: true,
          pendingConfirmation: true,
          message: 'Check your email to confirm the account, then sign in.',
        };
      }

      const profileUser = await hydrateSupabaseUser(data.user);
      return { ok: true, user: profileUser };
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) return { error: 'Email already registered.' };

    const safeRole = getRoleForEmail(email);
    const newUser = {
      id: 'u' + Date.now(),
      name,
      email,
      password,
      role: safeRole,
      team,
      profileCompleted: true,
    };

    users.push(newUser);
    localStorage.setItem('abl_users', JSON.stringify(users));

    const session = localSessionFromUser(newUser);
    localStorage.setItem('abl_session', JSON.stringify(session));
    setUser(session);
    return { ok: true, user: session };
  };

  const loginWithGoogle = async () => {
    setAuthError('');

    if (!isSupabaseConfigured) {
      return { error: 'Google sign in is available after Supabase is configured.' };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUrl(),
      },
    });

    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }

    return { ok: true };
  };

  const updateProfile = async ({ name, team, role, profileCompleted = true }) => {
    setAuthError('');

    if (!user) return { error: 'You must be signed in to update your profile.' };

    const fullName = name.trim();
    const safeRole = role === 'executive' ? 'executive' : 'collaborator';
    if (!fullName) return { error: 'Full name is required.' };
    if (!TEAMS.includes(team)) return { error: 'Select a valid team.' };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          team,
          role: safeRole,
          profile_completed: profileCompleted,
        })
        .eq('id', user.id)
        .select('id, email, full_name, role, team, avatar_url, profile_completed')
        .single();

      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }

      const nextUser = normalizeProfile(null, data);
      setUser(nextUser);
      return { ok: true, user: nextUser };
    }

    const users = getUsers();
    const nextUsers = users.map(stored => (
      stored.id === user.id
        ? { ...stored, name: fullName, team, role: safeRole, profileCompleted }
        : stored
    ));
    const nextUser = { ...user, name: fullName, team, role: safeRole, profileCompleted };

    localStorage.setItem('abl_users', JSON.stringify(nextUsers));
    localStorage.setItem('abl_session', JSON.stringify(nextUser));
    setUser(nextUser);
    return { ok: true, user: nextUser };
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('abl_session');
    }

    setUser(null);
  };

  const value = {
    user,
    loading,
    authError,
    authBackend,
    isSupabaseConfigured,
    login,
    register,
    loginWithGoogle,
    updateProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
