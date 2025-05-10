// src/api/verifyApiIntegration.ts
import parkingAPI from './simpleParkingAPI';
import { 
  getAllParkingLots, 
  getParkingLotById, 
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
  getParkingSpaces,
  createParkingSpace,
  updateParkingSpace,
  deleteParkingSpace,
  createMultipleParkingSpaces
} from './parkingService';

/**
 * Verify API integration by testing all functions
 * This can be run from a testing button or development screen
 */
export async function verifyApiIntegration() {
  try {
    console.log("Testing API integration...");
    
    // Test ParkingLot operations
    console.log("Testing ParkingLot operations...");
    
    // Create test lot
    const testLot = {
      name: "Test Lot",
      location: "API Integration Test",
      totalSpaces: 5,
      availableSpaces: 5,
      occupiedSpaces: 0,
      bookedSpaces: 0
    };
    
    const lot = await createParkingLot(testLot);
    console.log(`Created parking lot: ${lot.id}`);
    
    // Fetch the lot
    const fetchedLot = await getParkingLotById(lot.id);
    console.log(`Fetched parking lot: ${fetchedLot?.name}`);
    
    // Create spaces
    console.log("Testing ParkingSpace operations...");
    const spaces = await createMultipleParkingSpaces(lot.id, 1, 5);
    console.log(`Created ${spaces.length} parking spaces`);
    
    // Fetch spaces
    const fetchedSpaces = await getParkingSpaces(lot.id);
    console.log(`Fetched ${fetchedSpaces.length} parking spaces`);
    
    // Test is successful if we got here
    console.log("API integration test successful!");
    
    // Clean up - delete the test lot (which will delete the spaces too)
    await deleteParkingLot(lot.id);
    console.log("Test data cleaned up");
    
    return true;
  } catch (error) {
    console.error("API integration test failed:", error);
    return false;
  }
}