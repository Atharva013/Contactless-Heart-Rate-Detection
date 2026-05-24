import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';

const HISTORY_KEY = 'pulseguard_history';

function normalizeRecord(row) {
  return {
    id: row.id,
    result: row.result,
    mode: row.mode || 'wellness',
    time: row.created_at ? new Date(row.created_at).toLocaleString() : row.time,
    synced: Boolean(row.id),
  };
}

export async function loadPatientRecords(user) {
  if (isSupabaseConfigured && user?.id) {
    const { data, error } = await supabase
      .from('patient_records')
      .select('id, mode, result, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map(normalizeRecord);
  }

  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function savePatientRecord({ user, result, mode }) {
  const localRecord = {
    result,
    mode,
    time: new Date().toLocaleString(),
    synced: false,
  };

  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const history = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([localRecord, ...history].slice(0, 20)));

  if (!isSupabaseConfigured || !user?.id) {
    return localRecord;
  }

  const { data, error } = await supabase
    .from('patient_records')
    .insert({
      user_id: user.id,
      mode,
      result,
    })
    .select('id, mode, result, created_at')
    .single();

  if (error) throw error;
  return normalizeRecord(data);
}
