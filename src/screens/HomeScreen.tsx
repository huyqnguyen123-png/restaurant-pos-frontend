import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeableRow, { SwipeableRowHandle } from '../components/SwipeableRow';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { orderApi } from '../api/orderApi';
import { OrderSummary } from '../types/order';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function HomeScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const swipeRefs = useRef<Map<number, SwipeableRowHandle>>(new Map());

  const loadOrders = useCallback(async () => {
    try {
      const data = await orderApi.getSummaries('OPEN');
      setOrders(data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders. Check your network connection and backend server.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders().finally(() => setLoading(false));
    }, [loadOrders])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleDeleteOrder = (order: OrderSummary) => {
    const label =
      order.orderType === 'DINE_IN' ? `Table ${order.tableNumber}` : `Takeaway - ${order.customerName}`;

    Alert.alert(
      'Delete order',
      `Permanently delete this order (${label})? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeRefs.current.get(order.id)?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await orderApi.deleteOrder(order.id);
              swipeRefs.current.delete(order.id);
              await loadOrders();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete order');
            }
          },
        },
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: OrderSummary }) => {
    const label =
      item.orderType === 'DINE_IN'
        ? `Table ${item.tableNumber}`
        : `Takeaway - ${item.customerName}`;

    return (
      <SwipeableRow
        ref={(ref) => {
          if (ref) swipeRefs.current.set(item.id, ref);
        }}
        renderRightAction={() => (
          <TouchableOpacity style={styles.swipeDeleteButton} onPress={() => handleDeleteOrder(item)}>
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{label}</Text>
            <View style={[styles.badge, item.orderType === 'DINE_IN' ? styles.badgeDineIn : styles.badgeTakeaway]}>
              <Text style={styles.badgeText}>{item.orderType === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}</Text>
            </View>
          </View>
          <Text style={styles.cardTotal}>{formatCurrency(item.totalAmount)}</Text>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Open Orders</Text>
        <TouchableOpacity
          style={styles.newOrderButton}
          onPress={() => navigation.navigate('CreateOrder')}
        >
          <Text style={styles.newOrderButtonText}>+ New Order</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No open orders. Tap "+ New Order" to create one.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  newOrderButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newOrderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 40,
  },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardTotal: {
    fontSize: 15,
    color: '#333',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDineIn: {
    backgroundColor: '#dbeafe',
  },
  badgeTakeaway: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  swipeDeleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});