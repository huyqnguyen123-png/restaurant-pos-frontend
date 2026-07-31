import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReceiptPercentIcon } from 'react-native-heroicons/outline';
import { RootStackParamList } from '../navigation/types';
import { orderApi } from '../api/orderApi';
import { OrderDetail, OrderItem, PaymentMethod } from '../types/order';
import { formatCurrency } from '../utils/format';
import AddItemSearch from '../components/AddItemSearch';
import ReceiptModal from '../components/ReceiptModal';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});

  const [editingInfo, setEditingInfo] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [receiptVisible, setReceiptVisible] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await orderApi.getOrder(orderId);
      setOrder(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrder().finally(() => setLoading(false));
    }, [loadOrder])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setReceiptVisible(true)} style={styles.headerButton}>
          <ReceiptPercentIcon size={24} color="#2563eb" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, order]);

  const isOpen = order?.status === 'OPEN';
  const unpaidItems = order?.items.filter((i) => !i.paid) ?? [];
  const allPaid = order !== null && order.items.length > 0 && unpaidItems.length === 0;
  const currentPaymentMethod: PaymentMethod | null =
    order?.status === 'PAID' ? order.items[0]?.paymentMethod ?? null : null;

  // Live running total of exactly what's currently selected in Split Bill
  // mode, honoring any partial quantity chosen per item (not just the
  // item's full subtotal) — recalculated on every render as selections change.
  const splitSelectedTotal = order
    ? selectedItemIds.reduce((sum, id) => {
        const item = order.items.find((i) => i.id === id);
        if (!item) return sum;
        const qty = selectedQuantities[id] ?? item.quantity;
        return sum + item.unitPrice * qty;
      }, 0)
    : 0;

  const handleAddItem = async (menuItemId: number) => {
    try {
      setBusy(true);
      const updated = await orderApi.addItem(orderId, menuItemId, 1);
      setOrder(updated);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to add item');
    } finally {
      setBusy(false);
    }
  };

  const handleAddCustomItem = async (name: string, price: number, quantity: number, note: string) => {
    try {
      setBusy(true);
      const updated = await orderApi.addCustomItem(orderId, name, price, quantity, note);
      setOrder(updated);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to add custom item');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeQuantity = async (item: OrderItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      handleRemoveItem(item);
      return;
    }
    try {
      setBusy(true);
      const updated = await orderApi.updateItemQuantity(orderId, item.id, newQuantity);
      setOrder(updated);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update quantity');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = (item: OrderItem) => {
    Alert.alert('Remove item', `Remove "${item.itemName}" from this order?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const updated = await orderApi.removeItem(orderId, item.id);
            setOrder(updated);
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to remove item');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const toggleItemSelection = (item: OrderItem) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(item.id)) {
        setSelectedQuantities((q) => {
          const next = { ...q };
          delete next[item.id];
          return next;
        });
        return prev.filter((id) => id !== item.id);
      }
      setSelectedQuantities((q) => ({ ...q, [item.id]: item.quantity }));
      return [...prev, item.id];
    });
  };

  const adjustSelectedQuantity = (item: OrderItem, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[item.id] ?? item.quantity;
      const next = Math.min(item.quantity, Math.max(1, current + delta));
      return { ...prev, [item.id]: next };
    });
  };

  const promptPaymentMethod = (onChoose: (method: PaymentMethod) => void) => {
    Alert.alert('Choose payment method', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Cash', onPress: () => onChoose('CASH') },
      { text: 'Card', onPress: () => onChoose('CARD') },
    ]);
  };

  const handlePayFull = () => {
    promptPaymentMethod(async (method) => {
      try {
        setBusy(true);
        const updated = await orderApi.createPayment(orderId, method);
        setOrder(updated);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.error || 'Failed to process payment');
      } finally {
        setBusy(false);
      }
    });
  };

  const handlePaySelected = () => {
    if (selectedItemIds.length === 0) {
      Alert.alert('No items selected', 'Select at least one item to pay for.');
      return;
    }
    const items = selectedItemIds.map((id) => ({
      orderItemId: id,
      quantity: selectedQuantities[id] ?? 1,
    }));

    promptPaymentMethod(async (method) => {
      try {
        setBusy(true);
        const updated = await orderApi.createPayment(orderId, method, items);
        setOrder(updated);
        setSelectedItemIds([]);
        setSelectedQuantities({});
        setSplitMode(false);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.error || 'Failed to process payment');
      } finally {
        setBusy(false);
      }
    });
  };

  const startInfoEdit = () => {
    if (!order) return;
    setEditValue(
      order.orderType === 'DINE_IN' ? String(order.tableNumber ?? '') : order.customerName ?? ''
    );
    setEditingInfo(true);
  };

  const cancelInfoEdit = () => {
    setEditingInfo(false);
    setEditValue('');
  };

  const saveInfoEdit = async () => {
    if (!order) return;

    if (order.orderType === 'DINE_IN') {
      const num = parseInt(editValue, 10);
      if (isNaN(num) || num <= 0) {
        Alert.alert('Validation error', 'Please enter a valid table number');
        return;
      }
      try {
        setSavingInfo(true);
        const updated = await orderApi.updateOrderInfo(orderId, { tableNumber: num });
        setOrder(updated);
        setEditingInfo(false);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.error || 'Failed to update order');
      } finally {
        setSavingInfo(false);
      }
    } else {
      if (!editValue.trim()) {
        Alert.alert('Validation error', 'Please enter a customer name');
        return;
      }
      try {
        setSavingInfo(true);
        const updated = await orderApi.updateOrderInfo(orderId, { customerName: editValue.trim() });
        setOrder(updated);
        setEditingInfo(false);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.error || 'Failed to update order');
      } finally {
        setSavingInfo(false);
      }
    }
  };

  const handleChangePaymentMethod = () => {
    Alert.alert('Change payment method', 'Correct the payment method for this order', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Cash', onPress: () => doChangePaymentMethod('CASH') },
      { text: 'Card', onPress: () => doChangePaymentMethod('CARD') },
    ]);
  };

  const doChangePaymentMethod = async (method: PaymentMethod) => {
    try {
      setBusy(true);
      const updated = await orderApi.updatePaymentMethod(orderId, method);
      setOrder(updated);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update payment method');
    } finally {
      setBusy(false);
    }
  };

  const startNoteEdit = (item: OrderItem) => {
    setEditingNoteItemId(item.id);
    setNoteInput(item.notes ?? '');
  };

  const cancelNoteEdit = () => {
    setEditingNoteItemId(null);
    setNoteInput('');
  };

  const saveNoteEdit = async (item: OrderItem) => {
    try {
      setSavingNote(true);
      const updated = await orderApi.updateItemNotes(orderId, item.id, noteInput.trim());
      setOrder(updated);
      setEditingNoteItemId(null);
      setNoteInput('');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading || !order) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  const label =
    order.orderType === 'DINE_IN'
      ? `Table ${order.tableNumber}`
      : `Takeaway - ${order.customerName}`;

  const renderItem = ({ item }: { item: OrderItem }) => {
    const isSelected = selectedItemIds.includes(item.id);
    const selectedQty = selectedQuantities[item.id] ?? item.quantity;
    const isEditingNote = editingNoteItemId === item.id;

    return (
      <View style={styles.itemRow}>
        {splitMode && !item.paid && (
          <TouchableOpacity
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
            onPress={() => toggleItemSelection(item)}
          >
            {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
          </TouchableOpacity>
        )}

        <View style={styles.itemInfo}>
          <View style={styles.itemNameRow}>
            <Text style={styles.itemName}>{item.itemName}</Text>
            {item.custom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemMeta}>
            {formatCurrency(item.unitPrice)} x {item.quantity}
            {item.paid ? `  •  Paid (${item.paymentMethod})` : ''}
          </Text>

          {isEditingNote ? (
            <View style={styles.noteEditRow}>
              <TextInput
                style={styles.noteInput}
                placeholder="Note, e.g. no chili"
                value={noteInput}
                onChangeText={setNoteInput}
                autoFocus
              />
              <TouchableOpacity
                style={styles.noteSaveButton}
                onPress={() => saveNoteEdit(item)}
                disabled={savingNote}
              >
                <Text style={styles.noteButtonText}>{savingNote ? '...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.noteCancelButton} onPress={cancelNoteEdit} disabled={savingNote}>
                <Text style={styles.noteButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {item.notes ? (
                <Text style={styles.noteText}>📝 {item.notes}</Text>
              ) : null}
              {!splitMode && (
                <TouchableOpacity onPress={() => startNoteEdit(item)} style={styles.noteLinkTouch}>
                  <Text style={styles.noteLink}>{item.notes ? 'Edit note' : 'Add note'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {splitMode && isSelected && item.quantity > 1 && (
            <View style={styles.splitQtyRow}>
              <Text style={styles.splitQtyLabel}>Pay for</Text>
              <TouchableOpacity style={styles.qtyButton} onPress={() => adjustSelectedQuantity(item, -1)}>
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{selectedQty}</Text>
              <TouchableOpacity style={styles.qtyButton} onPress={() => adjustSelectedQuantity(item, 1)}>
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.splitQtyLabel}>of {item.quantity}</Text>
            </View>
          )}
        </View>

        {!item.paid && !splitMode && isOpen && (
          <View style={styles.qtyControls}>
            <TouchableOpacity style={styles.qtyButton} onPress={() => handleChangeQuantity(item, -1)} disabled={busy}>
              <Text style={styles.qtyButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qtyButton} onPress={() => handleChangeQuantity(item, 1)} disabled={busy}>
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {editingInfo ? (
            <View style={styles.editInfoRow}>
              <TextInput
                style={styles.editInfoInput}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType={order.orderType === 'DINE_IN' ? 'numeric' : 'default'}
                autoFocus
              />
              <TouchableOpacity style={styles.smallSaveButton} onPress={saveInfoEdit} disabled={savingInfo}>
                <Text style={styles.smallButtonText}>{savingInfo ? '...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallCancelButton} onPress={cancelInfoEdit} disabled={savingInfo}>
                <Text style={styles.smallButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{label}</Text>
              <TouchableOpacity onPress={startInfoEdit}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={[styles.status, order.status === 'PAID' && styles.statusPaid]}>
          {order.status}
        </Text>
      </View>

      {order.status === 'PAID' && currentPaymentMethod && (
        <View style={styles.paymentMethodRow}>
          <Text style={styles.paymentMethodLabel}>Paid via {currentPaymentMethod}</Text>
          <TouchableOpacity onPress={handleChangePaymentMethod} disabled={busy}>
            <Text style={styles.editLink}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {isOpen && <AddItemSearch onAddItem={handleAddItem} onAddCustomItem={handleAddCustomItem} disabled={busy} />}

      <FlatList
        data={order.items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No items yet. Search above to add one.</Text>}
      />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatCurrency(order.totalAmount)}</Text>
      </View>

      {isOpen && !allPaid && order.items.length > 0 && (
        <View>
          {splitMode && (
            <View style={styles.splitTotalRow}>
              <Text style={styles.splitTotalLabel}>Selected total ({selectedItemIds.length} item{selectedItemIds.length === 1 ? '' : 's'})</Text>
              <Text style={styles.splitTotalAmount}>{formatCurrency(splitSelectedTotal)}</Text>
            </View>
          )}
          <View style={styles.paymentSection}>
            {!splitMode ? (
              <>
                <TouchableOpacity style={styles.payButton} onPress={handlePayFull} disabled={busy}>
                  <Text style={styles.payButtonText}>Pay Full Bill</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.splitButton} onPress={() => setSplitMode(true)} disabled={busy}>
                  <Text style={styles.splitButtonText}>Split Bill</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.payButton} onPress={handlePaySelected} disabled={busy}>
                  <Text style={styles.payButtonText}>Pay Selected</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelSplitButton}
                  onPress={() => {
                    setSplitMode(false);
                    setSelectedItemIds([]);
                    setSelectedQuantities({});
                  }}
                  disabled={busy}
                >
                  <Text style={styles.cancelSplitButtonText}>Cancel Split</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      <ReceiptModal
        visible={receiptVisible}
        order={order}
        onClose={() => setReceiptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  loader: {
    flex: 1,
    marginTop: 40,
  },
  headerButton: {
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
    backgroundColor: '#fff',
  },
  editInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editInfoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
  },
  smallSaveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallCancelButton: {
    backgroundColor: '#9ca3af',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#fff',
  },
  statusPaid: {
    color: '#16a34a',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    backgroundColor: '#f0fdf4',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  customBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  itemMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    color: '#7c3aed',
    fontStyle: 'italic',
    backgroundColor: '#fff',
    marginTop: 4,
  },
  noteLinkTouch: {
    marginTop: 4,
  },
  noteLink: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    backgroundColor: '#fff',
  },
  noteEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
  },
  noteSaveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noteCancelButton: {
    backgroundColor: '#9ca3af',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    minWidth: 70,
    textAlign: 'right',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyValue: {
    marginHorizontal: 8,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 18,
    textAlign: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  splitQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  splitQtyLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: '#333',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  splitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  splitTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    backgroundColor: '#fffbeb',
  },
  splitTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    backgroundColor: '#fffbeb',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  paymentSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  payButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  splitButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  splitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelSplitButton: {
    flex: 1,
    backgroundColor: '#9ca3af',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelSplitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});