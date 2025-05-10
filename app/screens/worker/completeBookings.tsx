// app/screens/worker/completeBookings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TextInput
} from 'react-native';
import { 
  completeBooking,
  updateBookingStatus
} from '../../../src/firebase/database';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, User } from '../../../src/firebase/types';
import { useTheme } from '../../context/themeContext';
export default function CompleteBookingsScreen() {
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  
  // Mock active bookings for demonstration
  // In a real app, these would come from the database
  const mockActiveBookings: Booking[] = [
    {
      id: 'booking1',
      userId: 'user1',
      userEmail: 'student@students.jkuat.ac.ke',
      userRole: 'student',
      lotId: 'lot1',
      lotName: 'Lot A',
      spaceId: 'space1',
      spaceNumber: 5,
      status: 'occupied',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      endTime: null,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours in future
      vehicleInfo: 'KCA 123Y',
      paymentStatus: 'pending',
      paymentAmount: 200,
      billingType: 'student_fixed',
      billingRate: 200
    },
    {
      id: 'booking2',
      userId: 'user2',
      userEmail: 'guest@example.com',
      userRole: 'guest',
      lotId: 'lot1',
      lotName: 'Lot A',
      spaceId: 'space2',
      spaceNumber: 10,
      status: 'occupied',
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      endTime: null,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours in future
      vehicleInfo: 'KBZ 567X',
      paymentStatus: 'pending',
      paymentAmount: 100,
      billingType: 'guest_hourly',
      billingRate: 50
    },
    {
      id: 'booking3',
      userId: 'user3',
      userEmail: 'guest2@gmail.com',
      userRole: 'guest',
      lotId: 'lot2',
      lotName: 'Lot B',
      spaceId: 'space15',
      spaceNumber: 15,
      status: 'occupied',
      startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      endTime: null,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours in future
      vehicleInfo: 'KDJ 432P',
      paymentStatus: 'pending',
      paymentAmount: 0, // Will be free (under 30 mins for guest)
      billingType: 'guest_hourly',
      billingRate: 50
    }
  ];
  
  // Load active bookings
  const loadBookings = useCallback(() => {
    try {
      setError(null);
      setLoading(true);
      
      // In a real app, you'd fetch these from the database
      setActiveBookings(mockActiveBookings);
      applySearchFilter(mockActiveBookings, searchQuery);
      
    } catch (err) {
      console.error('Error fetching active bookings:', err);
      setError('Failed to load active bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);
  
  // Apply search filter
  const applySearchFilter = (bookings: Booking[], query: string) => {
    if (!query.trim()) {
      setFilteredBookings(bookings);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = bookings.filter(booking => 
      booking.userEmail.toLowerCase().includes(lowerQuery) ||
      (booking.vehicleInfo?.toLowerCase() || '').includes(lowerQuery) ||
      booking.id.toLowerCase().includes(lowerQuery) ||
      booking.lotName.toLowerCase().includes(lowerQuery) ||
      booking.spaceNumber.toString().includes(lowerQuery)
    );
    
    setFilteredBookings(filtered);
  };
  
  // Handle search input change
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applySearchFilter(activeBookings, text);
  };

  useEffect(() => {
    loadBookings();
    
    // Set up polling to refresh bookings every minute
    const pollInterval = setInterval(() => {
      loadBookings();
    }, 60000);
    
    return () => clearInterval(pollInterval);
  }, [loadBookings]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Handle completion of booking
  const handleCompleteBooking = (booking: Booking) => {
    Alert.alert(
      'Complete Booking',
      `Are you confirming that the vehicle for Space #${booking.spaceNumber} is leaving?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setProcessingBooking(booking.id);
              
              // In a real app, you'd call the API function
              // await completeBooking(booking.id);
              
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Calculate final payment based on guest/student status
              let finalAmount = booking.paymentAmount;
              
              if (booking.userRole === 'guest') {
                // Calculate actual duration
                const startTime = new Date(booking.startTime);
                const now = new Date();
                const durationMs = now.getTime() - startTime.getTime();
                const durationHours = durationMs / (1000 * 60 * 60);
                
                // First 30 minutes are free
                if (durationHours <= 0.5) {
                  finalAmount = 0;
                } else {
                  // Calculate billable hours (after free period)
                  const billableHours = durationHours - 0.5;
                  
                  // Round up to next hour
                  const roundedHours = Math.ceil(billableHours);
                  
                  // Calculate cost
                  finalAmount = roundedHours * booking.billingRate;
                }
              }
              
              // Show payment receipt
              const isFreeForGuest = booking.userRole !== 'student' && finalAmount === 0;
              
              Alert.alert(
                'Payment Complete',
                isFreeForGuest
                  ? `This was a free parking session (under 30 minutes for guest). Space #${booking.spaceNumber} is now available.`
                  : `Payment of KSH ${finalAmount} ${booking.userRole === 'student' ? '(student fixed rate)' : '(guest hourly rate)'} has been processed. Space #${booking.spaceNumber} is now available.`,
                [{ text: 'OK' }]
              );
              
              // Update local state
              setActiveBookings(prev => prev.filter(b => b.id !== booking.id));
              applySearchFilter(
                activeBookings.filter(b => b.id !== booking.id), 
                searchQuery
              );
              
            } catch (err) {
              console.error('Error completing booking:', err);
              Alert.alert('Error', 'Failed to complete booking');
            } finally {
              setProcessingBooking(null);
            }
          }
        }
      ]
    );
  };

  // Calculate booking duration
  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const durationMs = now.getTime() - start.getTime();
    
    // Convert to hours and minutes
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Estimate cost based on duration
  const estimateCost = (booking: Booking) => {
    if (booking.userRole === 'student') {
      return `KSH ${booking.billingRate} (fixed)`;
    } else {
      const startTime = new Date(booking.startTime);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      
      // Convert to hours
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // First 30 minutes are free
      if (durationHours <= 0.5) {
        return 'Free (under 30 min)';
      }
      
      // Calculate billable hours (after free period)
      const billableHours = durationHours - 0.5;
      
      // Round up to next hour
      const roundedHours = Math.ceil(billableHours);
      
      // Calculate cost
      const cost = roundedHours * booking.billingRate;
      
      return `KSH ${cost}`;
    }
  };
  
  // Render booking card
  const renderBookingCard = ({ item }: { item: Booking }) => {
    const duration = calculateDuration(item.startTime);
    const estimatedCost = estimateCost(item);
    
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.bookingIdText}>ID: {item.id.substring(0, 8)}...</Text>
            <Text style={styles.spaceInfoText}>{item.lotName} - Space #{item.spaceNumber}</Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            item.status === 'occupied' ? styles.occupiedBadge : styles.pendingBadge
          ]}>
            <Text style={styles.statusText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.userInfoContainer}>
            <Ionicons name="person" size={18} color={colors.textLight} style={styles.infoIcon} />
            <Text style={styles.userInfoText}>{item.userEmail}</Text>
          </View>
          
          <View style={styles.userInfoContainer}>
            <Ionicons name="car" size={18} color={colors.textLight} style={styles.infoIcon} />
            <Text style={styles.userInfoText}>{item.vehicleInfo || 'No vehicle info'}</Text>
          </View>
          
          <View style={styles.costContainer}>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Duration:</Text>
              <Text style={styles.costValue}>{duration}</Text>
            </View>
            
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Est. Cost:</Text>
              <Text style={styles.costValue}>{estimatedCost}</Text>
            </View>
            
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Type:</Text>
              <Text style={styles.costValue}>
                {item.userRole === 'student' ? 'Student (Fixed)' : 'Guest (Hourly)'}
              </Text>
            </View>
          </View>
          
          <View style={styles.bookingActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.completeButton
              ]}
              onPress={() => handleCompleteBooking(item)}
              disabled={processingBooking === item.id}
            >
              {processingBooking === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={styles.actionIcon} />
                  <Text style={styles.actionButtonText}>Complete & Process Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Bookings</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vehicle, email, or space number"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                Loading active bookings...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Active Bookings</Text>
              <Text style={styles.emptyText}>
                There are currently no active bookings that need to be completed.
              </Text>
            </View>
          )
        }
        contentContainerStyle={
          filteredBookings.length === 0 ? { flex: 1 } : styles.listContent
        }
      />

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Pricing Information:</Text>
        <Text style={styles.infoText}>
          • Students pay a fixed rate of KSH 200 per day
        </Text>
        <Text style={styles.infoText}>
          • Guests pay KSH 50 per hour (first 30 minutes free)
        </Text>
        <Text style={styles.infoText}>
          • Payment is processed when a booking is completed
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: spacing.md,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  errorContainer: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: spacing.md,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bookingIdText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  spaceInfoText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  statusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  occupiedBadge: {
    backgroundColor: '#FEE2E2',
  },
  pendingBadge: {
    backgroundColor: '#E0F2F1',
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.text,
  },
  bookingDetails: {
    padding: spacing.md,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  userInfoText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    flex: 1,
  },
  costContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  costLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  costValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
  },
  bookingActions: {
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  }
});