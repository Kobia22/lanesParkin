// src/firebase/types.ts
export type UserRole = 'admin' | 'student' | 'guest';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: string;
  lastLoginAt?: string;
  staffId?: string;  // Added staffId field for admin users
}

export interface ParkingLot {
  id: string;
  name: string;
  location: string;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  bookedSpaces: number;
}

export interface ParkingSpace {
  id: string;
  lotId: string;
  number: number;
  isOccupied: boolean;
  currentBookingId: string | null;
}

export interface Booking {
  id: string;
  userId: string;
  lotId: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'completed' | 'cancelled' | 'abandoned';
  vehicleRegistration?: string;
  paymentStatus?: 'pending' | 'completed';
  amount?: number;
}

export interface Analytics {
  dailyRevenue: number;
  weeklyRevenue: number;
  occupancyRate: number;
  abandonedCount: number;
}