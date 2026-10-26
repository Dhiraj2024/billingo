import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useBilling } from '../context/BillingContext';
import { Button, COLORS, PageTitle, styles } from '../components/Ui';
import { buildMobileReceipt } from '../utils/blePrinter';
import { printReceiptPdf } from '../utils/expoPdfPrint';

export default function HistoryScreen({ navigation }) {
  const { isAuthed, user, bills, fetchBills } = useBilling();
  const [date, setDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const shop = { shopName: user?.shopName, address: user?.address, mobNo: user?.mobNo, endMsg: user?.endMsg };

  useEffect(() => {
    if (isAuthed) fetchBills({ today: true }).catch((error) => Alert.alert('History unavailable', error.message));
  }, [isAuthed]);
  if (!isAuthed) return <View style={[styles.page, { padding: 20, justifyContent: 'center' }]}><Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800' }}>Sign in to view bills</Text><Button title="Open login" onPress={() => navigation.navigate('Auth')} style={{ marginTop: 14 }} /></View>;

  const filterToday = async () => {
    setDate(null);
    try { await fetchBills({ today: true }); } catch (error) { Alert.alert('Unable to load bills', error.message); }
  };
  const onDateChange = async (event, value) => {
    setShowPicker(false);
    if (event.type === 'dismissed' || !value) return;
    setDate(value);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    try { await fetchBills({ date: `${year}-${month}-${day}` }); } catch (error) { Alert.alert('Unable to load bills', error.message); }
  };
  const shareTxt = async (bill) => {
    const { text } = buildMobileReceipt(shop, bill.items, bill.billNo, bill.createdAt);
    const uri = `${FileSystem.cacheDirectory}Bill_${bill.billNo}.txt`;
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: `Bill ${bill.billNo}` });
  };
  const action = async (bill, type) => {
    setBusy(true);
    try {
      if (type === 'open') setSelected(bill);
      if (type === 'txt') await shareTxt(bill);
      if (type === 'pdf' || type === 'print') await printReceiptPdf(shop, bill.items, bill.billNo, bill.createdAt);
    } catch (error) { Alert.alert('Could not open bill', error.message); } finally { setBusy(false); }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PageTitle eyebrow="Your records" title="Bill history" subtitle="Search saved bills by date and share or reprint receipts." />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 13 }}>
          <Button title="Today" onPress={filterToday} style={{ flex: 1 }} />
          <Button title={date ? date.toLocaleDateString('en-IN') : 'Select date'} variant="light" onPress={() => setShowPicker(true)} style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border }} />
        </View>
        {showPicker ? <DateTimePicker value={date || new Date()} mode="date" display="default" maximumDate={new Date()} onChange={onDateChange} /> : null}
        {bills.map((bill) => <View key={bill._id} style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 16 }}>Bill #{bill.billNo}</Text><Text style={{ marginTop: 3, color: COLORS.muted, fontSize: 12 }}>{new Date(bill.createdAt).toLocaleString('en-IN')} · {bill.items.length} items · {bill.format}</Text></View>
            <Text style={{ fontWeight: '800', fontSize: 16, color: COLORS.text }}>₹{Number(bill.totalAmount).toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
            {['open', 'txt', 'pdf', 'print'].map((type) => <Pressable key={type} disabled={busy} onPress={() => action(bill, type)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: type === 'pdf' ? COLORS.orangeLight : '#F1F5F9' }}><Text style={{ color: type === 'pdf' ? COLORS.orangeText : COLORS.text, fontSize: 11, fontWeight: '700' }}>{type === 'txt' ? '.txt' : type === 'pdf' ? '.pdf' : type === 'open' ? 'Open' : 'Print'}</Text></Pressable>)}
          </View>
        </View>)}
        {!bills.length ? <View style={styles.card}><Text style={{ color: COLORS.muted, textAlign: 'center' }}>No bills found for this date.</Text></View> : null}
      </ScrollView>
      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0006', padding: 20 }}>
          <View style={{ maxHeight: '85%', borderRadius: 16, backgroundColor: '#fff', padding: 16 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Bill #{selected?.billNo}</Text>
            <ScrollView><Text style={{ fontFamily: 'monospace', color: COLORS.text, lineHeight: 18 }}>{selected ? buildMobileReceipt(shop, selected.items, selected.billNo, selected.createdAt).text : ''}</Text></ScrollView>
            <Button title="Close" variant="light" onPress={() => setSelected(null)} style={{ marginTop: 10, borderWidth: 1, borderColor: COLORS.border }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
