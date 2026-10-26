import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useBilling } from '../context/BillingContext';
import HomeScreen from '../screens/HomeScreen';
import AdminScreen from '../screens/AdminScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AccountScreen from '../screens/AccountScreen';
import AuthScreen from '../screens/AuthScreen';
import { COLORS } from '../components/Ui';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { ready, user, isAuthed, logout } = useBilling();
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}><ActivityIndicator color={COLORS.green} /><Text style={{ color: COLORS.muted, marginTop: 10 }}>Loading Billin.go...</Text></View>;
  return (
    <Drawer.Navigator
      initialRouteName={isAuthed ? 'Home' : 'Auth'}
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '800' },
        drawerActiveTintColor: COLORS.greenText,
        drawerActiveBackgroundColor: COLORS.greenLight,
        drawerLabelStyle: { fontWeight: '600' },
        drawerType: 'front',
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Billin.go · New bill' }} />
      <Drawer.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin dashboard' }} />
      <Drawer.Screen name="History" component={HistoryScreen} options={{ title: 'Bill history' }} />
      <Drawer.Screen name="Account" component={AccountScreen} options={{ title: 'Shop account' }} />
      <Drawer.Screen name="Auth" component={AuthScreen} options={{ title: isAuthed ? 'Account' : 'Sign in', drawerLabel: isAuthed ? user?.ownerName || 'Account' : 'Login / Signup' }} />
      {isAuthed ? <Drawer.Screen name="Logout" component={AuthScreen} options={{ drawerLabel: 'Logout' }} listeners={({ navigation }) => ({
        drawerItemPress: (event) => {
          event.preventDefault();
          logout().then(() => navigation.navigate('Auth'));
        },
      })} /> : null}
    </Drawer.Navigator>
  );
}
