// src/firebase/realtimeUpdates.ts
import { db } from './firebaseConfig';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { ParkingLot, ParkingSpace, Booking } from './types';

/**
 * A pub/sub system for notifying components about parking-related changes
 */
class ParkingUpdateService {
  private lotListeners = new Map();
  private spaceListeners = new Map();
  private bookingListeners = new Map();
  private lotCallbacks = new Map();
  private spaceCallbacks = new Map();
  private bookingCallbacks = new Map();
  
  /**
   * Subscribe to updates for a specific parking lot
   * @param lotId The ID of the parking lot to monitor
   * @param callback Function to call when the lot is updated
   * @returns Unsubscribe function
   */
  subscribeToLot(lotId: string, callback: (lot: ParkingLot) => void): () => void {
    const callbackId = Date.now().toString();
    
    // Store the callback
    if (!this.lotCallbacks.has(lotId)) {
      this.lotCallbacks.set(lotId, new Map());
    }
    this.lotCallbacks.get(lotId).set(callbackId, callback);
    
    // Set up Firestore listener if not already listening
    if (!this.lotListeners.has(lotId)) {
      const unsubscribe = onSnapshot(doc(db, 'parkingLots', lotId), (docSnap) => {
        if (docSnap.exists()) {
          const lotData = {
            id: docSnap.id,
            ...docSnap.data() as Omit<ParkingLot, 'id'>
          };
          
          // Notify all callbacks for this lot
          const lotCallbacks = this.lotCallbacks.get(lotId);
          if (lotCallbacks) {
            lotCallbacks.forEach(cb => cb(lotData));
          }
        }
      });
      
      this.lotListeners.set(lotId, unsubscribe);
    }
    
    // Return an unsubscribe function for this specific callback
    return () => {
      const lotCallbacks = this.lotCallbacks.get(lotId);
      if (lotCallbacks) {
        lotCallbacks.delete(callbackId);
        
        // If no more callbacks for this lot, remove the Firestore listener
        if (lotCallbacks.size === 0) {
          const unsubscribe = this.lotListeners.get(lotId);
          if (unsubscribe) {
            unsubscribe();
            this.lotListeners.delete(lotId);
          }
          this.lotCallbacks.delete(lotId);
        }
      }
    };
  }
  
  /**
   * Subscribe to updates for all parking lots
   * @param callback Function to call when any lot is updated
   * @returns Unsubscribe function
   */
  subscribeToAllLots(callback: (lots: ParkingLot[]) => void): () => void {
    const unsubscribe = onSnapshot(collection(db, 'parkingLots'), (snapshot) => {
      const lots: ParkingLot[] = [];
      snapshot.forEach(doc => {
        lots.push({
          id: doc.id,
          ...doc.data() as Omit<ParkingLot, 'id'>
        });
      });
      callback(lots);
    });
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to updates for parking spaces in a specific lot
   * @param lotId The ID of the parking lot to monitor spaces for
   * @param callback Function to call when spaces are updated
   * @returns Unsubscribe function
   */
  subscribeToSpaces(lotId: string, callback: (spaces: ParkingSpace[]) => void): () => void {
    const callbackId = Date.now().toString();
    
    // Store the callback
    if (!this.spaceCallbacks.has(lotId)) {
      this.spaceCallbacks.set(lotId, new Map());
    }
    this.spaceCallbacks.get(lotId).set(callbackId, callback);
    
    // Set up Firestore listener if not already listening
    if (!this.spaceListeners.has(lotId)) {
      const lotSpacesQuery = query(collection(db, 'parkingSpaces'), where('lotId', '==', lotId));
      
      const unsubscribe = onSnapshot(
        lotSpacesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          const spaces: ParkingSpace[] = [];
          snapshot.forEach(doc => {
            spaces.push({
              id: doc.id,
              ...doc.data() as Omit<ParkingSpace, 'id'>
            });
          });
          
          // Sort spaces by number for consistent display
          spaces.sort((a, b) => a.number - b.number);
          
          // Notify all callbacks for this lot
          const spaceCallbacks = this.spaceCallbacks.get(lotId);
          if (spaceCallbacks) {
            spaceCallbacks.forEach(cb => cb(spaces));
          }
        }
      );
      
      this.spaceListeners.set(lotId, unsubscribe);
    }
    
    // Return an unsubscribe function for this specific callback
    return () => {
      const spaceCallbacks = this.spaceCallbacks.get(lotId);
      if (spaceCallbacks) {
        spaceCallbacks.delete(callbackId);
        
        // If no more callbacks for this lot, remove the Firestore listener
        if (spaceCallbacks.size === 0) {
          const unsubscribe = this.spaceListeners.get(lotId);
          if (unsubscribe) {
            unsubscribe();
            this.spaceListeners.delete(lotId);
          }
          this.spaceCallbacks.delete(lotId);
        }
      }
    };
  }
  
  /**
   * Subscribe to updates for a specific booking
   * @param bookingId The ID of the booking to monitor
   * @param callback Function to call when the booking is updated
   * @returns Unsubscribe function
   */
  subscribeToBooking(bookingId: string, callback: (booking: Booking | null) => void): () => void {
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
      if (docSnap.exists()) {
        const bookingData = {
          id: docSnap.id,
          ...docSnap.data() as Omit<Booking, 'id'>
        };
        callback(bookingData);
      } else {
        callback(null);
      }
    });
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to updates for a user's active bookings
   * @param userId The ID of the user to monitor bookings for
   * @param callback Function to call when bookings are updated
   * @returns Unsubscribe function
   */
  subscribeToUserActiveBookings(userId: string, callback: (bookings: Booking[]) => void): () => void {
    const callbackId = Date.now().toString();
    
    // Store the callback
    if (!this.bookingCallbacks.has(userId)) {
      this.bookingCallbacks.set(userId, new Map());
    }
    this.bookingCallbacks.get(userId).set(callbackId, callback);
    
    // Set up Firestore listener if not already listening
    if (!this.bookingListeners.has(userId)) {
      const userBookingsQuery = query(
        collection(db, 'bookings'), 
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'occupied'])
      );
      
      const unsubscribe = onSnapshot(userBookingsQuery, (snapshot) => {
        const bookings: Booking[] = [];
        snapshot.forEach(doc => {
          bookings.push({
            id: doc.id,
            ...doc.data() as Omit<Booking, 'id'>
          });
        });
        
        // Notify all callbacks for this user
        const bookingCallbacks = this.bookingCallbacks.get(userId);
        if (bookingCallbacks) {
          bookingCallbacks.forEach(cb => cb(bookings));
        }
      });
      
      this.bookingListeners.set(userId, unsubscribe);
    }
    
    // Return an unsubscribe function for this specific callback
    return () => {
      const bookingCallbacks = this.bookingCallbacks.get(userId);
      if (bookingCallbacks) {
        bookingCallbacks.delete(callbackId);
        
        // If no more callbacks for this user, remove the Firestore listener
        if (bookingCallbacks.size === 0) {
          const unsubscribe = this.bookingListeners.get(userId);
          if (unsubscribe) {
            unsubscribe();
            this.bookingListeners.delete(userId);
          }
          this.bookingCallbacks.delete(userId);
        }
      }
    };
  }
  
  /**
   * Subscribe to updates for pending bookings (for workers)
   * @param callback Function to call when pending bookings are updated
   * @returns Unsubscribe function
   */
  subscribeToPendingBookings(callback: (bookings: Booking[]) => void): () => void {
    const pendingBookingsQuery = query(
      collection(db, 'bookings'), 
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(pendingBookingsQuery, (snapshot) => {
      const bookings: Booking[] = [];
      snapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data() as Omit<Booking, 'id'>
        });
      });
      callback(bookings);
    });
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to updates for active bookings (for workers)
   * @param callback Function to call when active bookings are updated
   * @returns Unsubscribe function
   */
  subscribeToActiveBookings(callback: (bookings: Booking[]) => void): () => void {
    const activeBookingsQuery = query(
      collection(db, 'bookings'), 
      where('status', '==', 'occupied')
    );
    
    const unsubscribe = onSnapshot(activeBookingsQuery, (snapshot) => {
      const bookings: Booking[] = [];
      snapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data() as Omit<Booking, 'id'>
        });
      });
      callback(bookings);
    });
    
    return unsubscribe;
  }
}

// Create a singleton instance
const parkingUpdateService = new ParkingUpdateService();
export default parkingUpdateService;