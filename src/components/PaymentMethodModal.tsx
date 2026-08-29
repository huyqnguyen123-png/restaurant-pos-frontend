import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BanknotesIcon, CreditCardIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { PaymentMethod } from '../types/order';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: PaymentMethod) => void;
}

export default function PaymentMethodModal({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <XMarkIcon size={22} color="#374151" />
          </TouchableOpacity>

          <Text style={styles.title}>Choose payment method</Text>

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.option} onPress={() => onSelect('CASH')}>
              <View style={styles.iconCircle}>
                <BanknotesIcon size={32} color="#16a34a" />
              </View>
              <Text style={styles.optionLabel}>Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={() => onSelect('CARD')}>
              <View style={styles.iconCircle}>
                <CreditCardIcon size={32} color="#2563eb" />
              </View>
              <Text style={styles.optionLabel}>Card</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#111827',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  option: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});