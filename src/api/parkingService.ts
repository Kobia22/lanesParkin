// src/api/parkingService.ts
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
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from '../firebase/firebaseConfig';
  import { getCurrentUser } from '../firebase/auth'
  import { ParkingLot, ParkingSpace, ParkingSpaceStatus } from '../firebase/types';
  
  /**
   * API Layer for parking lot and space operations
   * This abstracts the database operations and handles permissions checks
   */
  
  // Error handling wrapper for better API responses
  async function handleApiCall<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error('API Error:', error);
      
      // Check if it's a permission error
      if (error instanceof Error && 
          error.message.includes('permission')) {
        throw new Error('You do not have permission to perform this operation. Please check your login status.');
      }
      
      // For development/debugging
      throw error;
    }
  }
  
  // ========================
  // Parking Lot Operations
  // ========================
  
  /**
   * Get all parking lots
   */
  export async function getAllParkingLots(): Promise<ParkingLot[]> {
    return handleApiCall(async () => {
      const lotsSnapshot = await getDocs(collection(db, 'parkingLots'));
      const lots: ParkingLot[] = [];
      
      lotsSnapshot.forEach(doc => {
        lots.push({
          id: doc.id,
          ...doc.data() as Omit<ParkingLot, 'id'>
        });
      });
      
      return lots;
    });
  }
  
  /**
   * Get a single parking lot by ID
   */
  export async function getParkingLotById(lotId: string): Promise<ParkingLot | null> {
    return handleApiCall(async () => {
      const lotDoc = await getDoc(doc(db, 'parkingLots', lotId));
      
      if (!lotDoc.exists()) {
        return null;
      }
      
      return {
        id: lotDoc.id,
        ...lotDoc.data() as Omit<ParkingLot, 'id'>
      };
    });
  }
  
  /**
   * Create a new parking lot
   */
  export async function createParkingLot(lotData: Omit<ParkingLot, 'id'>): Promise<ParkingLot> {
    return handleApiCall(async () => {
      // Check current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins can create parking lots');
      }
      
      const docRef = await addDoc(collection(db, 'parkingLots'), lotData);
      
      return {
        id: docRef.id,
        ...lotData
      };
    });
  }
  
  /**
   * Update an existing parking lot
   */
  export async function updateParkingLot(
    lotId: string, 
    lotData: Partial<Omit<ParkingLot, 'id'>>
  ): Promise<void> {
    return handleApiCall(async () => {
      // Check current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins can update parking lots');
      }
      
      await updateDoc(doc(db, 'parkingLots', lotId), lotData);
    });
  }
  
  /**
   * Delete a parking lot and all its spaces
   */
  export async function deleteParkingLot(lotId: string): Promise<void> {
    return handleApiCall(async () => {
      // Check current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins can delete parking lots');
      }
      
      // Delete all spaces in the lot
      const spacesSnapshot = await getDocs(
        query(collection(db, 'parkingSpaces'), where('lotId', '==', lotId))
      );
      
      const deleteSpacePromises = spacesSnapshot.docs.map(spaceDoc => 
        deleteDoc(doc(db, 'parkingSpaces', spaceDoc.id))
      );
      
      // Delete the lot
      const deleteLotPromise = deleteDoc(doc(db, 'parkingLots', lotId));
      
      // Wait for all delete operations to complete
      await Promise.all([...deleteSpacePromises, deleteLotPromise]);
    });
  }
  
  // ========================
  // Parking Space Operations
  // ========================
  
  /**
   * Get all parking spaces for a lot
   */
  export async function getParkingSpaces(lotId: string): Promise<ParkingSpace[]> {
    return handleApiCall(async () => {
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
    });
  }
  
  /**
   * Get a single parking space by ID
   */
  export async function getParkingSpaceById(spaceId: string): Promise<ParkingSpace | null> {
    return handleApiCall(async () => {
      const spaceDoc = await getDoc(doc(db, 'parkingSpaces', spaceId));
      
      if (!spaceDoc.exists()) {
        return null;
      }
      
      return {
        id: spaceDoc.id,
        ...spaceDoc.data() as Omit<ParkingSpace, 'id'>
      };
    });
  }
  
  /**
   * Create a new parking space
   */
  export async function createParkingSpace(spaceData: Omit<ParkingSpace, 'id'>): Promise<ParkingSpace> {
    return handleApiCall(async () => {
      // Check current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || 
          (currentUser.role !== 'admin' && 
           currentUser.role !== 'worker' && 
           process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins and workers can create parking spaces');
      }
      
      const docRef = await addDoc(collection(db, 'parkingSpaces'), spaceData);
      
      return {
        id: docRef.id,
        ...spaceData
      };
    });
  }
  
  /**
   * Update an existing parking space
   */
  export async function updateParkingSpace(
    spaceId: string,
    spaceData: Partial<Omit<ParkingSpace, 'id'>>
  ): Promise<void> {
    return handleApiCall(async () => {
      // Check current user is admin or worker
      const currentUser = await getCurrentUser();
      if (!currentUser || 
          (currentUser.role !== 'admin' && 
           currentUser.role !== 'worker' && 
           process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins and workers can update parking spaces');
      }
      
      await updateDoc(doc(db, 'parkingSpaces', spaceId), spaceData);
    });
  }
  
  /**
   * Delete a parking space
   */
  export async function deleteParkingSpace(spaceId: string): Promise<void> {
    return handleApiCall(async () => {
      // Check current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins can delete parking spaces');
      }
      
      await deleteDoc(doc(db, 'parkingSpaces', spaceId));
    });
  }
  
  /**
   * Update status of a parking space (with necessary lot updates)
   */
  export async function updateParkingSpaceStatus(
    spaceId: string,
    status: ParkingSpaceStatus,
    userData?: { userId?: string, userEmail?: string, vehicleInfo?: string }
  ): Promise<void> {
    return handleApiCall(async () => {
      // Check current user is admin or worker
      const currentUser = await getCurrentUser();
      if (!currentUser || 
          (currentUser.role !== 'admin' && 
           currentUser.role !== 'worker' && 
           process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins and workers can update parking space status');
      }
      
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
      const lotDoc = await getDoc(doc(db, 'parkingLots', space.lotId));
      if (!lotDoc.exists()) {
        throw new Error("Parking lot not found");
      }
      
      const lot = {
        id: lotDoc.id,
        ...lotDoc.data() as Omit<ParkingLot, 'id'>
      };
      
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
        startTime: status === 'vacant' ? null : new Date().toISOString()
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
      await updateDoc(doc(db, 'parkingLots', lot.id), lotUpdate);
    });
  }
  
  /**
   * Create multiple parking spaces for a lot at once
   */
  export async function createMultipleParkingSpaces(
    lotId: string, 
    startNumber: number, 
    count: number
  ): Promise<ParkingSpace[]> {
    return handleApiCall(async () => {
      // Check current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && process.env.NODE_ENV !== 'development')) {
        throw new Error('Only admins can create multiple parking spaces');
      }
      
      const spaces: ParkingSpace[] = [];
      
      // Create spaces with sequential numbers
      for (let i = 0; i < count; i++) {
        const spaceData: Omit<ParkingSpace, 'id'> = {
          lotId,
          number: startNumber + i,
          status: 'vacant'
        };
        
        const spaceRef = await addDoc(collection(db, 'parkingSpaces'), spaceData);
        
        spaces.push({
          id: spaceRef.id,
          ...spaceData
        });
      }
      
      // Update lot total spaces count
      const lotRef = doc(db, 'parkingLots', lotId);
      const lotDoc = await getDoc(lotRef);
      
      if (lotDoc.exists()) {
        const lotData = lotDoc.data() as Omit<ParkingLot, 'id'>;
        
        await updateDoc(lotRef, {
          totalSpaces: lotData.totalSpaces + count,
          availableSpaces: lotData.availableSpaces + count
        });
      }
      
      return spaces;
    });
  }