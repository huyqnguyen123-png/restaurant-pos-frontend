import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { OrderDetail, OrderItem } from '../types/order';
import { formatCurrency } from '../utils/format';
import { RESTAURANT_NAME, RESTAURANT_ADDRESS } from '../utils/restaurantInfo';

interface Props {
  visible: boolean;
  order: OrderDetail | null;
  onClose: () => void;
}

export default function ReceiptModal({ visible, order, onClose }: Props) {
  useEffect(() => {
    if (visible) {
      StatusBar.setHidden(true, 'fade');
    } else {
      StatusBar.setHidden(false, 'fade');
    }
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [visible]);

  if (!order) return null;

  const mergedItems: OrderItem[] = [];
  for (const item of order.items) {
    const existing = mergedItems.find(
      (m) =>
        m.itemName === item.itemName &&
        m.unitPrice === item.unitPrice &&
        (m.notes ?? '') === (item.notes ?? '')
    );
    if (existing) {
      existing.quantity += item.quantity;
      existing.subtotal += item.subtotal;
    } else {
      mergedItems.push({ ...item });
    }
  }

  const label =
    order.orderType === 'DINE_IN'
      ? `Table ${order.tableNumber}`
      : `Takeaway - ${order.customerName}`;

  const dateStr = new Date(order.createdAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.rotatedWrapper}>
          <View style={styles.receiptPaper}>
            {/* --- fixed header --- */}
            <View>
              <Text style={styles.restaurantName}>{RESTAURANT_NAME}</Text>
              <Text style={styles.restaurantAddress}>{RESTAURANT_ADDRESS}</Text>

              <Text style={styles.dashedLine}>------------------------------</Text>

              <View style={styles.rowBetween}>
                <Text style={styles.receiptTitle}>RECEIPT</Text>
                <Text style={styles.smallText}>{dateStr}</Text>
              </View>
              <Text style={styles.tableLabel}>{label}</Text>

              <Text style={styles.dashedLine}>------------------------------</Text>
            </View>

            {/* --- scrollable middle: item list --- */}
            <ScrollView style={styles.itemsScroll} contentContainerStyle={styles.itemsScrollContent}>
              {mergedItems.map((item) => (
                <View key={item.id} style={styles.itemBlock}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.itemText}>
                      {item.quantity}x {item.itemName}
                    </Text>
                    <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                  {item.notes ? <Text style={styles.itemNote}>  {item.notes}</Text> : null}
                </View>
              ))}
            </ScrollView>

            {/* --- fixed footer: always pinned to the bottom of the receipt --- */}
            <View>
              <Text style={styles.dashedLine}>------------------------------</Text>

              <View style={styles.rowBetween}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>{formatCurrency(order.totalAmount)}</Text>
              </View>

              <Text style={styles.footer}>*****</Text>
              <Text style={styles.footerText}>Thank you for your visit!</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  rotatedWrapper: {
    flex: 1,
    transform: [{ rotate: '180deg' }],
  },
  receiptPaper: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  itemsScroll: {
    flex: 1,
  },
  itemsScrollContent: {
    paddingVertical: 4,
  },
  restaurantName: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    backgroundColor: '#fff',
  },
  restaurantAddress: {
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
    color: '#000',
    backgroundColor: '#fff',
    marginTop: 2,
  },
  dashedLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#000',
    backgroundColor: '#fff',
    textAlign: 'center',
    marginVertical: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptTitle: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#fff',
  },
  smallText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#000',
    backgroundColor: '#fff',
  },
  tableLabel: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#000',
    backgroundColor: '#fff',
    marginTop: 2,
  },
  itemBlock: {
    marginBottom: 6,
  },
  itemText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#000',
    backgroundColor: '#fff',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#000',
    backgroundColor: '#fff',
  },
  itemNote: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#555',
    backgroundColor: '#fff',
  },
  totalLabel: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#fff',
  },
  totalAmount: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#fff',
  },
  footer: {
    fontFamily: 'monospace',
    fontSize: 13,
    textAlign: 'center',
    color: '#000',
    backgroundColor: '#fff',
    marginTop: 14,
  },
  footerText: {
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
    color: '#000',
    backgroundColor: '#fff',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});