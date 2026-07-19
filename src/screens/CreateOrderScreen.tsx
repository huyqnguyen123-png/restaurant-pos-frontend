import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { orderApi } from '../api/orderApi';
import { OrderType } from '../types/order';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrder'>;

export default function CreateOrderScreen({ navigation }: Props) {
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (orderType === 'DINE_IN') {
      const tableNum = parseInt(tableNumber, 10);
      if (isNaN(tableNum) || tableNum <= 0) {
        Alert.alert('Validation error', 'Please enter a valid table number');
        return;
      }
    } else {
      if (!customerName.trim()) {
        Alert.alert('Validation error', 'Please enter a customer name');
        return;
      }
    }

    try {
      setSubmitting(true);
      const created = await orderApi.createOrder({
        orderType,
        tableNumber: orderType === 'DINE_IN' ? parseInt(tableNumber, 10) : undefined,
        customerName: orderType === 'TAKEAWAY' ? customerName.trim() : undefined,
      });
      // Replace this screen with OrderDetail so the back button
      // returns to Home instead of back to the create-order form.
      navigation.replace('OrderDetail', { orderId: created.id });
    } catch (error: any) {
      const serverMessage = error?.response?.data?.error;
      Alert.alert('Error', serverMessage || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Order</Text>

      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeButton, orderType === 'DINE_IN' && styles.typeButtonActive]}
          onPress={() => setOrderType('DINE_IN')}
        >
          <Text style={[styles.typeButtonText, orderType === 'DINE_IN' && styles.typeButtonTextActive]}>
            Dine-in
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, orderType === 'TAKEAWAY' && styles.typeButtonActive]}
          onPress={() => setOrderType('TAKEAWAY')}
        >
          <Text style={[styles.typeButtonText, orderType === 'TAKEAWAY' && styles.typeButtonTextActive]}>
            Takeaway
          </Text>
        </TouchableOpacity>
      </View>

      {orderType === 'DINE_IN' ? (
        <TextInput
          style={styles.input}
          placeholder="Table number"
          value={tableNumber}
          onChangeText={setTableNumber}
          keyboardType="numeric"
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="Customer name"
          value={customerName}
          onChangeText={setCustomerName}
        />
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreate}
        disabled={submitting}
      >
        <Text style={styles.createButtonText}>
          {submitting ? 'Creating...' : 'Create Order'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    fontWeight: '600',
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});