// src/firebase/types.ts
export type UserRole = 'admin' | 'worker' | 'student' | 'guest';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  phoneNumber?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export type ParkingSpaceStatus = 'vacant' | 'occupied' | 'booked';

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
  status: ParkingSpaceStatus;
  userId?: string | null;
  userEmail?: string | null;
  vehicleInfo?: string | null;
  currentBookingId?: string | null;
  startTime?: string | null;
  bookingExpiryTime?: string | null;
}

export type BookingStatus = 'pending' | 'occupied' | 'completed' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  lotId: string;
  lotName: string;
  spaceId: string;
  spaceNumber: number;
  status: BookingStatus;
  startTime: string;
  arrivalTime?: string;
  endTime: string | null;
  expiryTime: string;
  vehicleInfo: string;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  billingType: 'student_fixed' | 'guest_hourly';
  billingRate: number;
}

export interface Bill {
  id: string;
  bookingId: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  dueDate: string;
  description: string;
}