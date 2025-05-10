// src/firebase/types.ts - Updated with proper Firestore timestamp handling
import { FieldValue, Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'student' | 'guest' | 'admin' | 'worker';

// Common type for firestore timestamps
export type FirestoreTimestamp = string | Timestamp | FieldValue;

// User interface
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  lastLoginAt: FirestoreTimestamp;
  passwordUpdatedAt?: FirestoreTimestamp;
}

// Parking lot interface
export interface ParkingLot {
  id: string;
  name: string;
  location: string;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  bookedSpaces: number;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// Parking space status
export type ParkingSpaceStatus = 'vacant' | 'occupied' | 'booked';

// Parking space interface
export interface ParkingSpace {
  id: string;
  lotId: string;
  number: number;
  status: ParkingSpaceStatus;
  userId: string | null;
  userEmail: string | null;
  vehicleInfo: string | null;
  currentBookingId: string | null;
  startTime: string | null;
  bookingExpiryTime: string | null;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// Booking status
export type BookingStatus = 'pending' | 'occupied' | 'completed' | 'cancelled' | 'expired' | 'abandoned';

// Payment status
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Booking interface
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
  endTime: string | null;
  expiryTime: string;
  arrivalTime?: string;
  vehicleInfo: string;
  billingType: 'student_fixed' | 'guest_hourly';
  billingRate: number;
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// Bill interface
export interface Bill {
  id: string;
  bookingId: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
  createdAt?: FirestoreTimestamp;
  paidAt?: FirestoreTimestamp | null;
  dueDate: string;
  description: string;
}

// Analytics interface for admin dashboard
export interface Analytics {
  dailyRevenue: number;
  weeklyRevenue: number;
  occupancyRate: number;
  abandonedCount: number;
}