import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { reservationApi } from '../api/reservationApi';
import { Reservation, ReservationStatus } from '../types/reservation';

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReservations = useCallback(async () => {
    try {
      const data = await reservationApi.getAll();
      setReservations(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reservations. Check your network connection and backend server.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReservations().finally(() => setLoading(false));
    }, [loadReservations])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const handleChangeStatus = async (reservation: Reservation, status: ReservationStatus) => {
    try {
      await reservationApi.updateStatus(reservation.id, status);
      await loadReservations();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update reservation');
    }
  };

  const handleDelete = (reservation: Reservation) => {
    Alert.alert(
      'Delete reservation',
      `Permanently delete the reservation for ${reservation.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationApi.remove(reservation.id);
              await loadReservations();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete reservation');
            }
          },
        },
      ]
    );
  };

  const handleOpenActions = (reservation: Reservation) => {
    Alert.alert(
      `${reservation.customerName} — Table for ${reservation.partySize}`,
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(reservation.status !== 'CONFIRMED'
          ? [{ text: 'Confirm', onPress: () => handleChangeStatus(reservation, 'CONFIRMED') }]
          : []),
        ...(reservation.status !== 'CANCELLED'
          ? [{ text: 'Mark Cancelled', onPress: () => handleChangeStatus(reservation, 'CANCELLED') }]
          : []),
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(reservation) },
      ]
    );
  };

  const statusColor = (status: ReservationStatus) => {
    if (status === 'CONFIRMED') return styles.badgeConfirmed;
    if (status === 'CANCELLED') return styles.badgeCancelled;
    return styles.badgePending;
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const dateStr = new Date(`${item.reservationDate}T${item.reservationTime}`).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleOpenActions(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <View style={[styles.badge, statusColor(item.status)]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.detailText}>Party of {item.partySize}</Text>
        <Text style={styles.detailText}>{item.phone} · {item.email}</Text>
        {item.notes ? <Text style={styles.notesText}>📝 {item.notes}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Reservations</Text>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No reservations yet.</Text>}
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loader: {
    marginTop: 40,
  },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#7c3aed',
    fontStyle: 'italic',
    marginTop: 6,
    backgroundColor: '#fff',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeConfirmed: {
    backgroundColor: '#dcfce7',
  },
  badgeCancelled: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    backgroundColor: 'transparent',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});