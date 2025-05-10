// src/firebase/types.ts

// User roles
export type UserRole = 'student' | 'guest' | 'admin' | 'worker';

// User interface
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

// Bill interface
export interface Bill {
  id: string;
  bookingId: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
  createdAt?: string;
  paidAt?: string | null;
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