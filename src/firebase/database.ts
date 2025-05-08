// src/firebase/database.ts
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
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  import { ParkingLot, ParkingSpace, Booking } from './types';
  
  // Parking Lot Operations
  export async function fetchParkingLots(): Promise<ParkingLot[]> {
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
  
  export async function getParkingLot(lotId: string): Promise<ParkingLot | null> {
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
  
  export async function addParkingLot(lotData: Omit<ParkingLot, 'id'>): Promise<ParkingLot> {
    try {
      const docRef = await addDoc(collection(db, 'parkingLots'), lotData);
      
      return {
        id: docRef.id,
        ...lotData
      };
    } catch (error) {
      console.error("Error adding parking lot:", error);
      throw error;
    }
  }
  
  export async function updateParkingLot(
    lotId: string, 
    lotData: Partial<Omit<ParkingLot, 'id'>>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'parkingLots', lotId), lotData);
    } catch (error) {
      console.error("Error updating parking lot:", error);
      throw error;
    }
  }
  
  export async function deleteParkingLot(lotId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'parkingLots', lotId));
      
      // Delete associated parking spaces
      const spacesSnapshot = await getDocs(
        query(collection(db, 'parkingSpaces'), where('lotId', '==', lotId))
      );
      
      const deletePromises = spacesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting parking lot:", error);
      throw error;
    }
  }
  
  // Parking Space Operations
  export async function fetchParkingSpaces(lotId: string): Promise<ParkingSpace[]> {
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
  
  export async function addParkingSpace(spaceData: Omit<ParkingSpace, 'id'>): Promise<ParkingSpace> {
    try {
      const docRef = await addDoc(collection(db, 'parkingSpaces'), spaceData);
      
      return {
        id: docRef.id,
        ...spaceData
      };
    } catch (error) {
      console.error("Error adding parking space:", error);
      throw error;
    }
  }
  
  export async function updateParkingSpace(
    spaceId: string,
    spaceData: Partial<Omit<ParkingSpace, 'id'>>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'parkingSpaces', spaceId), spaceData);
    } catch (error) {
      console.error("Error updating parking space:", error);
      throw error;
    }
  }
  
  export async function deleteParkingSpace(spaceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'parkingSpaces', spaceId));
    } catch (error) {
      console.error("Error deleting parking space:", error);
      throw error;
    }
  }
  
  // Booking Operations
  export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<Booking> {
    try {
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      
      // Update parking space status
      await updateParkingSpace(bookingData.spaceId, {
        isOccupied: true,
        currentBookingId: docRef.id
      });
      
      // Update lot availability
      const lot = await getParkingLot(bookingData.lotId);
      if (lot) {
        await updateParkingLot(bookingData.lotId, {
          availableSpaces: lot.availableSpaces - 1,
          bookedSpaces: lot.bookedSpaces + 1
        });
      }
      
      return {
        id: docRef.id,
        ...bookingData
      };
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }
  
  export async function getUserBookings(userId: string): Promise<Booking[]> {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
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
      console.error("Error fetching user bookings:", error);
      throw error;
    }
  }
  
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
      const updateData: any = { status };
      if (endTime) {
        updateData.endTime = endTime;
      }
      
      await updateDoc(bookingRef, updateData);
      
      // If completed or cancelled, free up the space
      if (status === 'completed' || status === 'cancelled') {
        // Update parking space
        await updateParkingSpace(booking.spaceId, {
          isOccupied: false,
          currentBookingId: null
        });
        
        // Update parking lot stats
        const lot = await getParkingLot(booking.lotId);
        if (lot) {
          await updateParkingLot(booking.lotId, {
            availableSpaces: lot.availableSpaces + 1,
            bookedSpaces: lot.bookedSpaces - 1
          });
        }
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw error;
    }
  }