// app/screens/worker/dashboard.tsx - Updated with real-time updates
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchParkingLots, getPendingBookings } from '../../../src/api/parkingAPIIntegration';
import { getCurrentUser } from '../../../src/firebase/auth';
import type { ParkingLot, ParkingSpace, User, Booking } from '../../../src/firebase/types';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { WorkerTabParamList } from '../navigators/workerNavigator';
// Import the real-time updates service
import parkingUpdateService from '../../../src/firebase/realtimeUpdates';
import { useTheme } from '../../context/themeContext';

type WorkerNavigationProp = BottomTabNavigationProp<WorkerTabParamList>;

export default function WorkerDashboardScreen() {
  const navigation = useNavigation<WorkerNavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store unsubscribe functions
  const lotsUnsubscribeRef = useRef<(() => void) | null>(null);
  const bookingsUnsubscribeRef = useRef<(() => void) | null>(null);
  
  // Load data on component mount
  useEffect(() => {
    loadData();

    // Set up lot subscription
    if (lotsUnsubscribeRef.current) {
      lotsUnsubscribeRef.current();
    }
    
    lotsUnsubscribeRef.current = parkingUpdateService.subscribeToAllLots((updatedLots) => {
      console.log('Worker dashboard: Real-time parking lots update received:', updatedLots.length);
      setLots(updatedLots);
    });
    
    // Set up pending bookings subscription
    if (bookingsUnsubscribeRef.current) {
      bookingsUnsubscribeRef.current();
    }
    
    bookingsUnsubscribeRef.current = parkingUpdateService.subscribeToPendingBookings((bookings) => {
      console.log('Worker dashboard: Real-time pending bookings update received:', bookings.length);
      setPendingBookings(bookings);
    });
    
    // Clean up on unmount
    return () => {
      if (lotsUnsubscribeRef.current) {
        lotsUnsubscribeRef.current();
      }
      if (bookingsUnsubscribeRef.current) {
        bookingsUnsubscribeRef.current();
      }
    };
  }, []);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load user data
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Initial fetch of parking lots
      const parkingLots = await fetchParkingLots();
      setLots(parkingLots);
      
      // Initial fetch of pending bookings
      const bookings = await getPendingBookings();
      setPendingBookings(bookings);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate statistics
  const getTotalSpaces = () => {
    return lots.reduce((total, lot) => total + lot.totalSpaces, 0);
  };

  const getOccupiedSpacesCount = () => {
    return lots.reduce((total, lot) => total + lot.occupiedSpaces, 0);
  };

  const getBookedSpacesCount = () => {
    return lots.reduce((total, lot) => total + lot.bookedSpaces, 0);
  };

  const getAvailableSpacesCount = () => {
    return lots.reduce((total, lot) => total + lot.availableSpaces, 0);
  };

  const getOccupancyRate = () => {
    const total = getTotalSpaces();
    if (total === 0) return 0;
    return ((getOccupiedSpacesCount() + getBookedSpacesCount()) / total) * 100;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>Worker Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.displayName || 'Worker'}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
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
            backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2'
          }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}
              onPress={() => navigation.navigate('ManageBookings')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="log-in" size={24} color="#00897B" />
                {pendingBookings.length > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{pendingBookings.length}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Check In</Text>
              <Text style={[styles.actionDescription, { color: colors.textLight }]}>
                Process arrivals and bookings
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}
              onPress={() => navigation.navigate('CompleteBookings')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="log-out" size={24} color="#43A047" />
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{getOccupiedSpacesCount()}</Text>
                </View>
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Check Out</Text>
              <Text style={[styles.actionDescription, { color: colors.textLight }]}>
                Process departures and payments
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}
              onPress={() => navigation.navigate('ManageSpaces')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="car" size={24} color="#0288D1" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Manage Spaces</Text>
              <Text style={[styles.actionDescription, { color: colors.textLight }]}>
                View and update parking spaces
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}
              onPress={() => navigation.navigate('WorkerProfile')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="person" size={24} color="#7B1FA2" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Profile</Text>
              <Text style={[styles.actionDescription, { color: colors.textLight }]}>
                Manage your account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.summaryContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Parking Overview</Text>
          
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{getTotalSpaces()}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Spaces</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {getAvailableSpacesCount()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Available</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {getOccupiedSpacesCount()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Occupied</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {getBookedSpacesCount()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Booked</Text>
            </View>
          </View>
          
          <View style={styles.occupancyContainer}>
            <View style={styles.occupancyHeader}>
              <Text style={[styles.occupancyTitle, { color: colors.text }]}>Occupancy Rate</Text>
              <Text style={[styles.occupancyValue, { color: colors.primary }]}>{getOccupancyRate().toFixed(1)}%</Text>
            </View>
            
            <View style={[styles.occupancyBarContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <View 
                style={[
                  styles.occupancyBar, 
                  { 
                    width: `${getOccupancyRate()}%`,
                    backgroundColor: colors.primary
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <View style={styles.lotsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Parking Lots Status</Text>
          
          {lots.map((lot) => (
            <View key={lot.id} style={[styles.lotCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={styles.lotHeader}>
                <View>
                  <Text style={[styles.lotName, { color: colors.text }]}>{lot.name}</Text>
                  <Text style={[styles.lotLocation, { color: colors.textLight }]}>{lot.location}</Text>
                </View>
                
                <View style={[
                  styles.lotStatusBadge,
                  lot.availableSpaces === 0 
                    ? styles.lotFullBadge 
                    : lot.availableSpaces < lot.totalSpaces / 4 
                      ? styles.lotLimitedBadge 
                      : styles.lotAvailableBadge
                ]}>
                  <Text style={styles.lotStatusText}>
                    {lot.availableSpaces === 0 
                      ? 'FULL' 
                      : lot.availableSpaces < lot.totalSpaces / 4 
                        ? 'LIMITED' 
                        : 'AVAILABLE'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.lotStats}>
                <View style={styles.lotStat}>
                  <Ionicons name="car-outline" size={16} color={colors.textLight} />
                  <Text style={[styles.lotStatText, { color: colors.text }]}>
                    {lot.availableSpaces}/{lot.totalSpaces} Available
                  </Text>
                </View>
                
                <View style={styles.lotStat}>
                  <Ionicons name="car" size={16} color={colors.error} />
                  <Text style={[styles.lotStatText, { color: colors.text }]}>
                    {lot.occupiedSpaces} Occupied
                  </Text>
                </View>
                
                <View style={styles.lotStat}>
                  <Ionicons name="timer-outline" size={16} color={colors.accent} />
                  <Text style={[styles.lotStatText, { color: colors.text }]}>
                    {lot.bookedSpaces} Booked
                  </Text>
                </View>
              </View>
              
              <View style={[styles.lotUtilization, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                <View 
                  style={[
                    styles.utilizationBar,
                    { 
                      width: `${((lot.occupiedSpaces + lot.bookedSpaces) / lot.totalSpaces) * 100}%`,
                      backgroundColor: colors.primary
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
        
        <View style={[styles.pricingContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing Information</Text>
          
          <View style={[styles.pricingCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <View style={[styles.pricingHeader, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <Text style={[styles.pricingTitle, { color: colors.text }]}>Student Rate</Text>
              <View style={[styles.pricingBadge, { backgroundColor: '#E0F2F1' }]}>
                <Text style={[styles.pricingBadgeText, { color: '#00897B' }]}>FIXED</Text>
              </View>
            </View>
            
            <View style={styles.pricingContent}>
              <Text style={[styles.pricingAmount, { color: colors.text }]}>KSH 200</Text>
              <Text style={[styles.pricingDescription, { color: colors.textLight }]}>
                Fixed daily rate for students with valid student email
              </Text>
            </View>
          </View>
          
          <View style={[styles.pricingCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <View style={[styles.pricingHeader, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <Text style={[styles.pricingTitle, { color: colors.text }]}>Guest Rate</Text>
              <View style={[styles.pricingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.pricingBadgeText, { color: '#D97706' }]}>HOURLY</Text>
              </View>
            </View>
            
            <View style={styles.pricingContent}>
              <Text style={[styles.pricingAmount, { color: colors.text }]}>KSH 50 <Text style={[styles.pricingUnit, { color: colors.textLight }]}>/hour</Text></Text>
              <Text style={[styles.pricingDescription, { color: colors.textLight }]}>
                Hourly rate for guests (first 30 minutes are free)
              </Text>
            </View>
          </View>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
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
  quickActionsContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  actionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: fontSizes.sm,
  },
  summaryContainer: {
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.sm,
  },
  occupancyContainer: {
    borderRadius: 8,
    padding: spacing.md,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  occupancyTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  occupancyValue: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  occupancyBarContainer: {
    height: 8,
    borderRadius: 4,
  },
  occupancyBar: {
    height: '100%',
    borderRadius: 4,
  },
  lotsContainer: {
    marginBottom: spacing.md,
  },
  lotCard: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lotName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  lotLocation: {
    fontSize: fontSizes.sm,
  },
  lotStatusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  lotAvailableBadge: {
    backgroundColor: '#DCFCE7',
  },
  lotLimitedBadge: {
    backgroundColor: '#FEF3C7',
  },
  lotFullBadge: {
    backgroundColor: '#FEE2E2',
  },
  lotStatusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.text,
  },
  lotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  lotStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotStatText: {
    fontSize: fontSizes.sm,
    marginLeft: spacing.xs,
  },
  lotUtilization: {
    height: 6,
    borderRadius: 3,
  },
  utilizationBar: {
    height: '100%',
    borderRadius: 3,
  },
  pricingContainer: {
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pricingCard: {
    borderRadius: 8,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  pricingTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  pricingBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  pricingBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  pricingContent: {
    padding: spacing.md,
  },
  pricingAmount: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  pricingUnit: {
    fontSize: fontSizes.md,
    fontWeight: 'normal',
  },
  pricingDescription: {
    fontSize: fontSizes.sm,
  }
});

