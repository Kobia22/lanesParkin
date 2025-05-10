// src/api/parkingService.ts
// Import from our integration layer instead of directly from Firebase
import {
  fetchParkingLots,
  getParkingLot,
  addParkingLot,
  updateParkingLot,
  deleteParkingLot,
  fetchParkingSpaces,
  addParkingSpace,
  createMultipleParkingSpaces,
  updateParkingSpace,
  deleteParkingSpace,
  updateParkingSpaceStatus
} from './parkingAPIIntegration';
import { getCurrentUser } from '../firebase/auth';

// Re-export all the functions with service-specific names
export const getAllParkingLots = fetchParkingLots;
export const getParkingLotById = getParkingLot;
export const createParkingLot = addParkingLot;
export { updateParkingLot, deleteParkingLot };
export const getParkingSpaces = fetchParkingSpaces;
export const createParkingSpace = addParkingSpace;
export { createMultipleParkingSpaces };
export { updateParkingSpace, deleteParkingSpace, updateParkingSpaceStatus };

// Error handling wrapper for better API responses
export async function handleApiCall<T>(operation: () => Promise<T>): Promise<T> {
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

// Check permissions for admin/worker operations
export async function checkPermission(requiredRoles: string[] = ['admin', 'worker']): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  
  return requiredRoles.includes(currentUser.role) || process.env.NODE_ENV === 'development';
}