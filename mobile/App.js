import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BillingProvider } from './src/context/BillingContext';
import DrawerNavigator from './src/navigation/DrawerNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <BillingProvider>
        <NavigationContainer>
          <DrawerNavigator />
        </NavigationContainer>
      </BillingProvider>
    </SafeAreaProvider>
  );
}
