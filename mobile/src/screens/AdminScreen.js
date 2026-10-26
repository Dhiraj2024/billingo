import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useBilling } from '../context/BillingContext';
import { Button, COLORS, Field, PageTitle, styles } from '../components/Ui';

export default function AdminScreen({ navigation }) {
  const { isAuthed, items, categories, addItem, updateItem, deleteItem, addCategory } = useBilling();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ visibleIn: 'OPEN', category: '', name: '', price: '', unit: 'Kg' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!isAuthed) return <View style={[styles.page, { padding: 20, justifyContent: 'center' }]}><Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800' }}>Sign in to manage items</Text><Button title="Open login" onPress={() => navigation.navigate('Auth')} style={{ marginTop: 14 }} /></View>;

  const openItem = (visibleIn, category = '', editing = null) => {
    setForm(editing
      ? { visibleIn: editing.visibleIn, category: editing.category, name: editing.name, price: String(editing.price), unit: editing.unit }
      : { visibleIn, category, name: '', price: '', unit: visibleIn === 'PACK' ? 'Piece' : 'Kg' });
    setError('');
    setModal({ type: 'item', editing });
  };
  const openCategory = (visibleIn) => {
    setForm({ visibleIn, category: '', name: '', price: '', unit: visibleIn === 'PACK' ? 'Piece' : 'Kg' });
    setError('');
    setModal({ type: 'category' });
  };
  const save = async () => {
    setError('');
    setBusy(true);
    try {
      if (modal.type === 'category') {
        await addCategory({ visibleIn: form.visibleIn, name: form.category.trim() });
      } else {
        const payload = { ...form, category: form.category.trim(), name: form.name.trim(), price: Number(form.price) };
        if (!payload.category || !payload.name || !Number.isFinite(payload.price) || payload.price < 0) throw new Error('Enter a category, item name, and valid price.');
        if (modal.editing) await updateItem(modal.editing._id, payload);
        else await addItem(payload);
      }
      setModal(null);
    } catch (err) {
      setError(err.message || 'Unable to save');
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = (item) => Alert.alert('Delete item?', `Remove ${item.name}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteItem(item._id); } catch (error) { Alert.alert('Error', error.message); } } },
  ]);

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PageTitle eyebrow="Inventory" title="Admin dashboard" subtitle="Keep your loose and packaged products up to date." />
        {['OPEN', 'PACK'].map((type) => {
          const themed = type === 'OPEN';
          const cats = categories.filter((category) => category.visibleIn === type);
          const groupColor = themed ? COLORS.greenText : COLORS.orangeText;
          return <View key={type} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 17, color: groupColor }}>{themed ? 'OPEN · Kg / Liter' : 'PACK · Piece'}</Text>
              <Pressable onPress={() => openCategory(type)}><Text style={{ color: groupColor, fontWeight: '700' }}>+ Category</Text></Pressable>
            </View>
            {cats.map((category) => {
              const matching = items.filter((item) => item.visibleIn === type && item.category === category.name);
              return <View key={category._id} style={{ marginBottom: 12, padding: 10, backgroundColor: themed ? '#F0FDF4' : '#FFF7ED', borderRadius: 11 }}>
                <Text style={{ color: COLORS.text, fontWeight: '800', marginBottom: 5 }}>{category.name}</Text>
                {matching.map((item) => <View key={item._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderColor: themed ? '#DCFCE7' : '#FFEDD5' }}>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: COLORS.text }}>{item.name}</Text><Text style={{ color: COLORS.muted, fontSize: 12 }}>₹{Number(item.price).toFixed(2)} / {item.unit}</Text></View>
                  <Pressable onPress={() => openItem(type, category.name, item)} style={{ padding: 7 }}><Text style={{ color: groupColor, fontWeight: '700' }}>Edit</Text></Pressable>
                  <Pressable onPress={() => confirmDelete(item)} style={{ padding: 7 }}><Text style={{ color: '#DC2626', fontWeight: '700' }}>Delete</Text></Pressable>
                </View>)}
                <Pressable onPress={() => openItem(type, category.name)} style={{ marginTop: 5, paddingVertical: 6 }}><Text style={{ color: groupColor, fontWeight: '700' }}>+ Add item</Text></Pressable>
              </View>;
            })}
            {!cats.length ? <Text style={{ color: COLORS.muted, textAlign: 'center', paddingVertical: 10 }}>No categories created</Text> : null}
          </View>;
        })}
      </ScrollView>
      <Modal visible={Boolean(modal)} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }}>
          <View style={{ maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#fff', padding: 20 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 14 }}>{modal?.type === 'category' ? 'Add category' : modal?.editing ? 'Edit item' : 'Add item'}</Text>
              <Text style={{ color: COLORS.text, fontWeight: '700', marginBottom: 7 }}>Visible in</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {['OPEN', 'PACK'].map((type) => <Pressable key={type} onPress={() => setForm({ ...form, visibleIn: type, unit: type === 'PACK' ? 'Piece' : 'Kg' })} style={{ flex: 1, alignItems: 'center', padding: 11, borderRadius: 9, backgroundColor: form.visibleIn === type ? (type === 'OPEN' ? COLORS.greenLight : COLORS.orangeLight) : '#F1F5F9' }}><Text style={{ fontWeight: '700', color: type === 'OPEN' ? COLORS.greenText : COLORS.orangeText }}>{type === 'OPEN' ? '⚖ OPEN' : '📦 PACK'}</Text></Pressable>)}
              </View>
              <Field label="Category name" value={form.category} onChangeText={(category) => setForm({ ...form, category })} placeholder="e.g. Masala" />
              {modal?.type !== 'category' ? <>
                <Field label="Item name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="e.g. Haldi" />
                <Field label="Price (₹)" value={form.price} onChangeText={(price) => setForm({ ...form, price })} placeholder="0.00" keyboardType="decimal-pad" />
                <Text style={{ color: COLORS.text, fontWeight: '700', marginBottom: 7 }}>Unit</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>{['Kg', 'Piece', 'Liter'].map((unit) => <Pressable key={unit} onPress={() => setForm({ ...form, unit })} style={{ flex: 1, alignItems: 'center', padding: 10, borderWidth: 1, borderColor: form.unit === unit ? COLORS.green : COLORS.border, borderRadius: 9 }}><Text style={{ fontWeight: '600', color: COLORS.text }}>{unit}</Text></Pressable>)}</View>
              </> : null}
              {error ? <Text style={{ color: '#DC2626', marginBottom: 10 }}>{error}</Text> : null}
              <Button title={busy ? 'Saving...' : modal?.type === 'category' ? 'Add category' : 'Save item'} onPress={save} disabled={busy} />
              <Button title="Cancel" variant="light" onPress={() => setModal(null)} style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.border }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
