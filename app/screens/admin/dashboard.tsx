// app/screens/admin/dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { 
  fetchParkingLots,
  fetchAnalytics,
  fetchActiveOrAbandonedBookings,
  fetchRecentBookings
} from '../../../src/api/parkingAPIIntegration';
import type { 
  ParkingLot, 
  Booking, 
  Analytics,
} from '../../../src/firebase/types';
import { useTheme } from '../../context/themeContext';
import { useNavigation } from '@react-navigation/native';
import parkingUpdateService from '../../../src/firebase/realtimeUpdates';

export default function AdminDashboardScreen() {
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store unsubscribe function
  const lotsUnsubscribeRef = useRef<(() => void) | null>(null);
  
  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();

    // Set up lot subscription
    if (lotsUnsubscribeRef.current) {
      lotsUnsubscribeRef.current();
    }
    
    lotsUnsubscribeRef.current = parkingUpdateService.subscribeToAllLots((updatedLots) => {
      console.log('Admin dashboard: Real-time parking lots update received:', updatedLots.length);
      setParkingLots(updatedLots);
      
      // Since lots changed, update bookings and analytics too
      fetchBookingsAndAnalytics();
    });
    
    // Set up interval for periodic data refresh (every 60 seconds)
    const intervalId = setInterval(() => {
      fetchBookingsAndAnalytics();
    }, 60000);
    
    // Clean up on unmount
    return () => {
      if (lotsUnsubscribeRef.current) {
        lotsUnsubscribeRef.current();
      }
      clearInterval(intervalId);
    };
  }, []);

  // Full data fetch
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch parking lots
      const lots = await fetchParkingLots();
      setParkingLots(lots);
      
      await fetchBookingsAndAnalytics();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Partial refresh for bookings and analytics
  const fetchBookingsAndAnalytics = async () => {
    try {
      // Fetch analytics first as it's smallest/fastest
      const analytics = await fetchAnalytics();
      setAnalytics(analytics);
      
      // Fetch active bookings (those that need attention)
      const active = await fetchActiveOrAbandonedBookings();
      setActiveBookings(active);
      
      // Fetch recent booking history
      const recent = await fetchRecentBookings(5);
      setRecentBookings(recent);
    } catch (err) {
      console.error('Error updating bookings and analytics:', err);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Calculate total occupancy across all lots
  const calculateTotalOccupancy = () => {
    const totalSpaces = parkingLots.reduce((total, lot) => total + lot.totalSpaces, 0);
    const occupiedSpaces = parkingLots.reduce(
      (total, lot) => total + lot.occupiedSpaces + lot.bookedSpaces, 
      0
    );
    
    if (totalSpaces === 0) return '0%';
    return `${Math.round((occupiedSpaces / totalSpaces) * 100)}%`;
  };

  // Format currency as KSH
  const formatCurrency = (amount: number) => {
    return `KSH ${amount.toLocaleString()}`;
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

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Parking System Overview</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {error && (
          <View style={[styles.errorContainer, { 
            backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2',
            margin: spacing.md
          }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary }]} 
              onPress={fetchDashboardData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analytics Cards */}
        <View style={styles.analyticsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
          
          <View style={styles.cardsGrid}>
            <View style={[styles.analyticsCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="cash-outline" size={24} color={colors.success} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textLight }]}>Daily Revenue</Text>
              <Text style={[styles.cardValue, { color: colors.success }]}>
                {analytics ? formatCurrency(analytics.dailyRevenue) : 'N/A'}
              </Text>
            </View>
            
            <View style={[styles.analyticsCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textLight }]}>Weekly Revenue</Text>
              <Text style={[styles.cardValue, { color: colors.primary }]}>
                {analytics ? formatCurrency(analytics.weeklyRevenue) : 'N/A'}
              </Text>
            </View>
            
            <View style={[styles.analyticsCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: `${colors.accent}20` }]}>
                <Ionicons name="car-outline" size={24} color={colors.accent} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textLight }]}>Occupancy Rate</Text>
              <Text style={[styles.cardValue, { color: colors.accent }]}>
                {analytics ? `${analytics.occupancyRate.toFixed(1)}%` : calculateTotalOccupancy()}
              </Text>
            </View>
            
            <View style={[styles.analyticsCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: `${colors.error}20` }]}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textLight }]}>Abandoned</Text>
              <Text style={[styles.cardValue, { color: colors.error }]}>
                {analytics ? analytics.abandonedCount : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Parking Lots Status */}
        <View style={styles.lotsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Parking Lots</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('ParkingManagement')}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {parkingLots.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No parking lots available</Text>
            </View>
          ) : (
            <FlatList
              data={parkingLots}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.lotCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
                  <Text style={[styles.lotName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.lotLocation, { color: colors.textLight }]}>{item.location}</Text>
                  
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar,
                        { 
                          width: `${((item.occupiedSpaces + item.bookedSpaces) / item.totalSpaces) * 100}%`,
                          backgroundColor: item.availableSpaces === 0 ? colors.error : colors.primary 
                        }
                      ]}
                    />
                  </View>
                  
                  <View style={styles.lotStatsRow}>
                    <View style={styles.lotStat}>
                      <Text style={[styles.statNumber, { color: colors.success }]}>{item.availableSpaces}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Available</Text>
                    </View>
                    <View style={styles.lotStat}>
                      <Text style={[styles.statNumber, { color: colors.error }]}>{item.occupiedSpaces}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Occupied</Text>
                    </View>
                    <View style={styles.lotStat}>
                      <Text style={[styles.statNumber, { color: colors.accent }]}>{item.bookedSpaces}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Booked</Text>
                    </View>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.lotsList}
            />
          )}
        </View>
        
        {/* Active Bookings Section */}
        <View style={styles.bookingsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Bookings</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {activeBookings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No active bookings</Text>
            </View>
          ) : (
            activeBookings.slice(0, 3).map((booking) => (
              <View 
                key={booking.id} 
                style={[styles.bookingCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}
              >
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={[styles.bookingId, { color: colors.textLight }]}>ID: {booking.id.substring(0, 8)}...</Text>
                    <Text style={[styles.bookingLot, { color: colors.text }]}>
                      {booking.lotName} - Space #{booking.spaceNumber}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { 
                      backgroundColor: booking.status === 'occupied' ? 
                        `${colors.success}20` : 
                        `${colors.accent}20` 
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { 
                        color: booking.status === 'occupied' ? 
                          colors.success : 
                          colors.accent 
                      }
                    ]}>
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.bookingDetails}>
                  <View style={styles.bookingDetail}>
                    <Ionicons name="person-outline" size={16} color={colors.textLight} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{booking.userEmail}</Text>
                  </View>
                  
                  <View style={styles.bookingDetail}>
                    <Ionicons name="car-outline" size={16} color={colors.textLight} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{booking.vehicleInfo || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.bookingDetail}>
                    <Ionicons name="time-outline" size={16} color={colors.textLight} />
                    <Text style={[styles.detailText, { color: colors.text }]}>Started: {formatDate(booking.startTime)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
          
          {activeBookings.length > 3 && (
            <TouchableOpacity style={[styles.moreButton, { borderColor: colors.borderColor }]}>
              <Text style={[styles.moreButtonText, { color: colors.primary }]}>
                View {activeBookings.length - 3} more active bookings
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Recent Bookings Section */}
        <View style={[styles.bookingsSection, { paddingBottom: spacing.xl }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Bookings</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentBookings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No recent bookings</Text>
            </View>
          ) : (
            <View style={[styles.recentBookingsCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.borderColor }]}>
                <Text style={[styles.tableHeaderText, { color: colors.textLight, flex: 1.5 }]}>User</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textLight, flex: 1 }]}>Space</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textLight, flex: 1 }]}>Status</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textLight, flex: 1.5 }]}>Time</Text>
              </View>
              
              {recentBookings.map((booking) => (
                <View 
                  key={booking.id}
                  style={[styles.tableRow, { borderBottomColor: colors.borderColor }]}
                >
                  <Text 
                    style={[styles.tableCell, { color: colors.text, flex: 1.5 }]} 
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {booking.userEmail.split('@')[0]}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>
                    #{booking.spaceNumber}
                  </Text>
                  <Text 
                    style={[
                      styles.tableCell, 
                      { flex: 1 },
                      { 
                        color: 
                          booking.status === 'completed' ? colors.success :
                          booking.status === 'cancelled' || booking.status === 'expired' ? colors.error :
                          colors.accent
                      }
                    ]}
                  >
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1.5 }]}>
                    {formatDate(booking.startTime)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
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
  subtitle: {
    fontSize: fontSizes.md,
    color: '#FFFFFF',
    opacity: 0.9,
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
  analyticsContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  lotsSection: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllButton: {
    padding: spacing.xs,
  },
  viewAllText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  lotsList: {
    paddingBottom: spacing.xs,
  },
  lotCard: {
    borderRadius: 10,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lotName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  lotLocation: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  lotStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lotStat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSizes.xs,
  },
  bookingsSection: {
    padding: spacing.md,
  },
  emptyState: {
    padding: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSizes.md,
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
    borderBottomColor: '#F3F4F6',
  },
  bookingId: {
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs / 2,
  },
  bookingLot: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  bookingDetails: {
    padding: spacing.md,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: fontSizes.sm,
    marginLeft: spacing.sm,
  },
  moreButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  moreButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  recentBookingsCard: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: fontSizes.sm,
    paddingVertical: spacing.xs,
  },
});