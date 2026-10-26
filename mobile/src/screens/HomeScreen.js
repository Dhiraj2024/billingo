import React, { useMemo, useState } from 'react';
import { Alert, Modal, PermissionsAndroid, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useBilling } from '../context/BillingContext';
import { Button, COLORS, PageTitle, styles } from '../components/Ui';
import { buildMobileReceipt, connectBluetoothPrinter, scanBluetoothPrinters } from '../utils/blePrinter';
import { printReceiptPdf } from '../utils/expoPdfPrint';

const qtyOptions = (visibleIn) => visibleIn === 'OPEN' ? [{ label: '½', value: 0.5 }, { label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }] : [1, 2, 3, 4].map((value) => ({ label: String(value), value }));

export default function HomeScreen({ navigation }) {
  const { isAuthed, items, cart, total, user, setItemQty, saveBill, clearCart, printer, setPrinter } = useBilling();
  const [type, setType] = useState('OPEN');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [devices, setDevices] = useState([]);
  const [scanModal, setScanModal] = useState(false);

  const visible = useMemo(() => items.filter((item) => item.visibleIn === type &&
    `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [items, type, query]);
  const shop = { shopName: user?.shopName, address: user?.address, mobNo: user?.mobNo, endMsg: user?.endMsg };

  if (!isAuthed) return <View style={[styles.page, { padding: 20, justifyContent: 'center' }]}><Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text }}>Sign in to start billing</Text><Button title="Open login" onPress={() => navigation.navigate('Auth')} style={{ marginTop: 14 }} /></View>;

  const requestBluetoothPermissions = async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return true;
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
  };

  const findPrinter = async () => {
    setBusy('scan');
    try {
      if (!(await requestBluetoothPermissions())) throw new Error('Bluetooth permission is required to find a printer.');
      const found = await scanBluetoothPrinters();
      if (!found.length) throw new Error('No Bluetooth printer found. Check that it is powered on and paired.');
      setDevices(found);
      setScanModal(true);
    } catch (error) {
      Alert.alert('Printer search', error.message);
    } finally {
      setBusy('');
    }
  };

  const choosePrinter = async (device) => {
    setBusy('connect');
    try {
      const connected = await connectBluetoothPrinter(device.id);
      setPrinter(connected);
      setScanModal(false);
      Alert.alert('Printer connected', connected.name || 'Bluetooth printer is ready.');
    } catch (error) {
      Alert.alert('Could not connect', error.message);
    } finally {
      setBusy('');
    }
  };

  const shareTxtReceipt = async (bill) => {
    const { text } = buildMobileReceipt(shop, cart, bill.billNo, bill.createdAt);
    const uri = `${FileSystem.cacheDirectory}Bill_${bill.billNo}.txt`;
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Share thermal receipt text' });
    else Alert.alert('Receipt saved', `Text receipt saved at ${uri}`);
  };

  const handleThermal = async () => {
    setBusy('txt');
    try {
      const bill = await saveBill('TXT');
      if (printer) {
        const { printBluetoothReceipt } = await import('../utils/blePrinter');
        await printBluetoothReceipt(shop, cart, bill.billNo);
      } else {
        await shareTxtReceipt(bill);
        Alert.alert('Bill saved', 'Bill saved to history. Choose a thermal printer app such as RawBT to print the shared text file.');
      }
      clearCart();
    } catch (error) {
      Alert.alert('Unable to print', error.message);
    } finally {
      setBusy('');
    }
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      const bill = await saveBill('PDF');
      await printReceiptPdf(shop, cart, bill.billNo, bill.createdAt);
      clearCart();
    } catch (error) {
      Alert.alert('Unable to create PDF', error.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <PageTitle eyebrow={`Good day, ${user?.ownerName || 'Shopkeeper'}`} title="Create a bill" subtitle="Tap a quantity to add an item. Tap it again to remove it." />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Button title={busy === 'scan' ? 'Searching...' : printer?.name || 'Connect printer'} onPress={findPrinter} variant="light" disabled={Boolean(busy)} style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border }} />
          {printer ? <Button title="Disconnect" variant="light" onPress={async () => { const { disconnectBluetoothPrinter } = await import('../utils/blePrinter'); await disconnectBluetoothPrinter(); setPrinter(null); }} style={{ borderWidth: 1, borderColor: COLORS.border }} /> : null}
        </View>
        <View style={styles.card}>
          <Text style={{ fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>Search items</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Item or category..." placeholderTextColor="#94A3B8" style={{ minHeight: 42, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 11, color: COLORS.text }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {['OPEN', 'PACK'].map((kind) => <Pressable key={kind} onPress={() => setType(kind)} style={{ flex: 1, padding: 11, borderRadius: 10, alignItems: 'center', backgroundColor: type === kind ? (kind === 'OPEN' ? COLORS.green : COLORS.orange) : (kind === 'OPEN' ? COLORS.greenLight : COLORS.orangeLight) }}><Text style={{ color: type === kind ? '#fff' : (kind === 'OPEN' ? COLORS.greenText : COLORS.orangeText), fontWeight: '800' }}>{kind === 'OPEN' ? '⚖ OPEN · Khula' : '📦 PACK · Packet'}</Text></Pressable>)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {visible.map((item) => {
            const current = cart.find((entry) => entry.itemId === item._id)?.qty;
            const color = type === 'OPEN' ? COLORS.greenText : COLORS.orangeText;
            const selectedColor = type === 'OPEN' ? COLORS.green : COLORS.orange;
            return (
              <View key={item._id} style={[styles.card, { width: '48.5%', padding: 10 }]}>
                <Text numberOfLines={1} style={{ fontWeight: '700', color: COLORS.text }}>{item.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{item.category} · ₹{Number(item.price).toFixed(2)}/{item.unit}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 9 }}>
                  {qtyOptions(type).map(({ label, value }) => <Pressable key={label} onPress={() => setItemQty(item, value)} style={{ minWidth: 28, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 5, borderRadius: 7, backgroundColor: current === value ? selectedColor : type === 'OPEN' ? COLORS.greenLight : COLORS.orangeLight }}><Text style={{ color: current === value ? '#fff' : color, fontWeight: '700', fontSize: 12 }}>{label}</Text></Pressable>)}
                </View>
              </View>
            );
          })}
        </View>
        {!visible.length ? <View style={styles.card}><Text style={{ textAlign: 'center', color: COLORS.muted }}>No items found. Add items from Admin.</Text></View> : null}
        {cart.length > 0 ? <View style={styles.card}><Text style={{ fontWeight: '700', marginBottom: 5 }}>Current bill</Text>{cart.map((item) => <Text key={item.itemId} style={{ color: COLORS.muted, paddingVertical: 3 }}>{item.qty} × {item.name} · ₹{(item.price * item.qty).toFixed(2)}</Text>)}</View> : null}
      </ScrollView>
      <View style={{ padding: 12, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}><Text style={{ color: COLORS.muted }}>{cart.length} items</Text><Text style={{ fontSize: 19, fontWeight: '800', color: COLORS.text }}>₹{total.toFixed(2)}</Text></View>
        <View style={{ flexDirection: 'row', gap: 8 }}><Button title={busy === 'txt' ? 'Saving...' : 'Thermal .txt'} onPress={handleThermal} disabled={!cart.length || Boolean(busy)} style={{ flex: 1 }} /><Button title={busy === 'pdf' ? 'Saving...' : 'Print PDF'} variant="orange" onPress={handlePdf} disabled={!cart.length || Boolean(busy)} style={{ flex: 1 }} /></View>
      </View>
      <Modal visible={scanModal} transparent animationType="slide" onRequestClose={() => setScanModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }}>
          <View style={{ maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12, color: COLORS.text }}>Choose a printer</Text>
            <ScrollView>{devices.map((device) => <Pressable key={device.id} onPress={() => choosePrinter(device)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: COLORS.border }}><Text style={{ fontWeight: '700', color: COLORS.text }}>{device.name || device.localName}</Text><Text style={{ fontSize: 12, color: COLORS.muted }}>{device.id}</Text></Pressable>)}</ScrollView>
            <Button title="Cancel" variant="light" onPress={() => setScanModal(false)} style={{ marginTop: 12, borderWidth: 1, borderColor: COLORS.border }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
