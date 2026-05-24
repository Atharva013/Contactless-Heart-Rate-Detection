import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';

const LOCAL_USER_KEY = 'pulseguard_local_user';

export async function getSessionUser() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.user || null;
  }

  const raw = await AsyncStorage.getItem(LOCAL_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function signInWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  const user = {
    id: `local:${cleanEmail}`,
    email: cleanEmail,
    app_metadata: { provider: 'local_demo' },
  };
  await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  return user;
}

export async function signUpWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  return signInWithEmail(cleanEmail, password);
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  await AsyncStorage.removeItem(LOCAL_USER_KEY);
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return data.subscription;
}
