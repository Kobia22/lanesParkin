// src/api/parkingService.ts - Modified to ensure space count synchronization
import {
  fetchParkingLots,
  getParkingLot,
  addParkingLot,
  updateParkingLot as apiUpdateParkingLot,
  deleteParkingLot as apiDeleteParkingLot,
  fetchParkingSpaces,
  addParkingSpace,
  createMultipleParkingSpaces as apiCreateMultipleParkingSpaces,
  updateParkingSpace as apiUpdateParkingSpace,
  deleteParkingSpace as apiDeleteParkingSpace,
  updateParkingSpaceStatus as apiUpdateParkingSpaceStatus
} from './parkingAPIIntegration';
import { getCurrentUser } from '../firebase/auth';
import { ParkingLot, ParkingSpace, ParkingSpaceStatus } from '../firebase/types';

/**
 * Get all parking lots with error handling and validated counts
 * @returns Promise resolving to array of parking lots
 */
export const getAllParkingLots = async () => handleApiCall('getAllParkingLots', async () => {
  const lots = await fetchParkingLots();
  
  // For each lot, validate the space counts
  for (const lot of lots) {
    await validateLotSpaceCounts(lot.id);
  }
  
  return await fetchParkingLots(); // Fetch again to get updated counts
});

/**
 * Get a parking lot by ID with error handling and validated counts
 * @param lotId ID of the parking lot to retrieve
 * @returns Promise resolving to a parking lot or null
 */
export const getParkingLotById = async (lotId: string) => handleApiCall('getParkingLotById', async () => {
  const lot = await getParkingLot(lotId);
  
  if (lot) {
    await validateLotSpaceCounts(lotId);
    return await getParkingLot(lotId); // Fetch again to get updated counts
  }
  
  return lot;
});

/**
 * Validate and synchronize space counts for a parking lot
 * @param lotId ID of the parking lot
 */
async function validateLotSpaceCounts(lotId: string): Promise<void> {
  try {
    const lot = await getParkingLot(lotId);
    const spaces = await fetchParkingSpaces(lotId);
    
    if (!lot) return;
    
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(space => space.status === 'vacant').length;
    const occupiedSpaces = spaces.filter(space => space.status === 'occupied').length;
    const bookedSpaces = spaces.filter(space => space.status === 'booked').length;
    
    // Check if counts need to be updated
    if (lot.totalSpaces !== totalSpaces || 
        lot.availableSpaces !== availableSpaces ||
        lot.occupiedSpaces !== occupiedSpaces ||
        lot.bookedSpaces !== bookedSpaces) {
      
      console.log(`Synchronizing counts for lot ${lotId}:`, {
        totalSpaces,
        availableSpaces,
        occupiedSpaces,
        bookedSpaces
      });
      
      await apiUpdateParkingLot(lotId, {
        totalSpaces,
        availableSpaces,
        occupiedSpaces,
        bookedSpaces
      });
    }
  } catch (error) {
    console.error(`Error validating lot space counts for ${lotId}:`, error);
  }
}

/**
 * Create a new parking lot with error handling
 * @param lotData Parking lot data without ID
 * @returns Promise resolving to the created parking lot
 */
export const createParkingLot = (lotData: Omit<ParkingLot, 'id'>) => 
  handleApiCall('createParkingLot', () => addParkingLot(lotData));

/**
 * Update a parking lot with error handling
 * @param lotId ID of the parking lot to update
 * @param lotData Partial parking lot data
 * @returns Promise resolving to void
 */
export const updateParkingLot = (lotId: string, lotData: Partial<Omit<ParkingLot, 'id'>>) => 
  handleApiCall('updateParkingLot', () => apiUpdateParkingLot(lotId, lotData));

/**
 * Delete a parking lot with error handling
 * @param lotId ID of the parking lot to delete
 * @returns Promise resolving to void
 */
export const deleteParkingLot = (lotId: string) => 
  handleApiCall('deleteParkingLot', () => apiDeleteParkingLot(lotId));

/**
 * Get parking spaces for a lot with error handling and ensure lot counts are synchronized
 * @param lotId ID of the parking lot
 * @returns Promise resolving to array of parking spaces
 */
export const getParkingSpaces = async (lotId: string) => 
  handleApiCall('getParkingSpaces', async () => {
    const fetchedSpaces = await fetchParkingSpaces(lotId);
    
    // Synchronize the lot's space counts with actual spaces
    await validateLotSpaceCounts(lotId);
    
    return fetchedSpaces;
  });

/**
 * Create a new parking space with error handling and update lot counts
 * @param spaceData Parking space data without ID
 * @returns Promise resolving to the created parking space
 */
export const createParkingSpace = async (spaceData: Omit<ParkingSpace, 'id'>) => 
  handleApiCall('createParkingSpace', async () => {
    const newSpace = await addParkingSpace(spaceData);
    
    // Update lot counts after adding a space
    await validateLotSpaceCounts(spaceData.lotId);
    
    return newSpace;
  });

/**
 * Create multiple parking spaces at once with error handling
 * @param lotId ID of the parking lot
 * @param startNumber Starting space number
 * @param count Number of spaces to create
 * @returns Promise resolving to array of created parking spaces
 */
export const createMultipleParkingSpaces = (lotId: string, startNumber: number, count: number): Promise<ParkingSpace[]> => 
  handleApiCall('createMultipleParkingSpaces', async () => {
    const newSpaces = await apiCreateMultipleParkingSpaces(lotId, startNumber, count);
    
    // Update lot counts after adding multiple spaces
    await validateLotSpaceCounts(lotId);
    
    return newSpaces;
  });

/**
 * Update a parking space with error handling
 * @param spaceId ID of the parking space to update
 * @param spaceData partial data
 * @returns Promise resolving to void
 */
export const updateParkingSpace = (spaceId: string, spaceData: Partial<Omit<ParkingSpace, 'id'>>) => 
  handleApiCall('updateParkingSpace', async () => {
    // Get the original space to know which lot it belongs to
    const spaces = await fetchParkingSpaces('');
    const space = spaces.find(s => s.id === spaceId);
    
    if (!space) {
      throw new Error(`Space with ID ${spaceId} not found`);
    }
    
    // Update the space
    const result = await apiUpdateParkingSpace(spaceId, spaceData);
    
    // If status changed, update lot counts
    if (spaceData.status && spaceData.status !== space.status) {
      await validateLotSpaceCounts(space.lotId);
    }
    
    return result;
  });

/**
 * Delete a parking space with error handling and update lot counts
 * @param spaceId ID of the parking space to delete
 * @returns Promise resolving to void
 */
export const deleteParkingSpace = (spaceId: string) => 
  handleApiCall('deleteParkingSpace', async () => {
    // Get the original space to know which lot it belongs to
    const spaces = await fetchParkingSpaces('');
    const space = spaces.find(s => s.id === spaceId);
    
    if (!space) {
      throw new Error(`Space with ID ${spaceId} not found`);
    }
    
    const lotId = space.lotId;
    
    // Delete the space
    const result = await apiDeleteParkingSpace(spaceId);
    
    // Update lot counts after deleting a space
    await validateLotSpaceCounts(lotId);
    
    return result;
  });

/**
 * Update parking space status with error handling and update lot counts
 * @param spaceId ID of the parking space
 * @param status New status for the space
 * @param userData Optional user data for occupied or booked status
 * @returns Promise resolving to void
 */
export const updateParkingSpaceStatus = (
  spaceId: string, 
  status: ParkingSpaceStatus, 
  userData?: { userId?: string, userEmail?: string, vehicleInfo?: string }
) => 
  handleApiCall('updateParkingSpaceStatus', async () => {
    // Get the original space to know which lot it belongs to
    const spaces = await fetchParkingSpaces('');
    const space = spaces.find(s => s.id === spaceId);
    
    if (!space) {
      throw new Error(`Space with ID ${spaceId} not found`);
    }
    
    // Update the space status
    const result = await apiUpdateParkingSpaceStatus(spaceId, status, userData);
    
    // Update lot counts after updating status
    await validateLotSpaceCounts(space.lotId);
    
    return result;
  });

/**
 * Enhanced error handling wrapper for API calls
 * 
 * @param operationName Name of the operation for logging and tracking
 * @param operation Function that executes the API operation
 * @returns Result of the API operation
 */
export async function handleApiCall<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
  const start = performance.now();
  
  try {
    // Check permissions if in a protected operation
    if (operationName.startsWith('create') || 
        operationName.startsWith('update') || 
        operationName.startsWith('delete')) {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        throw new Error('Permission denied: You do not have the required role to perform this operation');
      }
    }
    
    // Execute the operation
    const result = await operation();
    
    // Log performance data
    const duration = performance.now() - start;
    if (duration > 500) {
      console.warn(`⚠️ Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.info(`ℹ️ Operation ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    // Enhanced error handling with more context
    console.error(`API Error in ${operationName}:`, error);
    
    // Calculate operation duration even for errors
    const duration = performance.now() - start;
    console.warn(`❌ Failed operation: ${operationName} after ${duration.toFixed(2)}ms`);
    
    // Format user-friendly error message
    let errorMessage = 'An error occurred while processing your request';
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('permission')) {
        errorMessage = 'You do not have permission to perform this operation. Please check your login status.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'The requested resource was not found. It may have been deleted or never existed.';
      } else if (error.message.includes('already exists')) {
        errorMessage = 'This resource already exists. Please use a different identifier.';
      } else if (error.message.includes('index')) {
        errorMessage = 'Database query failed. This might be due to a missing index. Please contact support.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (process.env.NODE_ENV === 'development') {
        // In development, include the actual error message
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    // Rethrow with enhanced message
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).operation = operationName;
    (enhancedError as any).duration = duration;
    
    throw enhancedError;
  }
}

/**
 * Check permissions for admin/worker operations
 * 
 * @param requiredRoles Array of allowed roles (default: admin and worker)
 * @returns Boolean indicating if user has permission
 */
export async function checkPermission(requiredRoles: string[] = ['admin', 'worker']): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;
    
    // Allow all operations in development mode for easier testing
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    return requiredRoles.includes(currentUser.role);
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}