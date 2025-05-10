// src/api/simpleParkingAPI.ts
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  ParkingLot, 
  ParkingSpace, 
  Booking, 
  ParkingSpaceStatus, 
  UserRole, 
  Bill,
  BookingStatus,
  PaymentStatus, 
  Analytics
} from '../firebase/types';

/**
 * SimpleParkingAPI - A simplified API layer over Firebase for parking management
 * This class provides methods to interact with the parking system database
 */
class SimpleParkingAPI {
  // Constants for pricing
  private STUDENT_DAILY_RATE = 200; // KSH
  private GUEST_HOURLY_RATE = 50; // KSH
  private BOOKING_EXPIRY_MINUTES = 5; // minutes until a booking expires if not occupied
  private GUEST_FREE_MINUTES = 30; // free minutes for guests

  // PARKING LOT OPERATIONS

  /**
   * Get all parking lots
   */
  async getParkingLots(): Promise<ParkingLot[]> {
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
  }

  /**
   * Get a single parking lot by ID
   */
  async getParkingLot(lotId: string): Promise<ParkingLot | null> {
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
  }

  /**
   * Create a new parking lot
   */
  async createParkingLot(lotData: Omit<ParkingLot, 'id'>): Promise<ParkingLot> {
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
  async updateParkingLot(
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
   */
  async deleteParkingLot(lotId: string): Promise<void> {
    try {
      // Delete associated parking spaces
      const spacesSnapshot = await getDocs(
        query(collection(db, 'parkingSpaces'), where('lotId', '==', lotId))
      );
      
      const deletePromises = spacesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete the lot
      await deleteDoc(doc(db, 'parkingLots', lotId));
    } catch (error) {
      console.error("Error deleting parking lot:", error);
      throw error;
    }
  }

  // PARKING SPACE OPERATIONS

  /**
   * Get all parking spaces for a lot
   */
  async getParkingSpaces(lotId: string): Promise<ParkingSpace[]> {
    try {
      const spacesQuery = query(
        collection(db, 'parkingSpaces'),
        where('lotId', '==', lotId),
        orderBy('number')
      );
      
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
  }

  /**
   * Create a new parking space
   */
  async createParkingSpace(spaceData: Omit<ParkingSpace, 'id'>): Promise<ParkingSpace> {
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
   * Update a parking space
   */
  async updateParkingSpace(
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
  async deleteParkingSpace(spaceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'parkingSpaces', spaceId));
    } catch (error) {
      console.error("Error deleting parking space:", error);
      throw error;
    }
  }

  /**
   * Create multiple parking spaces for a lot at once
   */
  async createMultipleSpaces(
    lotId: string, 
    startNumber: number, 
    count: number
  ): Promise<ParkingSpace[]> {
    try {
      const spaces: ParkingSpace[] = [];
      
      // Get the lot to update counts
      const lot = await this.getParkingLot(lotId);
      if (!lot) {
        throw new Error("Parking lot not found");
      }
      
      // Create spaces with sequential numbers
      for (let i = 0; i < count; i++) {
        const spaceData: Omit<ParkingSpace, 'id'> = {
          lotId,
          number: startNumber + i,
          status: 'vacant',
          userId: null,
          userEmail: null,
          vehicleInfo: null,
          currentBookingId: null,
          startTime: null,
          bookingExpiryTime: null
        };
        
        const space = await this.createParkingSpace(spaceData);
        spaces.push(space);
      }
      
      // Update lot total spaces count
      await this.updateParkingLot(lotId, {
        totalSpaces: lot.totalSpaces + count,
        availableSpaces: lot.availableSpaces + count
      });
      
      return spaces;
    } catch (error) {
      console.error("Error creating multiple spaces:", error);
      throw error;
    }
  }

  /**
   * Update parking space status
   */
  async updateParkingSpaceStatus(
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
      const lot = await this.getParkingLot(space.lotId);
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
      await this.updateParkingLot(lot.id, lotUpdate);
    } catch (error) {
      console.error("Error updating parking space status:", error);
      throw error;
    }
  }

  // BOOKING OPERATIONS

  /**
   * Calculate booking price based on user role
   */
  calculateBookingPrice(userRole: UserRole, duration: number): { 
    amount: number, 
    billingType: 'student_fixed' | 'guest_hourly', 
    billingRate: number 
  } {
    if (userRole === 'student') {
      return { 
        amount: this.STUDENT_DAILY_RATE, 
        billingType: 'student_fixed',
        billingRate: this.STUDENT_DAILY_RATE 
      };
    } else {
      // Guests pay hourly rate, with first 30 minutes free
      // Duration is in milliseconds, convert to hours
      const hours = duration / (1000 * 60 * 60);
      
      // Calculate free period (30 mins = 0.5 hours)
      const billableHours = Math.max(0, hours - (this.GUEST_FREE_MINUTES / 60));
      
      // Round up to the next hour after free period
      const roundedHours = Math.ceil(billableHours);
      
      // Calculate amount
      const amount = roundedHours * this.GUEST_HOURLY_RATE;
      
      return { 
        amount, 
        billingType: 'guest_hourly',
        billingRate: this.GUEST_HOURLY_RATE
      };
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: Omit<Booking, 'id' | 'expiryTime' | 'billingType' | 'billingRate' | 'paymentAmount' | 'paymentStatus' | 'status'>): Promise<Booking> {
    try {
      // Calculate booking expiry time (5 minutes from now)
      const expiryTime = new Date(Date.now() + this.BOOKING_EXPIRY_MINUTES * 60 * 1000).toISOString();
      
      // Calculate initial price (will be updated when occupied or completed)
      const { amount, billingType, billingRate } = this.calculateBookingPrice(
        bookingData.userRole, 
        24 * 60 * 60 * 1000 // Assuming one day for initial calculation
      );
      
      // Create the full booking object with pricing
      const fullBookingData = {
        ...bookingData,
        status: 'pending' as BookingStatus,
        expiryTime,
        paymentAmount: amount,
        billingType,
        billingRate,
        paymentStatus: 'pending' as PaymentStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'bookings'), fullBookingData);
      
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
      const lot = await this.getParkingLot(bookingData.lotId);
      if (lot) {
        await this.updateParkingLot(bookingData.lotId, {
          availableSpaces: lot.availableSpaces - 1,
          bookedSpaces: lot.bookedSpaces + 1
        });
      }
      
      // Set up a job to expire this booking automatically
      // In a real implementation, you might use a cloud function or a server-side timer
      this.scheduleBookingExpiry(docRef.id, bookingData.spaceId, expiryTime);
      
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
   * Handle booking expiry
   * In a production app, this would ideally be handled by a Cloud Function
   */
  private scheduleBookingExpiry(bookingId: string, spaceId: string, expiryTimeStr: string) {
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
              await this.updateParkingSpaceStatus(spaceId, 'vacant');
              
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
   * Mark a booking as occupied (vehicle has arrived)
   */
  async markBookingAsOccupied(bookingId: string): Promise<void> {
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
      await this.updateParkingSpaceStatus(booking.spaceId, 'occupied', {
        userId: booking.userId,
        userEmail: booking.userEmail,
        vehicleInfo: booking.vehicleInfo
      });
      
      // Update lot statistics
      const lot = await this.getParkingLot(booking.lotId);
      if (lot) {
        await this.updateParkingLot(booking.lotId, {
          bookedSpaces: lot.bookedSpaces - 1,
          occupiedSpaces: lot.occupiedSpaces + 1
        });
      }
    } catch (error) {
      console.error("Error marking booking as occupied:", error);
      throw error;
    }
  }

  /**
   * Complete a booking and calculate final payment
   */
  async completeBooking(bookingId: string): Promise<{ finalAmount: number }> {
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
        
        const { amount } = this.calculateBookingPrice(booking.userRole, durationMs);
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
      await this.updateParkingSpaceStatus(booking.spaceId, 'vacant');
      
      return { finalAmount };
    } catch (error) {
      console.error("Error completing booking:", error);
      throw error;
    }
  }

  /**
   * Get active bookings for a user
   */
  async getActiveBookings(userId: string): Promise<Booking[]> {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'occupied']),
        orderBy('startTime', 'desc')
      );
      
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
  }

  /**
   * Get all pending bookings (for worker interface)
   */
  async getPendingBookings(): Promise<Booking[]> {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('status', '==', 'pending'),
        orderBy('startTime', 'desc')
      );
      
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
  }

  /**
   * Get all bookings from the database
   */
  async getAllBookings(): Promise<Booking[]> {
    try {
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookings: Booking[] = [];
      
      bookingsSnapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data() as Omit<Booking, 'id'>
        });
      });
      
      return bookings;
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      throw error;
    }
  }

  /**
   * Get bookings with any status (for admin operations)
   */
  async getParkingBookings(status?: BookingStatus): Promise<Booking[]> {
    try {
      let bookingsQuery;
      
      if (status) {
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('status', '==', status),
          orderBy('startTime', 'desc')
        );
      } else {
        bookingsQuery = query(
          collection(db, 'bookings'),
          orderBy('startTime', 'desc')
        );
      }
      
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
      console.error("Error fetching bookings:", error);
      throw error;
    }
  }

  /**
   * Get billing history for a user
   */
  async getUserBills(userId: string): Promise<Bill[]> {
    try {
      const billsQuery = query(
        collection(db, 'bills'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
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
  }
  
  /**
   * Get analytics data for admin dashboard
   * For simplicity, we're using mock data right now
   */
  async getAnalytics(): Promise<Analytics> {
    try {
      // In a real application, you would calculate these from actual data
      const mockAnalytics: Analytics = {
        dailyRevenue: 24500,
        weeklyRevenue: 157000,
        occupancyRate: 68.5,
        abandonedCount: 12
      };
      
      return mockAnalytics;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw error;
    }
  }
}

// Create a singleton instance
const parkingAPI = new SimpleParkingAPI();
export default parkingAPI;