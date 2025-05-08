// app/screens/worker/dashboard.tsx
import React, { useState, useEffect } from 'react';
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
import { fetchParkingLots, getOccupiedSpaces } from '../../../src/firebase/database';
import { getCurrentUser } from '../../../src/firebase/auth';
import type { ParkingLot, ParkingSpace, User } from '../../../src/firebase/types';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { WorkerTabParamList } from '../navigators/workerNavigator';

type WorkerNavigationProp = BottomTabNavigationProp<WorkerTabParamList>;

export default function WorkerDashboardScreen() {
  const navigation = useNavigation<WorkerNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [occupiedSpaces, setOccupiedSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock data for the demonstration
  const mockParkingLots: ParkingLot[] = [
    {
      id: 'lot1',
      name: 'Lot A',
      location: 'North Wing',
      totalSpaces: 50,
      availableSpaces: 30,
      occupiedSpaces: 15,
      bookedSpaces: 5
    },
    {
      id: 'lot2',
      name: 'Lot B',
      location: 'South Wing',
      totalSpaces: 40,
      availableSpaces: 25,
      occupiedSpaces: 10,
      bookedSpaces: 5
    },
    {
      id: 'lot3',
      name: 'Lot C',
      location: 'East Wing',
      totalSpaces: 30,
      availableSpaces: 20,
      occupiedSpaces: 6,
      bookedSpaces: 4
    }
  ];

  // Pending bookings count (would come from database in real app)
  const pendingBookingsCount = 3;
  
  // Active bookings count (would come from database in real app)
  const activeBookingsCount = 25;

  // Load data on component mount
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load user data
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // In a real app, these would come from the database
      // Fetch parking lots
      // const parkingLots = await fetchParkingLots();
      setLots(mockParkingLots);
      
      // For demonstration purposes, we'll use mock data
      // In a real app, we'd call getOccupiedSpaces()
      setOccupiedSpaces([]);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageBookings')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="log-in" size={24} color="#00897B" />
                {pendingBookingsCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{pendingBookingsCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionTitle}>Check In</Text>
              <Text style={styles.actionDescription}>
                Process arrivals and bookings
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('CompleteBookings')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="log-out" size={24} color="#43A047" />
                {activeBookingsCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{activeBookingsCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionTitle}>Check Out</Text>
              <Text style={styles.actionDescription}>
                Process departures and payments
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageSpaces')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="car" size={24} color="#0288D1" />
              </View>
              <Text style={styles.actionTitle}>Manage Spaces</Text>
              <Text style={styles.actionDescription}>
                View and update parking spaces
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('WorkerProfile')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="person" size={24} color="#7B1FA2" />
              </View>
              <Text style={styles.actionTitle}>Profile</Text>
              <Text style={styles.actionDescription}>
                Manage your account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Parking Overview</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getTotalSpaces()}</Text>
              <Text style={styles.statLabel}>Total Spaces</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {getAvailableSpacesCount()}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {getOccupiedSpacesCount()}
              </Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {getBookedSpacesCount()}
              </Text>
              <Text style={styles.statLabel}>Booked</Text>
            </View>
          </View>
          
          <View style={styles.occupancyContainer}>
            <View style={styles.occupancyHeader}>
              <Text style={styles.occupancyTitle}>Occupancy Rate</Text>
              <Text style={styles.occupancyValue}>{getOccupancyRate().toFixed(1)}%</Text>
            </View>
            
            <View style={styles.occupancyBarContainer}>
              <View 
                style={[
                  styles.occupancyBar, 
                  { width: `${getOccupancyRate()}%` }
                ]}
              />
            </View>
          </View>
        </View>
        
        <View style={styles.lotsContainer}>
          <Text style={styles.sectionTitle}>Parking Lots Status</Text>
          
          {lots.map((lot) => (
            <View key={lot.id} style={styles.lotCard}>
              <View style={styles.lotHeader}>
                <View>
                  <Text style={styles.lotName}>{lot.name}</Text>
                  <Text style={styles.lotLocation}>{lot.location}</Text>
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
                  <Text style={styles.lotStatText}>
                    {lot.availableSpaces}/{lot.totalSpaces} Available
                  </Text>
                </View>
                
                <View style={styles.lotStat}>
                  <Ionicons name="car" size={16} color={colors.error} />
                  <Text style={styles.lotStatText}>
                    {lot.occupiedSpaces} Occupied
                  </Text>
                </View>
                
                <View style={styles.lotStat}>
                  <Ionicons name="timer-outline" size={16} color={colors.accent} />
                  <Text style={styles.lotStatText}>
                    {lot.bookedSpaces} Booked
                  </Text>
                </View>
              </View>
              
              <View style={styles.lotUtilization}>
                <View 
                  style={[
                    styles.utilizationBar,
                    { width: `${((lot.occupiedSpaces + lot.bookedSpaces) / lot.totalSpaces) * 100}%` }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.pricingContainer}>
          <Text style={styles.sectionTitle}>Pricing Information</Text>
          
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Student Rate</Text>
              <View style={[styles.pricingBadge, { backgroundColor: '#E0F2F1' }]}>
                <Text style={[styles.pricingBadgeText, { color: '#00897B' }]}>FIXED</Text>
              </View>
            </View>
            
            <View style={styles.pricingContent}>
              <Text style={styles.pricingAmount}>KSH 200</Text>
              <Text style={styles.pricingDescription}>
                Fixed daily rate for students with valid student email
              </Text>
            </View>
          </View>
          
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Guest Rate</Text>
              <View style={[styles.pricingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.pricingBadgeText, { color: '#D97706' }]}>HOURLY</Text>
              </View>
            </View>
            
            <View style={styles.pricingContent}>
              <Text style={styles.pricingAmount}>KSH 50 <Text style={styles.pricingUnit}>/hour</Text></Text>
              <Text style={styles.pricingDescription}>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: spacing.md,
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
  quickActionsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  summaryContainer: {
    backgroundColor: colors.cardBackground,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  occupancyContainer: {
    backgroundColor: '#FFFFFF',
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
    color: colors.text,
  },
  occupancyValue: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
  occupancyBarContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  occupancyBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  lotsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    color: colors.text,
  },
  lotLocation: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
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
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
  lotUtilization: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  utilizationBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  pricingContainer: {
    backgroundColor: colors.cardBackground,
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
  },
  pricingTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
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
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pricingUnit: {
    fontSize: fontSizes.md,
    fontWeight: 'normal',
    color: colors.textLight,
  },
  pricingDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  }
});