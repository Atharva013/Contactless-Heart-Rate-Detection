import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { colors } from '../theme/colors';
import { isSupabaseConfigured } from '../services/supabase';
import { signInWithEmail, signUpWithEmail } from '../services/auth';

export default function AuthScreen({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const user = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
      setLoading(false);

      if (isSignUp && isSupabaseConfigured && !user?.confirmed_at) {
        Alert.alert('Check your email', 'Confirm your account, then sign in.');
        setIsSignUp(false);
        return;
      }
      onAuthenticated(user);
    } catch (err) {
      setLoading(false);
      Alert.alert('Authentication failed', err.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <View style={styles.panel}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>+</Text>
          </View>
          <Text style={styles.brand}>PulseGuard</Text>
          <Text style={styles.subtitle}>Sign in to keep patient scan history private and recoverable.</Text>

          {!isSupabaseConfigured && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoText}>
                Supabase is not configured. This build uses local-only demo auth and history.
              </Text>
            </View>
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(prev => !prev)} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gradientStart },
  wrap: { flex: 1, justifyContent: 'center', padding: 24 },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenLight,
    marginBottom: 14,
  },
  logoText: { fontSize: 32, fontWeight: '800', color: colors.green },
  brand: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 20 },
  demoNotice: {
    backgroundColor: colors.statusYellowBg,
    borderColor: colors.statusYellow + '30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  demoText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  input: {
    backgroundColor: '#f7f9f7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { paddingVertical: 16, alignItems: 'center' },
  switchText: { color: colors.purple, fontSize: 13, fontWeight: '700' },
});
