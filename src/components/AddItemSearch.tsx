import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { menuApi } from '../api/menuApi';
import { MenuItem } from '../types/menu';
import { formatCurrency } from '../utils/format';

interface Props {
  onAddItem: (menuItemId: number) => void;
  onAddCustomItem: (name: string, price: number, quantity: number) => void;
  disabled?: boolean;
}

export default function AddItemSearch({ onAddItem, onAddCustomItem, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MenuItem[]>([]);
  const [searching, setSearching] = useState(false);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQuantity, setCustomQuantity] = useState('1');

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await menuApi.search(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (item: MenuItem) => {
    onAddItem(item.id);
    setQuery('');
    setResults([]);
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      return;
    }
    const priceNumber = parseFloat(customPrice);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      return;
    }
    const quantityNumber = parseInt(customQuantity, 10);
    const finalQuantity = isNaN(quantityNumber) || quantityNumber < 1 ? 1 : quantityNumber;

    onAddCustomItem(customName.trim(), priceNumber, finalQuantity);
    setCustomName('');
    setCustomPrice('');
    setCustomQuantity('1');
    setShowCustomForm(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search menu item to add..."
        value={query}
        onChangeText={setQuery}
        editable={!disabled}
      />
      {searching && <ActivityIndicator style={styles.spinner} />}
      {results.length > 0 && (
        <View style={styles.resultsBox}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => handleSelect(item)}
                disabled={disabled}
              >
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultPrice}>{formatCurrency(item.price)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {!showCustomForm ? (
        <TouchableOpacity
          style={styles.customToggle}
          onPress={() => setShowCustomForm(true)}
          disabled={disabled}
        >
          <Text style={styles.customToggleText}>+ Add custom item (not in menu)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.customForm}>
          <Text style={styles.customFormTitle}>Custom item (won't be saved to the menu)</Text>
          <View style={styles.customFormRow}>
            <TextInput
              style={[styles.input, styles.customNameInput]}
              placeholder="Item name"
              value={customName}
              onChangeText={setCustomName}
            />
            <TextInput
              style={[styles.input, styles.customPriceInput]}
              placeholder="Price"
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.customQtyInput]}
              placeholder="Qty"
              value={customQuantity}
              onChangeText={setCustomQuantity}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.customFormButtons}>
            <TouchableOpacity
              style={styles.customAddButton}
              onPress={handleAddCustom}
              disabled={disabled}
            >
              <Text style={styles.customAddButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customCancelButton}
              onPress={() => {
                setShowCustomForm(false);
                setCustomName('');
                setCustomPrice('');
                setCustomQuantity('1');
              }}
              disabled={disabled}
            >
              <Text style={styles.customCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  spinner: {
    marginTop: 6,
  },
  resultsBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 180,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultPrice: {
    fontSize: 14,
    color: '#666',
  },
  customToggle: {
    marginTop: 8,
    paddingVertical: 6,
  },
  customToggleText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
  },
  customForm: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fffbeb',
  },
  customFormTitle: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 8,
    fontWeight: '600',
  },
  customFormRow: {
    flexDirection: 'row',
    gap: 6,
  },
  customNameInput: {
    flex: 2,
    paddingVertical: 8,
  },
  customPriceInput: {
    flex: 1,
    paddingVertical: 8,
  },
  customQtyInput: {
    flex: 1,
    paddingVertical: 8,
  },
  customFormButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  customAddButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  customAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  customCancelButton: {
    flex: 1,
    backgroundColor: '#9ca3af',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  customCancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});