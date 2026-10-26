import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useBilling } from '../context/BillingContext';
import { Button, COLORS, Field, PageTitle, styles } from '../components/Ui';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation }) {
  const { isAuthed, user, authenticate, logout } = useBilling();
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ ownerName: '', email: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const googleConfig = {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  };
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleConfig);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) {
      Alert.alert('Google sign-in failed', 'Google did not return an identity token.');
      return;
    }
    setBusy(true);
    authenticate('google', { idToken })
      .then(() => navigation.navigate('Home'))
      .catch((error) => Alert.alert('Google sign-in failed', error.message))
      .finally(() => setBusy(false));
  }, [response]);

  if (isAuthed) {
    return <View style={[styles.page, { padding: 20, justifyContent: 'center' }]}>
      <View style={styles.card}>
        <Text style={{ color: COLORS.greenText, fontWeight: '700' }}>Signed in</Text>
        <Text style={{ marginTop: 5, color: COLORS.text, fontSize: 22, fontWeight: '800' }}>{user?.shopName || user?.ownerName}</Text>
        <Text style={{ marginTop: 4, color: COLORS.muted }}>{user?.email}</Text>
        <Button title="Return to billing" onPress={() => navigation.navigate('Home')} style={{ marginTop: 18 }} />
        <Button title="Logout" variant="light" onPress={() => logout()} style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.border }} />
      </View>
    </View>;
  }

  const submit = async () => {
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      Alert.alert('Check password', 'Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const payload = mode === 'signup'
        ? { ownerName: form.ownerName, email: form.email, password: form.password, confirmPassword: form.confirmPassword }
        : { email: form.email, password: form.password };
      await authenticate(mode, payload);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Could not sign in', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.scrollContent, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <PageTitle eyebrow="Billin.go" title={mode === 'signup' ? 'Create your account' : 'Welcome back'} subtitle="Securely manage shop items and bills from your phone." />
        {mode === 'signup' ? <Field label="Name" value={form.ownerName} onChangeText={(value) => setForm({ ...form, ownerName: value })} placeholder="Your name" /> : null}
        <Field label="Email" value={form.email} onChangeText={(value) => setForm({ ...form, email: value })} keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Password" value={form.password} onChangeText={(value) => setForm({ ...form, password: value })} secureTextEntry placeholder="At least 8 characters" />
        {mode === 'signup' ? <Field label="Re-enter password" value={form.confirmPassword} onChangeText={(value) => setForm({ ...form, confirmPassword: value })} secureTextEntry placeholder="Confirm password" /> : null}
        <Button title={busy ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Login'} onPress={submit} disabled={busy} />
        <Button title="Continue with Google" variant="light" onPress={() => {
          if (!googleConfig.androidClientId && !googleConfig.iosClientId && !googleConfig.webClientId) {
            Alert.alert('Google sign-in not configured', 'Set the platform Google client ID values in the mobile build environment.');
            return;
          }
          promptAsync();
        }} disabled={!request || busy} style={{ marginTop: 9, borderWidth: 1, borderColor: COLORS.border }} />
        <Text onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={{ textAlign: 'center', color: COLORS.greenText, fontWeight: '700', marginTop: 16 }}>
          {mode === 'signup' ? 'Already have an account? Login' : 'New here? Create an account'}
        </Text>
      </View>
    </ScrollView>
  );
}
