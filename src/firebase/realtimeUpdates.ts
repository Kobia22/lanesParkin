// src/firebase/realtimeUpdates.ts - Fixed with proper callback typing
import { db } from './firebaseConfig';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { ParkingLot, ParkingSpace, Booking } from './types';
import { measureQueryPerformance, verifyIndexExists } from '../firebase/performanceUtils';

/**
 * A pub/sub system for notifying components about parking-related changes
 */
class ParkingUpdateService {
  // Define typed maps for listeners and callbacks
  private lotListeners = new Map<string, () => void>();
  private spaceListeners = new Map<string, () => void>();
  private bookingListeners = new Map<string, () => void>();
  private lotCallbacks = new Map<string, Map<string, (lot: ParkingLot) => void>>();
  private spaceCallbacks = new Map<string, Map<string, (spaces: ParkingSpace[]) => void>>();
  private bookingCallbacks = new Map<string, Map<string, (bookings: Booking[]) => void>>();
  
  /**
   * Subscribe to updates for a specific parking lot
   * @param lotId The ID of the parking lot to monitor
   * @param callback Function to call when the lot is updated
   * @returns Unsubscribe function
   */
  subscribeToLot(lotId: string, callback: (lot: ParkingLot) => void): () => void {
    console.log(`Setting up subscription to lot ${lotId}`);
    const callbackId = Date.now().toString();
    
    // Store the callback
    if (!this.lotCallbacks.has(lotId)) {
      this.lotCallbacks.set(lotId, new Map<string, (lot: ParkingLot) => void>());
    }
    
    const callbacksMap = this.lotCallbacks.get(lotId);
    if (callbacksMap) {
      callbacksMap.set(callbackId, callback);
    }
    
    // Set up Firestore listener if not already listening
    if (!this.lotListeners.has(lotId)) {
      const lotRef = doc(db, 'parkingLots', lotId);
      
      const unsubscribe = onSnapshot(
        lotRef,
        { includeMetadataChanges: true },
        (docSnap) => {
          if (docSnap.exists()) {
            const lotData = {
              id: docSnap.id,
              ...docSnap.data() as Omit<ParkingLot, 'id'>
            };
            
            // Notify all callbacks for this lot
            const lotCallbacks = this.lotCallbacks.get(lotId);
            if (lotCallbacks) {
              lotCallbacks.forEach((cb: (lot: ParkingLot) => void) => cb(lotData));
            }
          }
        },
        (error) => {
          console.error(`Error in lot subscription for ${lotId}:`, error);
        }
      );
      
      this.lotListeners.set(lotId, unsubscribe);
    }
    
    // Return an unsubscribe function for this specific callback
    return () => {
      const lotCallbacks = this.lotCallbacks.get(lotId);
      if (lotCallbacks) {
        lotCallbacks.delete(callbackId);
        
        // If no more callbacks for this lot, remove the Firestore listener
        if (lotCallbacks.size === 0) {
          console.log(`Removing subscription to lot ${lotId}`);
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
    console.log('Setting up subscription to all parking lots');
    
    // Set up Firestore listener for all lots
    const lotsQuery = query(collection(db, 'parkingLots'));
    
    // We're wrapping the listener setup with measurement for performance monitoring
    const unsubscribe = onSnapshot(
      lotsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const start = performance.now();
        const lots: ParkingLot[] = [];
        
        snapshot.forEach(doc => {
          lots.push({
            id: doc.id,
            ...doc.data() as Omit<ParkingLot, 'id'>
          });
        });
        
        callback(lots);
        
        const duration = performance.now() - start;
        if (duration > 100) {
          console.warn(`Slow lots update processing: ${duration.toFixed(2)}ms`);
        }
      },
      (error) => {
        console.error('Error in all lots subscription:', error);
      }
    );
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to updates for parking spaces in a specific lot
   * 
   * @requires Firestore index on 'parkingSpaces' collection: lotId ASC, number ASC
   * @param lotId The ID of the parking lot to monitor spaces for
   * @param callback Function to call when spaces are updated
   * @returns Unsubscribe function
   */
  subscribeToSpaces(lotId: string, callback: (spaces: ParkingSpace[]) => void): () => void {
    console.log(`Setting up subscription to spaces for lot ${lotId}`);
    const callbackId = Date.now().toString();
    
    // Store the callback
    if (!this.spaceCallbacks.has(lotId)) {
      this.spaceCallbacks.set(lotId, new Map<string, (spaces: ParkingSpace[]) => void>());
    }
    
    const callbacksMap = this.spaceCallbacks.get(lotId);
    if (callbacksMap) {
      callbacksMap.set(callbackId, callback);
    }
    
    // Set up Firestore listener if not already listening
    if (!this.spaceListeners.has(lotId)) {
      // Using orderBy with the compound index
      const lotSpacesQuery = query(
        collection(db, 'parkingSpaces'), 
        where('lotId', '==', lotId),
        orderBy('number')
      );
      
      // Perform index verification in a non-blocking way
      verifyIndexExists(lotSpacesQuery).then(indexExists => {
        if (!indexExists) {
          console.warn(`Missing index for spaces query: lotId ASC, number ASC`);
        }
      });
      
      const unsubscribe = onSnapshot(
        lotSpacesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          const start = performance.now();
          const spaces: ParkingSpace[] = [];
          
          snapshot.forEach(doc => {
            spaces.push({
              id: doc.id,
              ...doc.data() as Omit<ParkingSpace, 'id'>
            });
          });
          
          // Notify all callbacks for this lot
          const spaceCallbacks = this.spaceCallbacks.get(lotId);
          if (spaceCallbacks) {
            spaceCallbacks.forEach((cb: (spaces: ParkingSpace[]) => void) => cb(spaces));
          }
          
          const duration = performance.now() - start;
          if (duration > 100) {
            console.warn(`Slow spaces update processing for lot ${lotId}: ${duration.toFixed(2)}ms`);
          }
        },
        (error) => {
          console.error(`Error in spaces subscription for lot ${lotId}:`, error);
          
          // Check if error might be related to missing index
          if (error.toString().includes('index')) {
            console.error(`This might be due to a missing Firestore index for lotId + number. Create an index on 'parkingSpaces' collection with fields: lotId ASC, number ASC`);
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
          console.log(`Removing subscription to spaces for lot ${lotId}`);
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
    console.log(`Setting up subscription to booking ${bookingId}`);
    
    const unsubscribe = onSnapshot(
      doc(db, 'bookings', bookingId),
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          const bookingData = {
            id: docSnap.id,
            ...docSnap.data() as Omit<Booking, 'id'>
          };
          callback(bookingData);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(`Error in booking subscription for ${bookingId}:`, error);
      }
    );
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to updates for a user's active bookings
   * 
   * @requires Firestore index on 'bookings' collection: userId ASC, status IN, startTime DESC
   * @param userId The ID of the user to monitor bookings for
   * @param callback Function to call when bookings are updated
   * @returns Unsubscribe function
   */
  subscribeToUserActiveBookings(userId: string, callback: (bookings: Booking[]) => void): () => void {
    console.log(`Setting up subscription to active bookings for user ${userId}`);
    const callbackId = Date.now().toString();
    
    // Store the callback
    if (!this.bookingCallbacks.has(userId)) {
      this.bookingCallbacks.set(userId, new Map<string, (bookings: Booking[]) => void>());
    }
    
    const callbacksMap = this.bookingCallbacks.get(userId);
    if (callbacksMap) {
      callbacksMap.set(callbackId, callback);
    }
    
    // Set up Firestore listener if not already listening
    if (!this.bookingListeners.has(userId)) {
      // Using the compound index for this query
      const userBookingsQuery = query(
        collection(db, 'bookings'), 
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'occupied']),
        orderBy('startTime', 'desc')
      );
      
      // Perform index verification in a non-blocking way
      verifyIndexExists(userBookingsQuery).then(indexExists => {
        if (!indexExists) {
          console.warn(`Missing index for user active bookings query: userId ASC, status IN, startTime DESC`);
        }
      });
      
      const unsubscribe = onSnapshot(
        userBookingsQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          const start = performance.now();
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
            bookingCallbacks.forEach((cb: (bookings: Booking[]) => void) => cb(bookings));
          }
          
          const duration = performance.now() - start;
          if (duration > 100) {
            console.warn(`Slow active bookings update processing for user ${userId}: ${duration.toFixed(2)}ms`);
          }
        },
        (error) => {
          console.error(`Error in active bookings subscription for user ${userId}:`, error);
          
          // Check if error might be related to missing index
          if (error.toString().includes('index')) {
            console.error(`This might be due to a missing Firestore index. Create an index on 'bookings' collection with fields: userId ASC, status IN, startTime DESC`);
          }
        }
      );
      
      this.bookingListeners.set(userId, unsubscribe);
    }
    
    // Return an unsubscribe function for this specific callback
    return () => {
      const bookingCallbacks = this.bookingCallbacks.get(userId);
      if (bookingCallbacks) {
        bookingCallbacks.delete(callbackId);
        
        // If no more callbacks for this user, remove the Firestore listener
        if (bookingCallbacks.size === 0) {
          console.log(`Removing subscription to active bookings for user ${userId}`);
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
   * 
   * @requires Firestore index on 'bookings' collection: status ASC, startTime DESC
   * @param callback Function to call when pending bookings are updated
   * @returns Unsubscribe function
   */
  subscribeToPendingBookings(callback: (bookings: Booking[]) => void): () => void {
    console.log('Setting up subscription to pending bookings');
    
    // Using compound index for proper sorting
    const pendingBookingsQuery = query(
      collection(db, 'bookings'), 
      where('status', '==', 'pending'),
      orderBy('startTime', 'desc')
    );
    
    // Perform index verification in a non-blocking way
    verifyIndexExists(pendingBookingsQuery).then(indexExists => {
      if (!indexExists) {
        console.warn(`Missing index for pending bookings query: status ASC, startTime DESC`);
      }
    });
    
    const unsubscribe = onSnapshot(
      pendingBookingsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const start = performance.now();
        const bookings: Booking[] = [];
        
        snapshot.forEach(doc => {
          bookings.push({
            id: doc.id,
            ...doc.data() as Omit<Booking, 'id'>
          });
        });
        
        callback(bookings);
        
        const duration = performance.now() - start;
        if (duration > 100) {
          console.warn(`Slow pending bookings update processing: ${duration.toFixed(2)}ms`);
        }
      },
      (error) => {
        console.error('Error in pending bookings subscription:', error);
        
        // Check if error might be related to missing index
        if (error.toString().includes('index')) {
          console.error(`This might be due to a missing Firestore index. Create an index on 'bookings' collection with fields: status ASC, startTime DESC`);
        }
      }
    );
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to updates for active bookings (for workers)
   * 
   * @requires Firestore index on 'bookings' collection: status ASC, startTime DESC
   * @param callback Function to call when active bookings are updated
   * @returns Unsubscribe function
   */
  subscribeToActiveBookings(callback: (bookings: Booking[]) => void): () => void {
    console.log('Setting up subscription to active bookings');
    
    // Using compound index for proper sorting
    const activeBookingsQuery = query(
      collection(db, 'bookings'), 
      where('status', '==', 'occupied'),
      orderBy('startTime', 'desc')
    );
    
    // Perform index verification in a non-blocking way
    verifyIndexExists(activeBookingsQuery).then(indexExists => {
      if (!indexExists) {
        console.warn(`Missing index for active bookings query: status ASC, startTime DESC`);
      }
    });
    
    const unsubscribe = onSnapshot(
      activeBookingsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const start = performance.now();
        const bookings: Booking[] = [];
        
        snapshot.forEach(doc => {
          bookings.push({
            id: doc.id,
            ...doc.data() as Omit<Booking, 'id'>
          });
        });
        
        callback(bookings);
        
        const duration = performance.now() - start;
        if (duration > 100) {
          console.warn(`Slow active bookings update processing: ${duration.toFixed(2)}ms`);
        }
      },
      (error) => {
        console.error('Error in active bookings subscription:', error);
        
        // Check if error might be related to missing index
        if (error.toString().includes('index')) {
          console.error(`This might be due to a missing Firestore index. Create an index on 'bookings' collection with fields: status ASC, startTime DESC`);
        }
      }
    );
    
    return unsubscribe;
  }
}

// Create a singleton instance
const parkingUpdateService = new ParkingUpdateService();
export default parkingUpdateService;