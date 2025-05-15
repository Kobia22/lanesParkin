// app/screens/user/history.tsx - Optimized to use existing indexes
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { 
  getUserBookings, 
  updateBookingStatus, 
  getParkingLot 
} from '../../../src/api/parkingAPIIntegration';
import { getCurrentUser } from '../../../src/firebase/auth';
import { spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, ParkingLot, User } from '../../../src/firebase/types';
import { useTheme } from '../../context/themeContext';
// Import the real-time updates service
import parkingUpdateService from '../../../src/firebase/realtimeUpdates';

export default function HistoryScreen() {
  const { colors, isDarkMode } = useTheme();
  const [bookings, setBookings] = useState<(Booking & { lotName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Store unsubscribe function
  const bookingsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Load bookings on component mount
  // Modified part of the useEffect in history.tsx
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      setError(null);
      setLoading(true);

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      setCurrentUser(user);
      
      // First load all bookings for the user - this uses the userId + startTime index
      await fetchBookings(user.id);
      
      // Try to subscribe to real-time updates, but fall back to periodic polling if index is missing
      if (bookingsUnsubscribeRef.current) {
        bookingsUnsubscribeRef.current();
        bookingsUnsubscribeRef.current = null;
      }
      
      try {
        // This will throw an error if the index is missing
        bookingsUnsubscribeRef.current = parkingUpdateService.subscribeToUserActiveBookings(
          user.id,
          async (updatedActiveBookings) => {
            console.log('History screen: Real-time active bookings update received:', updatedActiveBookings.length);
            
            // Use optimistic UI update for active bookings
            if (updatedActiveBookings.length > 0) {
              // Implementation remains the same...
              const activeBookingsMap = new Map(
                updatedActiveBookings.map(booking => [booking.id, booking])
              );
              
              setBookings(prevBookings => {
                return prevBookings.map(booking => {
                  if (activeBookingsMap.has(booking.id)) {
                    const updatedBooking = activeBookingsMap.get(booking.id)!;
                    return { ...updatedBooking, lotName: booking.lotName };
                  }
                  return booking;
                });
              });
            }
            
            if (updatedActiveBookings.length <= 2) {
              await fetchBookings(user.id, false);
            }
          }
        );
      } catch (indexError) {
        console.warn('Missing index for real-time updates, falling back to polling:', indexError);
        
        // Fallback to polling every 15 seconds if the index is missing
        const pollIntervalId = setInterval(async () => {
          if (currentUser) {
            console.log('Polling for booking updates (index missing)');
            await fetchBookings(currentUser.id, false);
          }
        }, 15000); // Poll every 15 seconds
        
        // Store the interval ID for cleanup
        bookingsUnsubscribeRef.current = () => clearInterval(pollIntervalId);
      }
      
    } catch (err) {
      console.error('Error fetching initial booking data:', err);
      setError('Failed to load your booking history');
    } finally {
      setLoading(false);
    }
  };

  fetchInitialData();
  
  // Clean up subscription when component unmounts
  return () => {
    if (bookingsUnsubscribeRef.current) {
      bookingsUnsubscribeRef.current();
    }
  };
}, []);

  // Fetch bookings with lot names - optimized to use existing userId + startTime index
  const fetchBookings = async (userId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setError(null);
      }
      
      // Use the userId + startTime index efficiently by requesting sort by startTime
      // getUserBookings already implements this internally
      let userBookings = await getUserBookings(userId);
      
      // Process lot information for each booking
      const bookingsWithLotNames = await Promise.all(
        userBookings.map(async (booking) => {
          // First check if we already have this lot's name in our existing bookings
          // This reduces redundant Firestore queries for the same lot
          const existingBookingWithSameLot = bookings.find(b => b.lotId === booking.lotId);
          if (existingBookingWithSameLot?.lotName) {
            return {
              ...booking,
              lotName: existingBookingWithSameLot.lotName
            };
          }
          
          // Fetch the lot information only if we don't have it already
          try {
            const lot = await getParkingLot(booking.lotId);
            return {
              ...booking,
              lotName: lot?.name || booking.lotName || 'Unknown Lot',
            };
          } catch (err) {
            return {
              ...booking,
              lotName: booking.lotName || 'Unknown Lot',
            };
          }
        })
      );

      setBookings(bookingsWithLotNames);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      if (showLoading) {
        setError('Failed to load your booking history');
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Handle refresh - optimized to avoid redundant lotName fetching
  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser) {
      await fetchBookings(currentUser.id);
    } else {
      setRefreshing(false);
    }
  };

  // Handle booking cancellation - optimized for immediate UI feedback
  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Optimistic UI update - immediately show as cancelled
              setBookings(prevBookings => 
                prevBookings.map(booking => 
                  booking.id === bookingId 
                    ? { ...booking, status: 'cancelled', endTime: new Date().toISOString() } 
                    : booking
                )
              );
              
              // Actually perform the cancellation
              await updateBookingStatus(bookingId, 'cancelled', new Date().toISOString());
              
              // The real-time subscription will handle any further updates if needed
              setLoading(false);
            } catch (err) {
              console.error('Error cancelling booking:', err);
              Alert.alert('Error', 'Failed to cancel booking');
              
              // On error, refresh to get the correct state
              if (currentUser) {
                await fetchBookings(currentUser.id);
              }
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate duration between two dates in hours and minutes
  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'Ongoing';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  // Get payment status text
  const getPaymentStatusText = (booking: Booking) => {
    if (booking.status === 'completed' && booking.paymentStatus === 'paid') {
      return `Paid: KSH ${booking.paymentAmount}`;
    } else if (booking.status === 'pending' || booking.status === 'occupied') {
      return 'Payment pending';
    } else if (booking.status === 'cancelled' || booking.status === 'expired') {
      return 'No charge';
    } else {
      return booking.paymentStatus;
    }
  };

  // Render different status badges
  const renderStatusBadge = (status: Booking['status']) => {
    let badgeStyle, textStyle, statusText;
    
    switch (status) {
      case 'pending':
        badgeStyle = [styles.pendingBadge, isDarkMode ? { backgroundColor: 'rgba(251, 191, 36, 0.2)' } : null];
        textStyle = [styles.pendingBadgeText, { color: isDarkMode ? '#fbbf24' : '#B45309' }];
        statusText = 'Pending';
        break;
      case 'occupied':
        badgeStyle = [styles.activeBadge, isDarkMode ? { backgroundColor: 'rgba(34, 197, 94, 0.2)' } : null];
        textStyle = [styles.activeBadgeText, { color: colors.success }];
        statusText = 'Active';
        break;
      case 'completed':
        badgeStyle = [styles.completedBadge, isDarkMode ? { backgroundColor: 'rgba(2, 132, 199, 0.2)' } : null];
        textStyle = [styles.completedBadgeText, { color: isDarkMode ? '#38bdf8' : '#0284C7' }];
        statusText = 'Completed';
        break;
      case 'cancelled':
        badgeStyle = [styles.cancelledBadge, isDarkMode ? { backgroundColor: 'rgba(220, 38, 38, 0.2)' } : null];
        textStyle = [styles.cancelledBadgeText, { color: colors.error }];
        statusText = 'Cancelled';
        break;
      case 'expired':
        badgeStyle = [styles.expiredBadge, isDarkMode ? { backgroundColor: 'rgba(217, 119, 6, 0.2)' } : null];
        textStyle = [styles.expiredBadgeText, { color: isDarkMode ? '#fb923c' : '#D97706' }];
        statusText = 'Expired';
        break;
      case 'abandoned':
        badgeStyle = [styles.abandonedBadge, isDarkMode ? { backgroundColor: 'rgba(217, 119, 6, 0.2)' } : null];
        textStyle = [styles.abandonedBadgeText, { color: isDarkMode ? '#fb923c' : '#D97706' }];
        statusText = 'Abandoned';
        break;
      default:
        badgeStyle = [styles.defaultBadge, isDarkMode ? { backgroundColor: 'rgba(156, 163, 175, 0.2)' } : null];
        textStyle = [styles.defaultBadgeText, { color: colors.textLight }];
        statusText = status;
    }
    
    return (
      <View style={[styles.statusBadge, ...badgeStyle]}>
        <Text style={[styles.statusText, ...textStyle]}>{statusText}</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading booking history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {error && (
        <View style={[styles.errorContainer, { 
          backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2'
        }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]} 
            onPress={() => currentUser && fetchBookings(currentUser.id)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bookingCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[
              styles.bookingHeader, 
              { 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                borderBottomColor: colors.borderColor
              }
            ]}>
              <Text style={[styles.bookingTitle, { color: colors.text }]}>
                {item.lotName} - Space #{item.spaceNumber || 'N/A'}
              </Text>
              {renderStatusBadge(item.status)}
            </View>
            
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textLight }]}>Start Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(item.startTime)}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textLight }]}>End Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {item.endTime ? formatDate(item.endTime) : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textLight }]}>Duration</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {calculateDuration(item.startTime, item.endTime)}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textLight }]}>Vehicle</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {item.vehicleInfo || 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.paymentContainer}>
                <Text style={[styles.paymentText, { color: colors.text }]}>
                  {getPaymentStatusText(item)}
                </Text>
              </View>
              
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={[
                    styles.cancelButton, 
                    { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEE2E2' }
                  ]}
                  onPress={() => handleCancelBooking(item.id)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bookings Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              You haven't made any parking reservations yet.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // All your existing styles remain unchanged
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
  },
  errorContainer: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: spacing.md,
  },
  retryButton: {
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
    paddingBottom: spacing.lg,
  },
  bookingCard: {
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
    borderBottomWidth: 1,
  },
  bookingTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingBadgeText: {
    color: '#B45309',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  activeBadgeText: {
    color: '#16A34A',
  },
  completedBadge: {
    backgroundColor: '#E0F2FE',
  },
  completedBadgeText: {
    color: '#0284C7',
  },
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
  },
  cancelledBadgeText: {
    color: '#DC2626',
  },
  expiredBadge: {
    backgroundColor: '#FEF3C7',
  },
  expiredBadgeText: {
    color: '#D97706',
  },
  abandonedBadge: {
    backgroundColor: '#FEF3C7',
  },
  abandonedBadgeText: {
    color: '#D97706',
  },
  defaultBadge: {
    backgroundColor: '#F3F4F6',
  },
  defaultBadgeText: {
    color: '#6B7280',
  },
  bookingDetails: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs / 2,
  },
  detailValue: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  paymentContainer: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
  },
  paymentText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
});