import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';
const BillingContext = createContext(null);

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used inside BillingProvider');
  return context;
};

export function BillingProvider({ children }) {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [bills, setBills] = useState([]);
  const [printer, setPrinter] = useState(null);

  const request = useCallback(async (path, options = {}, authToken = token) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.message || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return result;
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [me, itemList, categoryList] = await Promise.all([
      request('/auth/me'), request('/items'), request('/categories'),
    ]);
    setUser(me.user);
    setItems(itemList);
    setCategories(categoryList);
  }, [token, request]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('billingo_token')
      .then(async (storedToken) => {
        if (!active) return;
        if (storedToken) {
          setToken(storedToken);
          const [me, itemList, categoryList] = await Promise.all([
            request('/auth/me', {}, storedToken),
            request('/items', {}, storedToken),
            request('/categories', {}, storedToken),
          ]);
          if (active) {
            setUser(me.user);
            setItems(itemList);
            setCategories(categoryList);
          }
        }
      })
      .catch(async (error) => {
        console.warn('Could not restore mobile account:', error.message);
        if (error.status === 401 || error.status === 404) {
          await AsyncStorage.removeItem('billingo_token');
          if (active) setToken(null);
        }
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const authenticate = async (mode, payload) => {
    const result = await request(`/auth/${mode}`, {
      method: 'POST', body: JSON.stringify(payload),
    }, null);
    await AsyncStorage.setItem('billingo_token', result.token);
    setToken(result.token);
    setUser(result.user);
    const [itemList, categoryList] = await Promise.all([
      request('/items', {}, result.token), request('/categories', {}, result.token),
    ]);
    setItems(itemList);
    setCategories(categoryList);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('billingo_token');
    setToken(null);
    setUser(null);
    setItems([]);
    setCategories([]);
    setBills([]);
    setCart([]);
  };

  const addItem = async (payload) => {
    const item = await request('/items', { method: 'POST', body: JSON.stringify(payload) });
    setItems((current) => [...current, item]);
    await request('/categories').then(setCategories);
  };
  const updateItem = async (id, payload) => {
    const item = await request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setItems((current) => current.map((entry) => entry._id === id ? item : entry));
    await request('/categories').then(setCategories);
  };
  const deleteItem = async (id) => {
    await request(`/items/${id}`, { method: 'DELETE' });
    setItems((current) => current.filter((entry) => entry._id !== id));
  };
  const addCategory = async (payload) => {
    const category = await request('/categories', { method: 'POST', body: JSON.stringify(payload) });
    setCategories((current) => current.some((entry) => entry._id === category._id) ? current : [...current, category]);
  };
  const updateProfile = async (payload) => {
    const result = await request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) });
    setUser(result.user);
  };
  const setItemQty = (item, qty) => setCart((current) => {
    const found = current.find((entry) => entry.itemId === item._id);
    if (found?.qty === qty) return current.filter((entry) => entry.itemId !== item._id);
    const next = { itemId: item._id, name: item.name, category: item.category, visibleIn: item.visibleIn, unit: item.unit, price: Number(item.price), qty };
    return found ? current.map((entry) => entry.itemId === item._id ? next : entry) : [...current, next];
  });
  const total = useMemo(() => Math.round(cart.reduce(
    (sum, item) => sum + Math.round(item.qty * item.price * 100) / 100,
    0
  ) * 100) / 100, [cart]);
  const saveBill = async (format) => {
    if (!cart.length) throw new Error('Add an item before saving a bill');
    return request('/bills', {
      method: 'POST',
      body: JSON.stringify({
        items: cart.map((item) => ({ ...item, amount: Math.round(item.qty * item.price * 100) / 100 })),
        totalAmount: total,
        format,
      }),
    });
  };
  const fetchBills = async (filters) => {
    const query = new URLSearchParams(filters).toString();
    const result = await request(`/bills${query ? `?${query}` : ''}`);
    setBills(result);
    return result;
  };

  const value = {
    token, user, items, categories, cart, bills, total, printer, setPrinter, ready, isAuthed: Boolean(token),
    request, refresh, authenticate, logout, addItem, updateItem, deleteItem, addCategory, updateProfile,
    setItemQty, saveBill, fetchBills, clearCart: () => setCart([]),
  };
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}
