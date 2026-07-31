import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeableRow, { SwipeableRowHandle } from '../components/SwipeableRow';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { orderApi } from '../api/orderApi';
import { OrderSummary, PaymentMethod } from '../types/order';
import { formatCurrency } from '../utils/format';
import { isHistoryPasswordSet, verifyHistoryPassword } from '../utils/historyPassword';
import PasswordInput from '../components/PasswordInput';

type FilterOption = 'ALL' | PaymentMethod;
type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DateSection {
  title: string;
  data: OrderSummary[];
}

function groupOrdersByDate(orders: OrderSummary[]): DateSection[] {
  const groups = new Map<string, OrderSummary[]>();
  const labelOrder: string[] = [];

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const label = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
    if (!groups.has(label)) {
      groups.set(label, []);
      labelOrder.push(label);
    }
    groups.get(label)!.push(order);
  }

  return labelOrder.map((label) => ({ title: label, data: groups.get(label)! }));
}

export default function HistoryScreen() {
  const navigation = useNavigation<HistoryNavigationProp>();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const swipeRefs = useRef<Map<number, SwipeableRowHandle>>(new Map());

  // --- password lock state ---
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [locked, setLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Bumped whenever data should be refetched.
  const [reloadTick, setReloadTick] = useState(0);

  // Set to true right before navigating to OrderDetail from this screen, so
  // useFocusEffect below can tell "returning from viewing an order" apart
  // from "the user switched to the History tab" — only the latter re-locks.
  const cameFromDetailRef = useRef(false);

  const loadOrders = useCallback(async (selectedFilter: FilterOption) => {
    try {
      setLoading(true);
      const data = await orderApi.getSummaries(
        'PAID',
        selectedFilter === 'ALL' ? undefined : selectedFilter
      );
      setOrders(data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch (error) {
      Alert.alert('Error', 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handles the lock ONLY. Empty dependency array is intentional: it keeps
  // this effect's identity stable so react-navigation's useFocusEffect only
  // re-runs it on genuine focus/blur transitions.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (cameFromDetailRef.current) {
          cameFromDetailRef.current = false;
          if (!cancelled) setReloadTick((t) => t + 1);
          return;
        }

        try {
          const required = await isHistoryPasswordSet();
          if (cancelled) return;
          setPasswordRequired(required);
          setLocked(required);
          setPasswordInput('');
          setReloadTick((t) => t + 1);
        } catch (error) {
          if (!cancelled) {
            Alert.alert('Error', 'Could not check password status. Check your connection.');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Handles loading data. Runs whenever the filter changes, or whenever the
  // screen unlocks, or reloadTick is bumped by the focus effect above.
  useEffect(() => {
    if (!locked) {
      loadOrders(filter);
    }
  }, [filter, locked, reloadTick, loadOrders]);

  const handleUnlock = async () => {
    try {
      const valid = await verifyHistoryPassword(passwordInput);
      if (valid) {
        setLocked(false);
      } else {
        Alert.alert('Incorrect password', 'Please try again.');
        setPasswordInput('');
      }
    } catch {
      Alert.alert('Error', 'Could not verify password. Check your connection.');
    }
  };

  const handleOpenOrder = (orderId: number) => {
    cameFromDetailRef.current = true;
    navigation.navigate('OrderDetail', { orderId });
  };

  const handleDeleteOrder = (order: OrderSummary) => {
    const label =
      order.orderType === 'DINE_IN' ? `Table ${order.tableNumber}` : `Takeaway - ${order.customerName}`;

    Alert.alert(
      'Delete order',
      `Permanently delete this order (${label})? This removes it from history and cannot be undone.`,
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
              await loadOrders(filter);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete order');
            }
          },
        },
      ]
    );
  };

  const handleDeleteDay = (section: DateSection) => {
    Alert.alert(
      'Delete entire day',
      `Permanently delete all ${section.data.length} order(s) from ${section.title}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await Promise.all(section.data.map((o) => orderApi.deleteOrder(o.id)));
            } catch (error: any) {
              Alert.alert('Error', 'Some orders could not be deleted. The list will refresh to show what remains.');
            } finally {
              setBusy(false);
              await loadOrders(filter);
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
        <TouchableOpacity style={styles.card} onPress={() => handleOpenOrder(item.id)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{label}</Text>
            <Text style={styles.cardTime}>
              {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.cardTotal}>{formatCurrency(item.totalAmount)}</Text>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  const renderSectionHeader = ({ section }: { section: DateSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <TouchableOpacity
        style={styles.sectionDeleteButton}
        onPress={() => handleDeleteDay(section)}
        disabled={busy}
      >
        <Text style={styles.sectionDeleteButtonText}>Delete All</Text>
      </TouchableOpacity>
    </View>
  );

  const filterOptions: { label: string; value: FilterOption }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Card', value: 'CARD' },
  ];

  // --- lock screen ---
  if (passwordRequired && locked) {
    return (
      <SafeAreaView style={styles.lockContainer} edges={['top', 'left', 'right']}>
        <Text style={styles.lockTitle}>History is locked</Text>
        <Text style={styles.lockHint}>Enter the password to view order history</Text>
        <PasswordInput
          style={styles.lockInput}
          placeholder="Password"
          value={passwordInput}
          onChangeText={setPasswordInput}
          autoFocus
          onSubmitEditing={handleUnlock}
        />
        <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
          <Text style={styles.unlockButtonText}>Unlock</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const sections = groupOrdersByDate(orders);
  const filterLabel =
    filter === 'ALL' ? 'All payments' : filter === 'CASH' ? 'Cash payments' : 'Card payments';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Order History</Text>

      <View style={styles.filterRow}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.filterButton, filter === option.value && styles.filterButtonActive]}
            onPress={() => setFilter(option.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === option.value && styles.filterButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!loading && (
        <View style={styles.totalCard}>
          <Text style={styles.totalCardLabel}>{filterLabel}</Text>
          <Text style={styles.totalCardAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderCard}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No paid orders found.</Text>}
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
  lockContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  lockHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  lockInput: {
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: '600',
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  filterButtonTextActive: {
    color: '#fff',
    backgroundColor: '#2563eb',
    borderRadius: 20,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  totalCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  totalCardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  loader: {
    marginTop: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  sectionDeleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionDeleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
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
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardTime: {
    fontSize: 12,
    color: '#999',
  },
  cardTotal: {
    fontSize: 15,
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