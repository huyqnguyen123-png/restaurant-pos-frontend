import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import MenuManagementScreen from '../screens/MenuManagementScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: 'New Order' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen
        name="MenuManagement"
        component={MenuManagementScreen}
        options={{ title: 'Menu Management' }}
      />
    </Stack.Navigator>
  );
}