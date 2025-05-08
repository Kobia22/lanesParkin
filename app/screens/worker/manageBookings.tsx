// app/screens/worker/manageBookings.tsx
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
} from 'react-native';
import { 
  getPendingBookings, 
  markBookingAsOccupied, 
  completeBooking 
} from '../../../src/firebase/database';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '../../../src/firebase/types';

export default function ManageBookingsScreen() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);

  // Load pending bookings
  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const bookings = await getPendingBookings();
      setPendingBookings(bookings);
    } catch (err) {
      console.error('Error fetching pending bookings:', err);
      setError('Failed to load pending bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    
    // Set up polling to refresh bookings every 30 seconds
    const pollInterval = setInterval(() => {
      loadBookings();
    }, 30000);
    
    return () => clearInterval(pollInterval);
  }, [loadBookings]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Mark a booking as occupied (vehicle has arrived)
  const handleMarkAsOccupied = (booking: Booking) => {
    // First check if the booking is still valid (not expired)
    const expiryTime = new Date(booking.expiryTime).getTime();
    const now = Date.now();
    
    if (now > expiryTime) {
      Alert.alert(
        'Booking Expired',
        'This booking has already expired. The space has been released for other bookings.',
        [{ text: 'OK' }]
      );
      loadBookings(); // Refresh to update UI
      return;
    }
    
    Alert.alert(
      'Confirm Arrival',
      `Are you sure the vehicle for booking #${booking.id.substring(0, 8)} has arrived at Space #${booking.spaceNumber}?`,
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
              await markBookingAsOccupied(booking.id);
              
              // Update local state
              setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
              
              Alert.alert('Success', 'Booking has been marked as occupied');
            } catch (err) {
              console.error('Error marking booking as occupied:', err);
              Alert.alert('Error', 'Failed to update booking status');
            } finally {
              setProcessingBooking(null);
              loadBookings(); // Refresh all bookings
            }
          }
        }
      ]
    );
  };

  // Calculate time remaining until expiry
  const getTimeRemaining = (expiryTimeStr: string) => {
    const expiryTime = new Date(expiryTimeStr).getTime();
    const now = Date.now();
    const timeRemaining = expiryTime - now;
    
    if (timeRemaining <= 0) {
      return 'Expired';
    }
    
    // Convert to minutes and seconds
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  // Render booking card with expiry countdown
  const renderBookingCard = ({ item }: { item: Booking }) => {
    const timeRemaining = getTimeRemaining(item.expiryTime);
    const isExpiring = timeRemaining !== 'Expired' && 
      new Date(item.expiryTime).getTime() - Date.now() < 2 * 60 * 1000; // Less than 2 minutes
    
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.bookingIdText}>ID: {item.id.substring(0, 8)}...</Text>
            <Text style={styles.spaceInfoText}>{item.lotName} - Space #{item.spaceNumber}</Text>
          </View>
          
          <View style={[
            styles.expiryBadge,
            timeRemaining === 'Expired' 
              ? styles.expiredBadge 
              : isExpiring 
                ? styles.expiringBadge 
                : styles.validBadge
          ]}>
            <Text style={styles.expiryText}>
              {timeRemaining === 'Expired' ? 'EXPIRED' : timeRemaining}
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
          
          <View style={styles.userInfoContainer}>
            <Ionicons name="time" size={18} color={colors.textLight} style={styles.infoIcon} />
            <Text style={styles.userInfoText}>
              Booked at: {new Date(item.startTime).toLocaleTimeString()}
            </Text>
          </View>
          
          <View style={styles.bookingActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.confirmButton,
                timeRemaining === 'Expired' && styles.disabledButton
              ]}
              onPress={() => handleMarkAsOccupied(item)}
              disabled={timeRemaining === 'Expired' || processingBooking === item.id}
            >
              {processingBooking === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={styles.actionIcon} />
                  <Text style={styles.actionButtonText}>Confirm Arrival</Text>
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
        <Text style={styles.title}>Pending Bookings</Text>
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
        data={pendingBookings}
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
                Loading pending bookings...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Pending Bookings</Text>
              <Text style={styles.emptyText}>
                There are currently no pending bookings that require check-in.
              </Text>
            </View>
          )
        }
        contentContainerStyle={
          pendingBookings.length === 0 ? { flex: 1 } : styles.listContent
        }
      />

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Worker Instructions:</Text>
        <Text style={styles.infoText}>
          1. When a vehicle arrives, confirm their booking by tapping "Confirm Arrival"
        </Text>
        <Text style={styles.infoText}>
          2. Bookings automatically expire after 5 minutes if not confirmed
        </Text>
        <Text style={styles.infoText}>
          3. Pull down to refresh the list of pending bookings
        </Text>
        <Text style={styles.noteText}>
          Note: Bookings highlighted in yellow are about to expire
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
  expiryBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  validBadge: {
    backgroundColor: '#DCFCE7',
  },
  expiringBadge: {
    backgroundColor: '#FEF3C7',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
  },
  expiryText: {
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
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: colors.success,
  },
  disabledButton: {
    backgroundColor: colors.textLight,
    opacity: 0.5,
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
  },
  noteText: {
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
    color: colors.accent,
    marginTop: spacing.sm,
  }
});