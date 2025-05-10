// src/firebase/admin.ts
// Import from our integration layer
import {
  fetchActiveOrAbandonedBookings,
  fetchAnalytics,
  fetchRecentBookings
} from '../api/parkingAPIIntegration';
import { createTestAdmin } from './auth';

// Re-export the functions
export {
  fetchActiveOrAbandonedBookings,
  fetchAnalytics,
  fetchRecentBookings
};

// Setup admin user function
export async function setupAdminUser(): Promise<void> {
  // This would typically be done through a secure admin panel
  // For development, you could add this function to create test admin users
  try {
    await createTestAdmin('admin@admin.lanesparking.com', 'Admin123!');
    console.log("Test admin user created successfully");
  } catch (error) {
    console.error("Error creating test admin user:", error);
    throw error;
  }
}