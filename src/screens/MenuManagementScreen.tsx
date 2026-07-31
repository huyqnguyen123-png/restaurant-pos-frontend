import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { menuApi } from '../api/menuApi';
import { MenuItem } from '../types/menu';
import { formatCurrency } from '../utils/format';

export default function MenuManagementScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await menuApi.getAll();
      setItems(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load menu items. Check your network connection and backend server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Validation error', 'Please enter a name');
      return;
    }
    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      Alert.alert('Validation error', 'Please enter a valid price greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      await menuApi.create(name.trim(), priceNumber);
      setName('');
      setPrice('');
      await loadItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to add menu item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = (item: MenuItem) => {
    Alert.alert(
      'Confirm delete',
      `Delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuApi.remove(item.id);
              await loadItems();
            } catch (error: any) {
              const serverMessage = error?.response?.data?.error;
              Alert.alert('Error', serverMessage || 'Failed to delete menu item');
            }
          },
        },
      ]
    );
  };

  const startEditing = (item: MenuItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
  };

  const saveEditing = async (item: MenuItem) => {
    if (!editName.trim()) {
      Alert.alert('Validation error', 'Please enter a name');
      return;
    }
    const priceNumber = parseFloat(editPrice);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      Alert.alert('Validation error', 'Please enter a valid price greater than 0');
      return;
    }

    try {
      setSavingEdit(true);
      await menuApi.update(item.id, editName.trim(), priceNumber);
      cancelEditing();
      await loadItems();
    } catch (error: any) {
      const serverMessage = error?.response?.data?.error;
      Alert.alert('Error', serverMessage || 'Failed to update menu item');
    } finally {
      setSavingEdit(false);
    }
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, styles.editNameInput]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            autoFocus
          />
          <TextInput
            style={[styles.input, styles.editPriceInput]}
            value={editPrice}
            onChangeText={setEditPrice}
            placeholder="Price"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => saveEditing(item)}
            disabled={savingEdit}
          >
            <Text style={styles.saveButtonText}>{savingEdit ? '...' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing} disabled={savingEdit}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteItem(item)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.formRow}>
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="Item name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}
          disabled={submitting}
        >
          <Text style={styles.addButtonText}>{submitting ? '...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No menu items yet. Add one above.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameInput: {
    flex: 2,
  },
  priceInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 40,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 6,
  },
  editNameInput: {
    flex: 2,
    paddingVertical: 6,
  },
  editPriceInput: {
    flex: 1,
    paddingVertical: 6,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: '#9ca3af',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});