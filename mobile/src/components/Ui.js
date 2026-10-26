import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const COLORS = {
  bg: '#F8FAFC', text: '#1E293B', muted: '#64748B', border: '#E2E8F0',
  green: '#059669', greenLight: '#DCFCE7', greenText: '#065F46',
  orange: '#F97316', orangeLight: '#FFEDD5', orangeText: '#9A3412',
};

export function Button({ title, onPress, variant = 'green', disabled = false, style }) {
  const backgroundColor = variant === 'orange' ? COLORS.orange : variant === 'light' ? '#FFFFFF' : COLORS.green;
  const color = variant === 'light' ? COLORS.text : '#FFFFFF';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, { backgroundColor, opacity: disabled ? 0.5 : 1 }, style]}>
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function PageTitle({ eyebrow, title, subtitle }) {
  return <View style={styles.titleWrap}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16, paddingBottom: 20 },
  titleWrap: { marginBottom: 16 },
  eyebrow: { color: COLORS.greenText, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 24 },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  card: { borderRadius: 14, borderColor: COLORS.border, borderWidth: 1, backgroundColor: '#FFFFFF', padding: 14, marginBottom: 12 },
  button: { minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  fieldWrap: { marginBottom: 13 },
  label: { color: COLORS.text, fontWeight: '600', fontSize: 13, marginBottom: 6 },
  input: { minHeight: 45, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: COLORS.text, fontSize: 15 },
  multiline: { minHeight: 75, textAlignVertical: 'top', paddingTop: 11 },
});
