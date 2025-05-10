// src/api/initializeDatabase.ts
import parkingAPI from './simpleParkingAPI';

/**
 * Initialize the database with sample data for testing
 * This should only be run once in development
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing database with sample data...");
    
    // Create main campus parking lot
    const mainCampusLot = {
      name: "Main Campus Parking",
      location: "JKUAT Main Campus",
      totalSpaces: 30,
      availableSpaces: 30,
      occupiedSpaces: 0,
      bookedSpaces: 0
    };
    
    const lot1 = await parkingAPI.createParkingLot(mainCampusLot);
    console.log(`Created parking lot: ${lot1.id}`);
    
    // Create spaces for main campus
    const spaces1 = await parkingAPI.createMultipleSpaces(lot1.id, 1, 30);
    console.log(`Created ${spaces1.length} parking spaces for main campus`);
    
    // Create staff parking lot
    const staffLot = {
      name: "Staff Parking",
      location: "JKUAT Admin Block",
      totalSpaces: 20,
      availableSpaces: 20,
      occupiedSpaces: 0,
      bookedSpaces: 0
    };
    
    const lot2 = await parkingAPI.createParkingLot(staffLot);
    console.log(`Created parking lot: ${lot2.id}`);
    
    // Create spaces for staff parking
    const spaces2 = await parkingAPI.createMultipleSpaces(lot2.id, 1, 20);
    console.log(`Created ${spaces2.length} parking spaces for staff parking`);
    
    // Create visitor parking lot
    const visitorLot = {
      name: "Visitor Parking",
      location: "JKUAT Visitor Center",
      totalSpaces: 15,
      availableSpaces: 15,
      occupiedSpaces: 0,
      bookedSpaces: 0
    };
    
    const lot3 = await parkingAPI.createParkingLot(visitorLot);
    console.log(`Created parking lot: ${lot3.id}`);
    
    // Create spaces for visitor parking
    const spaces3 = await parkingAPI.createMultipleSpaces(lot3.id, 1, 15);
    console.log(`Created ${spaces3.length} parking spaces for visitor parking`);
    
    console.log("Database initialization complete!");
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}