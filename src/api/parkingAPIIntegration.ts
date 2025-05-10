// src/api/parkingAPIIntegration.ts
import parkingAPI from './simpleParkingAPI';
import { 
  ParkingLot, 
  ParkingSpace, 
  Booking, 
  ParkingSpaceStatus, 
  UserRole, 
  Bill,
  Analytics,
  BookingStatus,
  PaymentStatus
} from '../firebase/types';

// These functions will act as drop-in replacements for your existing Firebase functions
// This makes the transition easier since you don't have to change all your component imports

// ===== PARKING LOT OPERATIONS =====
export const fetchParkingLots = async (): Promise<ParkingLot[]> => {
  return parkingAPI.getParkingLots();
};

export const getParkingLot = async (lotId: string): Promise<ParkingLot | null> => {
  return parkingAPI.getParkingLot(lotId);
};

export const addParkingLot = async (lotData: Omit<ParkingLot, 'id'>): Promise<ParkingLot> => {
  return parkingAPI.createParkingLot(lotData);
};

export const updateParkingLot = async (
  lotId: string, 
  lotData: Partial<Omit<ParkingLot, 'id'>>
): Promise<void> => {
  return parkingAPI.updateParkingLot(lotId, lotData);
};

export const deleteParkingLot = async (lotId: string): Promise<void> => {
  return parkingAPI.deleteParkingLot(lotId);
};

// ===== PARKING SPACE OPERATIONS =====
export const fetchParkingSpaces = async (lotId: string): Promise<ParkingSpace[]> => {
  return parkingAPI.getParkingSpaces(lotId);
};

export const addParkingSpace = async (spaceData: Omit<ParkingSpace, 'id'>): Promise<ParkingSpace> => {
  return parkingAPI.createParkingSpace(spaceData);
};

export const createMultipleParkingSpaces = async (
  lotId: string, 
  startNumber: number, 
  count: number
): Promise<ParkingSpace[]> => {
  return parkingAPI.createMultipleSpaces(lotId, startNumber, count);
};

export const updateParkingSpace = async (
  spaceId: string,
  spaceData: Partial<Omit<ParkingSpace, 'id'>>
): Promise<void> => {
  return parkingAPI.updateParkingSpace(spaceId, spaceData);
};

export const deleteParkingSpace = async (spaceId: string): Promise<void> => {
  return parkingAPI.deleteParkingSpace(spaceId);
};

export const updateParkingSpaceStatus = async (
  spaceId: string,
  status: ParkingSpaceStatus,
  userData?: { userId?: string, userEmail?: string, vehicleInfo?: string }
): Promise<void> => {
  return parkingAPI.updateParkingSpaceStatus(spaceId, status, userData);
};

// ===== BOOKING OPERATIONS =====
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'expiryTime' | 'billingType' | 'billingRate' | 'paymentAmount' | 'paymentStatus' | 'status'>): Promise<Booking> => {
  return parkingAPI.createBooking(bookingData);
};

export const markBookingAsOccupied = async (bookingId: string): Promise<void> => {
  return parkingAPI.markBookingAsOccupied(bookingId);
};

export const completeBooking = async (bookingId: string): Promise<{ finalAmount: number }> => {
  return parkingAPI.completeBooking(bookingId);
};

export const getActiveBookings = async (userId: string): Promise<Booking[]> => {
  return parkingAPI.getActiveBookings(userId);
};

export const getPendingBookings = async (): Promise<Booking[]> => {
  return parkingAPI.getPendingBookings();
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    // Get active bookings
    const activeBookings = await parkingAPI.getActiveBookings(userId);
    
    // Get all bookings for this user from the database
    const allBookings = await parkingAPI.getAllUserBookings(userId);
    
    // Sort by start time, newest first
    allBookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    return allBookings;
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    throw error;
  }
};

export const getUserBills = async (userId: string): Promise<Bill[]> => {
  return parkingAPI.getUserBills(userId);
};

export const updateBookingStatus = async (
  bookingId: string, 
  status: BookingStatus, 
  endTime?: string
): Promise<void> => {
  try {
    const bookingRef = await parkingAPI.getBookingById(bookingId);
    if (!bookingRef) {
      throw new Error("Booking not found");
    }
    
    let updateData: any = { status };
    
    if (endTime) {
      updateData.endTime = endTime;
    }
    
    await parkingAPI.updateBooking(bookingId, updateData);
    
    // If cancelling a booking, free up the space
    if (status === 'cancelled') {
      const booking = bookingRef;
      await updateParkingSpaceStatus(booking.spaceId, 'vacant');
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// ===== Admin-specific functions =====
export const fetchActiveOrAbandonedBookings = async (): Promise<Booking[]> => {
  // This is a specialized function for admin dashboard
  try {
    const bookings = await parkingAPI.getParkingBookings();
    return bookings.filter(booking => 
      booking.status === 'active' || booking.status === 'abandoned'
    );
  } catch (error) {
    console.error("Error fetching active/abandoned bookings:", error);
    throw error;
  }
};

export const fetchAnalytics = async (): Promise<Analytics> => {
  try {
    return parkingAPI.getAnalytics();
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw error;
  }
};

export const fetchRecentBookings = async (limit: number = 10): Promise<Booking[]> => {
  // This function would fetch the most recent bookings
  try {
    const bookings = await parkingAPI.getAllBookings();
    // Sort by startTime in descending order
    bookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    // Return only the number requested
    return bookings.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent bookings:", error);
    throw error;
  }
};

// Add a function to get occupied spaces
export const getOccupiedSpaces = async (lotId: string): Promise<ParkingSpace[]> => {
  try {
    const spaces = await fetchParkingSpaces(lotId);
    return spaces.filter(space => space.status === 'occupied');
  } catch (error) {
    console.error("Error fetching occupied spaces:", error);
    throw error;
  }
};