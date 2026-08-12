import { apiClient } from './client';
import { Reservation, ReservationStatus } from '../types/reservation';

export const reservationApi = {
  getAll: async (status?: ReservationStatus): Promise<Reservation[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const response = await apiClient.get<Reservation[]>('/reservations', { params });
    return response.data;
  },

  updateStatus: async (id: number, status: ReservationStatus): Promise<Reservation> => {
    const response = await apiClient.put<Reservation>(`/reservations/${id}/status`, { status });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/reservations/${id}`);
  },
};