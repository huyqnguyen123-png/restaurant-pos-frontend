export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  reservationDate: string; // "2026-08-05"
  reservationTime: string; // "19:30:00"
  partySize: number;
  notes: string | null;
  status: ReservationStatus;
  createdAt: string;
}