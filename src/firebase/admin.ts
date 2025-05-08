// src/firebase/admin.ts
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  import { Booking, Analytics } from './types';
  
  // Fetch active or abandoned bookings for admin dashboard
  export async function fetchActiveOrAbandonedBookings(): Promise<Booking[]> {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['active', 'abandoned']),
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
      console.error("Error fetching active/abandoned bookings:", error);
      throw error;
    }
  }
  
  // Fetch analytics data for admin
  export async function fetchAnalytics(): Promise<Analytics> {
    try {
      // In a real application, you would have a proper analytics service
      // This is a simplified version for demo purposes
      
      // For demo, we'll return some mock data
      // In production, you'd calculate these values from actual booking data
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
  
  // Fetch recent bookings for analytics
  export async function fetchRecentBookings(limit: number = 10): Promise<Booking[]> {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('startTime', 'desc'),
        limit(limit)
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
      console.error("Error fetching recent bookings:", error);
      throw error;
    }
  }
  
  // Add a test admin user (for development purposes)
  export async function setupAdminUser(): Promise<void> {
    // This would typically be done through a secure admin panel
    // For development, you could add this function to create test admin users
    console.log("Admin user setup function would be implemented here.");
    // Implementation would depend on your security requirements
  }