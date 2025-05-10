// src/firebase/database.ts - Optimized with index documentation
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { ParkingLot, ParkingSpace, Booking, ParkingSpaceStatus, UserRole, Bill } from './types';
import { measureQueryPerformance, verifyIndexExists } from '../firebase/performanceUtils';

// Constants for pricing
const STUDENT_DAILY_RATE = 200; // KSH
const GUEST_HOURLY_RATE = 50; // KSH
const BOOKING_EXPIRY_MINUTES = 5; // minutes until a booking expires if not occupied
const GUEST_FREE_MINUTES = 30; // free minutes for guests

/**
 * Get all parking lots
 */
export async function fetchParkingLots(): Promise<ParkingLot[]> {
  return measureQueryPerformance('fetchParkingLots', async () => {
    try {
      const lotsSnapshot = await getDocs(collection(db, 'parkingLots'));
      const lots: ParkingLot[] = [];
      
      lotsSnapshot.forEach(doc => {
        lots.push({
          id: doc.id,
          ...doc.data() as Omit<ParkingLot, 'id'>
        });
      });
      
      return lots;
    } catch (error) {
      console.error("Error fetching parking lots:", error);
      throw error;
    }
  });
}

/**
 * Get a specific parking lot by ID
 */
export async function getParkingLot(lotId: string): Promise<ParkingLot | null> {
  return measureQueryPerformance(`getParkingLot(${lotId})`, async () => {
    try {
      const lotDoc = await getDoc(doc(db, 'parkingLots', lotId));
      
      if (!lotDoc.exists()) {
        return null;
      }
      
      return {
        id: lotDoc.id,
        ...lotDoc.data() as Omit<ParkingLot, 'id'>
      };
    } catch (error) {
      console.error("Error getting parking lot:", error);
      throw error;
    }
  });
}

/**
 * Create a new parking lot
 */
export async function addParkingLot(lotData: Omit<ParkingLot, 'id'>): Promise<ParkingLot> {
  try {
    const docRef = await addDoc(collection(db, 'parkingLots'), {
      ...lotData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...lotData
    };
  } catch (error) {
    console.error("Error adding parking lot:", error);
    throw error;
  }
}

/**
 * Update a parking lot
 */
export async function updateParkingLot(
  lotId: string, 
  lotData: Partial<Omit<ParkingLot, 'id'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'parkingLots', lotId), {
      ...lotData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating parking lot:", error);
    throw error;
  }
}

/**
 * Delete a parking lot and all its spaces
 * 
 * @requires Firestore index on 'parkingSpaces' collection: lotId ASC
 */
export async function deleteParkingLot(lotId: string): Promise<void> {
  return measureQueryPerformance(`deleteParkingLot(${lotId})`, async () => {
    try {
      // Delete associated parking spaces
      const spacesQuery = query(collection(db, 'parkingSpaces'), where('lotId', '==', lotId));
      
      // Verify index exists for this query
      await verifyIndexExists(spacesQuery);
      
      const spacesSnapshot = await getDocs(spacesQuery);
      
      const deletePromises = spacesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete the lot
      await deleteDoc(doc(db, 'parkingLots', lotId));
    } catch (error) {
      console.error("Error deleting parking lot:", error);
      throw error;
    }
  });
}

/**
 * Get all parking spaces for a lot
 * 
 * @requires Firestore index on 'parkingSpaces' collection: lotId ASC, number ASC
 */
export async function fetchParkingSpaces(lotId: string): Promise<ParkingSpace[]> {
  return measureQueryPerformance(`fetchParkingSpaces(${lotId})`, async () => {
    try {
      // Using compound index for ordering by number
      const spacesQuery = query(
        collection(db, 'parkingSpaces'),
        where('lotId', '==', lotId),
        orderBy('number')
      );
      
      // Verify index exists
      await verifyIndexExists(spacesQuery);
      
      const spacesSnapshot = await getDocs(spacesQuery);
      const spaces: ParkingSpace[] = [];
      
      spacesSnapshot.forEach(doc => {
        spaces.push({
          id: doc.id,
          ...doc.data() as Omit<ParkingSpace, 'id'>
        });
      });
      
      return spaces;
    } catch (error) {
      console.error("Error fetching parking spaces:", error);
      throw error;
    }
  });
}

/**
 * Create a new parking space
 */
export async function addParkingSpace(spaceData: Omit<ParkingSpace, 'id'>): Promise<ParkingSpace> {
  try {
    const docRef = await addDoc(collection(db, 'parkingSpaces'), {
      ...spaceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...spaceData
    };
  } catch (error) {
    console.error("Error adding parking space:", error);
    throw error;
  }
}

/**
 * Update an existing parking space
 */
export async function updateParkingSpace(
  spaceId: string,
  spaceData: Partial<Omit<ParkingSpace, 'id'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'parkingSpaces', spaceId), {
      ...spaceData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating parking space:", error);
    throw error;
  }
}

/**
 * Delete a parking space
 */
export async function deleteParkingSpace(spaceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'parkingSpaces', spaceId));
  } catch (error) {
    console.error("Error deleting parking space:", error);
    throw error;
  }
}

/**
 * Get all occupied or booked spaces with user information
 * 
 * @requires Firestore index on 'parkingSpaces' collection: status IN
 */
export async function getOccupiedSpaces(): Promise<ParkingSpace[]> {
  return measureQueryPerformance('getOccupiedSpaces', async () => {
    try {
      const spacesQuery = query(
        collection(db, 'parkingSpaces'),
        where('status', 'in', ['occupied', 'booked'])
      );
      
      // Verify index exists
      await verifyIndexExists(spacesQuery);
      
      const spacesSnapshot = await getDocs(spacesQuery);
      const spaces: ParkingSpace[] = [];
      
      spacesSnapshot.forEach(doc => {
        spaces.push({
          id: doc.id,
          ...doc.data() as Omit<ParkingSpace, 'id'>
        });
      });
      
      return spaces;
    } catch (error) {
      console.error("Error fetching occupied spaces:", error);
      throw error;
    }
  });
}

/**
 * Update parking space status (for worker role)
 */
export async function updateParkingSpaceStatus(
  spaceId: string,
  status: ParkingSpaceStatus,
  userData?: { userId?: string, userEmail?: string, vehicleInfo?: string }
): Promise<void> {
  try {
    const spaceRef = doc(db, 'parkingSpaces', spaceId);
    const spaceDoc = await getDoc(spaceRef);
    
    if (!spaceDoc.exists()) {
      throw new Error("Parking space not found");
    }
    
    const space = {
      id: spaceDoc.id,
      ...spaceDoc.data() as Omit<ParkingSpace, 'id'>
    };
    
    // Get the lot to update counts
    const lot = await getParkingLot(space.lotId);
    if (!lot) {
      throw new Error("Parking lot not found");
    }
    
    // Calculate the new counts for the lot
    let lotUpdate: Partial<Omit<ParkingLot, 'id'>> = {};
    
    // First, revert the current status counts
    switch (space.status) {
      case 'vacant':
        lotUpdate.availableSpaces = lot.availableSpaces - 1;
        break;
      case 'occupied':
        lotUpdate.occupiedSpaces = lot.occupiedSpaces - 1;
        break;
      case 'booked':
        lotUpdate.bookedSpaces = lot.bookedSpaces - 1;
        break;
    }
    
    // Then add the new status counts
    switch (status) {
      case 'vacant':
        lotUpdate.availableSpaces = (lotUpdate.availableSpaces ?? lot.availableSpaces) + 1;
        break;
      case 'occupied':
        lotUpdate.occupiedSpaces = (lotUpdate.occupiedSpaces ?? lot.occupiedSpaces) + 1;
        break;
      case 'booked':
        lotUpdate.bookedSpaces = (lotUpdate.bookedSpaces ?? lot.bookedSpaces) + 1;
        break;
    }
    
    // Prepare space update data
    const updateData: any = { 
      status: status, 
      startTime: status === 'vacant' ? null : new Date().toISOString(),
      updatedAt: serverTimestamp()
    };
    
    // Add or remove user information based on status
    if (status === 'vacant') {
      updateData.userId = null;
      updateData.userEmail = null;
      updateData.vehicleInfo = null;
      updateData.currentBookingId = null;
      updateData.bookingExpiryTime = null;
    } else if (userData) {
      if (userData.userId) updateData.userId = userData.userId;
      if (userData.userEmail) updateData.userEmail = userData.userEmail;
      if (userData.vehicleInfo) updateData.vehicleInfo = userData.vehicleInfo;
    }
    
    // Update the space
    await updateDoc(spaceRef, updateData);
    
    // Update the lot counts
    await updateParkingLot(lot.id, lotUpdate);
  } catch (error) {
    console.error("Error updating parking space status:", error);
    throw error;
  }
}

/**
 * Calculate booking price based on user role
 */
export function calculateBookingPrice(userRole: UserRole, duration: number): { 
  amount: number, 
  billingType: 'student_fixed' | 'guest_hourly', 
  billingRate: number 
} {
  if (userRole === 'student') {
    return { 
      amount: STUDENT_DAILY_RATE, 
      billingType: 'student_fixed',
      billingRate: STUDENT_DAILY_RATE 
    };
  } else {
    // Guests pay hourly rate, with first 30 minutes free
    // Duration is in milliseconds, convert to hours
    const hours = duration / (1000 * 60 * 60);
    
    // Calculate free period (30 mins = 0.5 hours)
    const billableHours = Math.max(0, hours - (GUEST_FREE_MINUTES / 60));
    
    // Round up to the next hour after free period
    const roundedHours = Math.ceil(billableHours);
    
    // Calculate amount
    const amount = roundedHours * GUEST_HOURLY_RATE;
    
    return { 
      amount, 
      billingType: 'guest_hourly',
      billingRate: GUEST_HOURLY_RATE
    };
  }
}

/**
 * Create a booking with automatic expiry
 */
export async function createBooking(bookingData: Omit<Booking, 'id' | 'expiryTime' | 'billingType' | 'billingRate' | 'paymentAmount' | 'paymentStatus' | 'status'>): Promise<Booking> {
  try {
    // Calculate booking expiry time (5 minutes from now)
    const expiryTime = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000).toISOString();
    
    // Calculate initial price (will be updated when occupied or completed)
    // For students, this is a fixed daily rate
    // For guests, this will be updated based on actual duration when they leave
    const { amount, billingType, billingRate } = calculateBookingPrice(
      bookingData.userRole, 
      24 * 60 * 60 * 1000 // Assuming one day for initial calculation
    );
    
    // Create the full booking object with pricing
    const fullBookingData = {
      ...bookingData,
      status: 'pending' as const,
      expiryTime,
      paymentAmount: amount,
      billingType,
      billingRate,
      paymentStatus: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'bookings'), fullBookingData);
    
    // Schedule the booking to expire and update space status
    scheduleBookingExpiry(docRef.id, bookingData.spaceId, expiryTime);
    
    // Update parking space status to 'booked'
    await updateDoc(doc(db, 'parkingSpaces', bookingData.spaceId), {
      status: 'booked',
      currentBookingId: docRef.id,
      userId: bookingData.userId,
      userEmail: bookingData.userEmail,
      vehicleInfo: bookingData.vehicleInfo,
      startTime: bookingData.startTime,
      bookingExpiryTime: expiryTime,
      updatedAt: serverTimestamp()
    });
    
    // Update parking lot counts
    const lot = await getParkingLot(bookingData.lotId);
    if (lot) {
      await updateParkingLot(bookingData.lotId, {
        availableSpaces: lot.availableSpaces - 1,
        bookedSpaces: lot.bookedSpaces + 1,
        updatedAt: serverTimestamp()
      });
    }
    
    return {
      id: docRef.id,
      ...fullBookingData as any // Timestamp to string conversion happens here
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}

/**
 * Function to schedule the expiry of a booking
 * In a production app, this would ideally be handled by a Cloud Function
 */
function scheduleBookingExpiry(bookingId: string, spaceId: string, expiryTimeStr: string) {
  const expiryTime = new Date(expiryTimeStr).getTime();
  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;
  
  // If expiry time is in the future, schedule the expiry
  if (timeUntilExpiry > 0) {
    setTimeout(async () => {
      try {
        // Check if the booking still exists and is still 'pending'
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingDoc = await getDoc(bookingRef);
        
        if (bookingDoc.exists()) {
          const booking = bookingDoc.data() as Booking;
          
          // Only expire if still pending (not occupied)
          if (booking.status === 'pending') {
            // Update booking status
            await updateDoc(bookingRef, {
              status: 'expired',
              endTime: new Date().toISOString(),
              updatedAt: serverTimestamp()
            });
            
            // Free up the space
            await updateParkingSpaceStatus(spaceId, 'vacant');
            
            console.log(`Booking ${bookingId} expired automatically`);
          }
        }
      } catch (error) {
        console.error("Error in booking expiry process:", error);
      }
    }, timeUntilExpiry);
    
    console.log(`Scheduled booking ${bookingId} to expire at ${expiryTimeStr}`);
  }
}

/**
 * Mark a booking as occupied (called by worker)
 */
export async function markBookingAsOccupied(bookingId: string): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      throw new Error("Booking not found");
    }
    
    const booking = bookingDoc.data() as Booking;
    
    // Only update if in 'pending' status
    if (booking.status !== 'pending') {
      throw new Error(`Cannot mark as occupied. Current status: ${booking.status}`);
    }
    
    const arrivalTime = new Date().toISOString();
    
    // Update booking status
    await updateDoc(bookingRef, {
      status: 'occupied',
      arrivalTime,
      updatedAt: serverTimestamp()
    });
    
    // Update space status
    await updateParkingSpaceStatus(booking.spaceId, 'occupied', {
      userId: booking.userId,
      userEmail: booking.userEmail,
      vehicleInfo: booking.vehicleInfo
    });
    
    // Update lot statistics
    const lot = await getParkingLot(booking.lotId);
    if (lot) {
      await updateParkingLot(booking.lotId, {
        bookedSpaces: lot.bookedSpaces - 1,
        occupiedSpaces: lot.occupiedSpaces + 1,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log(`Booking ${bookingId} marked as occupied at ${arrivalTime}`);
  } catch (error) {
    console.error("Error marking booking as occupied:", error);
    throw error;
  }
}

/**
 * End a booking and calculate final payment
 */
export async function completeBooking(bookingId: string): Promise<{ finalAmount: number }> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      throw new Error("Booking not found");
    }
    
    const booking = bookingDoc.data() as Booking;
    
    // Only complete if 'occupied' or 'pending'
    if (booking.status !== 'occupied' && booking.status !== 'pending') {
      throw new Error(`Cannot complete booking. Current status: ${booking.status}`);
    }
    
    const endTime = new Date().toISOString();
    
    // Calculate actual duration and final price
    let finalAmount = booking.paymentAmount;
    
    // For guests with hourly billing, recalculate based on actual duration
    if (booking.billingType === 'guest_hourly') {
      const startTimeObj = new Date(booking.startTime);
      const endTimeObj = new Date(endTime);
      const durationMs = endTimeObj.getTime() - startTimeObj.getTime();
      
      const { amount } = calculateBookingPrice(booking.userRole, durationMs);
      finalAmount = amount;
    }
    
    // Update booking with final information
    await updateDoc(bookingRef, {
      status: 'completed',
      endTime,
      paymentAmount: finalAmount,
      paymentStatus: 'paid',  // Assume payment is made immediately for simplicity
      updatedAt: serverTimestamp()
    });
    
    // Create billing record
    await addDoc(collection(db, 'bills'), {
      bookingId: bookingId,
      userId: booking.userId,
      userEmail: booking.userEmail,
      amount: finalAmount,
      status: 'paid',
      createdAt: serverTimestamp(),
      paidAt: serverTimestamp(),
      dueDate: new Date().toISOString(),
      description: `Parking fee for ${booking.lotName}, Space #${booking.spaceNumber}`
    });
    
    // Free up the space
    await updateParkingSpaceStatus(booking.spaceId, 'vacant');
    
    return { finalAmount };
  } catch (error) {
    console.error("Error completing booking:", error);
    throw error;
  }
}

/**
 * Get active bookings for a user
 * 
 * @requires Firestore index on 'bookings' collection: userId ASC, status IN, startTime DESC
 */
export async function getActiveBookings(userId: string): Promise<Booking[]> {
  return measureQueryPerformance(`getActiveBookings(${userId})`, async () => {
    try {
      // Using compound index
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'occupied']),
        orderBy('startTime', 'desc')
      );
      
      // Verify index exists
      await verifyIndexExists(bookingsQuery);
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings: Booking[] = [];
      
      bookingsSnapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data() as Omit<Booking, 'id'>
        });
      });
      
      return bookings;
    } catch (error) {
      console.error("Error fetching active bookings:", error);
      throw error;
    }
  });
}

/**
 * Get all pending bookings (for worker interface)
 * 
 * @requires Firestore index on 'bookings' collection: status ASC, startTime DESC
 */
export async function getPendingBookings(): Promise<Booking[]> {
  return measureQueryPerformance('getPendingBookings', async () => {
    try {
      // Using compound index
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('status', '==', 'pending'),
        orderBy('startTime', 'desc')
      );
      
      // Verify index exists
      await verifyIndexExists(bookingsQuery);
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings: Booking[] = [];
      
      bookingsSnapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data() as Omit<Booking, 'id'>
        });
      });
      
      return bookings;
    } catch (error) {
      console.error("Error fetching pending bookings:", error);
      throw error;
    }
  });
}

/**
 * Get billing history for a user
 * 
 * @requires Firestore index on 'bills' collection: userId ASC, createdAt DESC
 */
export async function getUserBills(userId: string): Promise<Bill[]> {
  return measureQueryPerformance(`getUserBills(${userId})`, async () => {
    try {
      // Using compound index
      const billsQuery = query(
        collection(db, 'bills'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      // Verify index exists
      await verifyIndexExists(billsQuery);
      
      const billsSnapshot = await getDocs(billsQuery);
      const bills: Bill[] = [];
      
      billsSnapshot.forEach(doc => {
        bills.push({
          id: doc.id,
          ...doc.data() as Omit<Bill, 'id'>
        });
      });
      
      return bills;
    } catch (error) {
      console.error("Error fetching user bills:", error);
      throw error;
    }
  });
}

/**
 * Get user bookings
 * 
 * @requires Firestore index on 'bookings' collection: userId ASC, startTime DESC
 */
export async function getUserBookings(userId: string): Promise<Booking[]> {
  return measureQueryPerformance(`getUserBookings(${userId})`, async () => {
    try {
      // Using compound index
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
        orderBy('startTime', 'desc')
      );
      
      // Verify index exists
      await verifyIndexExists(bookingsQuery);
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings: Booking[] = [];
      
      bookingsSnapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data() as Omit<Booking, 'id'>
        });
      });
      
      return bookings;
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      throw error;
    }
  });
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status'],
  endTime?: string
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      throw new Error("Booking not found");
    }
    
    const booking = {
      id: bookingDoc.id,
      ...bookingDoc.data() as Omit<Booking, 'id'>
    };
    
    // Update the booking
    const updateData: any = { 
      status,
      updatedAt: serverTimestamp()
    };
    
    if (endTime) {
      updateData.endTime = endTime;
    }
    
    await updateDoc(bookingRef, updateData);
    
    // If completed or cancelled, free up the space
    if (status === 'completed' || status === 'cancelled' || status === 'expired') {
      // Update parking space
      await updateParkingSpaceStatus(booking.spaceId, 'vacant');
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
}