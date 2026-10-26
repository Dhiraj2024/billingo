import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useBilling } from '../context/BillingContext';
import { Button, COLORS, Field, PageTitle, styles } from '../components/Ui';

export default function AccountScreen({ navigation }) {
  const { isAuthed, user, updateProfile } = useBilling();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) setForm({
      ownerName: user.ownerName || '', shopName: user.shopName || '', mobNo: user.mobNo || '',
      email: user.email || '', address: user.address || '', endMsg: user.endMsg || '',
    });
  }, [user]);
  if (!isAuthed) return <View style={[styles.page, { padding: 20, justifyContent: 'center' }]}><Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800' }}>Sign in to manage your shop</Text><Button title="Open login" onPress={() => navigation.navigate('Auth')} style={{ marginTop: 14 }} /></View>;

  const save = async () => {
    setBusy(true);
    try { await updateProfile(form); Alert.alert('Saved', 'Bill header and footer details have been updated.'); }
    catch (error) { Alert.alert('Could not save', error.message); }
    finally { setBusy(false); }
  };
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <PageTitle eyebrow={`Welcome, ${user?.ownerName || 'Shopkeeper'}`} title="Shop account" subtitle="Printed bills use these shop details." />
      <View style={styles.card}>
        <Field label="Owner name" value={form.ownerName || ''} onChangeText={(value) => setForm({ ...form, ownerName: value })} placeholder="Owner name" />
        <Field label="Shop name" value={form.shopName || ''} onChangeText={(value) => setForm({ ...form, shopName: value })} placeholder="Shop name" />
        <Field label="Mobile number" value={form.mobNo || ''} onChangeText={(value) => setForm({ ...form, mobNo: value })} keyboardType="phone-pad" placeholder="Mobile number" />
        <Field label="Email" value={form.email || ''} onChangeText={(value) => setForm({ ...form, email: value })} keyboardType="email-address" placeholder="Email" />
        <Field label="Address" value={form.address || ''} onChangeText={(value) => setForm({ ...form, address: value })} multiline placeholder="Shop address" />
        <Field label="End message" value={form.endMsg || ''} onChangeText={(value) => setForm({ ...form, endMsg: value })} placeholder="Thank you! Visit again" />
        <Button title={busy ? 'Saving...' : 'Bill Details Save'} onPress={save} disabled={busy} />
      </View>
    </ScrollView>
  );
}
