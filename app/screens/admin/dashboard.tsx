// app/screens/admin/dashboard.tsx
// Updated to use simpleParkingAPI through the integration layer
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { fetchActiveOrAbandonedBookings, fetchAnalytics } from '../../../src/firebase/admin';
import { getAllParkingLots as fetchParkingLots } from '../../../src/api/parkingService';
import { getCurrentUser } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, ParkingLot, User } from '../../../src/firebase/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { initializeDatabase } from '../../../src/api/initializeDatabase';
import { verifyApiIntegration } from '../../../src/api/verifyApiIntegration';

type AdminTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;
  ParkingManagement: undefined | { screen: string, params?: any };
  Profile: undefined;
};

type AdminDashboardScreenProps = {
  navigation: BottomTabNavigationProp<AdminTabParamList, 'Dashboard'>;
};

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Fetch active or abandoned bookings
      const activeBookings = await fetchActiveOrAbandonedBookings();
      setBookings(activeBookings);
      
      // Fetch parking lots summary using the API service
      console.log('Fetching parking lots for dashboard...');
      const parkingLots = await fetchParkingLots();
      console.log(`Fetched ${parkingLots.length} parking lots for dashboard`);
      setLots(parkingLots);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Function to initialize the database with sample data
  const handleInitializeDatabase = async () => {
    if (loading) return;
    
    Alert.alert(
      'Initialize Database',
      'Are you sure you want to initialize the database with sample data? This should only be done once in development.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              setLoading(true);
              setSuccessMessage(null);
              setError(null);
              
              const success = await initializeDatabase();
              
              if (success) {
                setSuccessMessage('Database initialized successfully');
                // Reload the dashboard data
                await fetchDashboardData();
              } else {
                setError('Failed to initialize database');
              }
            } catch (err) {
              console.error('Error initializing database:', err);
              setError('Error initializing database');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Function to verify API integration
  const handleVerifyApi = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setSuccessMessage(null);
      setError(null);
      
      const success = await verifyApiIntegration();
      
      if (success) {
        setSuccessMessage('API integration test successful!');
      } else {
        setError('API integration test failed. Check console logs for details.');
      }
    } catch (err) {
      console.error('Error testing API integration:', err);
      setError('Error testing API integration');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to parking lots management
  const handleManageLots = () => {
    // Navigate directly to the ParkingManagement tab
    navigation.navigate('ParkingManagement');
  };

  // Calculate dashboard summary
  const calculateSummary = () => {
    const totalSpaces = lots.reduce((sum, lot) => sum + lot.totalSpaces, 0);
    const availableSpaces = lots.reduce((sum, lot) => sum + lot.availableSpaces, 0);
    const occupiedSpaces = lots.reduce((sum, lot) => sum + lot.occupiedSpaces, 0);
    const occupancyRate = totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0;
    const activeBookingsCount = bookings.filter(b => b.status === 'occupied').length;
    const abandonedBookingsCount = bookings.filter(b => b.status === 'expired').length;
    
    return {
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      occupancyRate,
      activeBookingsCount,
      abandonedBookingsCount
    };
  };

  const summary = calculateSummary();

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
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome, {user?.displayName || 'Administrator'}
          </Text>
        </View>
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
            <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {successMessage && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.totalSpaces}</Text>
              <Text style={styles.statLabel}>Total Spaces</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.availableSpaces}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.occupiedSpaces}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.occupancyRate}%</Text>
              <Text style={styles.statLabel}>Occupancy</Text>
            </View>
          </View>
        </View>

        <View style={styles.lotsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parking Lots Status</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleManageLots}
            >
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={lots.slice(0, 3)} // Show only first 3 lots
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.lotCard}>
                <View style={styles.lotInfo}>
                  <Text style={styles.lotName}>{item.name}</Text>
                  <Text style={styles.lotLocation}>{item.location}</Text>
                </View>
                <View style={styles.lotStats}>
                  <Text style={styles.lotStat}>
                    {item.availableSpaces}/{item.totalSpaces} spaces available
                  </Text>
                  <View style={[
                    styles.lotStatusBadge,
                    item.availableSpaces === 0 
                      ? styles.lotFullBadge 
                      : item.availableSpaces < item.totalSpaces / 4 
                        ? styles.lotLimitedBadge 
                        : styles.lotAvailableBadge
                  ]}>
                    <Text style={styles.lotStatusText}>
                      {item.availableSpaces === 0 
                        ? 'FULL' 
                        : item.availableSpaces < item.totalSpaces / 4 
                          ? 'LIMITED' 
                          : 'AVAILABLE'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No parking lots available</Text>
            }
          />
          
          {lots.length > 3 && (
            <TouchableOpacity 
              style={styles.viewMoreButton}
              onPress={handleManageLots}
            >
              <Text style={styles.viewMoreText}>View All {lots.length} Lots</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bookingsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Bookings</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={bookings.filter(b => b.status === 'occupied').slice(0, 5)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingId}>ID: {item.id.substring(0, 8)}...</Text>
                  <Text style={styles.bookingDetails}>
                    Lot: {item.lotName} | Space: {item.spaceNumber}
                  </Text>
                  <Text style={styles.bookingTime}>
                    Started: {new Date(item.startTime).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.bookingStatus}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>ACTIVE</Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No active bookings</Text>
            }
          />
        </View>

        <View style={styles.abandonedContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expired Bookings</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={bookings.filter(b => b.status === 'expired').slice(0, 3)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingId}>ID: {item.id.substring(0, 8)}...</Text>
                  <Text style={styles.bookingDetails}>
                    Lot: {item.lotName} | Space: {item.spaceNumber}
                  </Text>
                  <Text style={styles.bookingTime}>
                    Started: {new Date(item.startTime).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.bookingStatus}>
                  <View style={[styles.statusBadge, styles.abandonedBadge]}>
                    <Text style={styles.abandonedText}>EXPIRED</Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No expired bookings</Text>
            }
          />
        </View>

        <View style={styles.quickActionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleVerifyApi}
            >
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Verify API</Text>
            </TouchableOpacity>
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
  successContainer: {
    padding: spacing.md,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  successText: {
    color: '#10B981',
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
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
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
    color: colors.primary,
    fontWeight: '500',
  },
  lotCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lotInfo: {
    marginBottom: spacing.xs,
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
  lotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  lotStat: {
    fontSize: fontSizes.sm,
    color: colors.text,
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
  },
  viewMoreButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  viewMoreText: {
    color: colors.primary,
    fontWeight: '500',
  },
  bookingsContainer: {
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
  bookingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingDetails: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  bookingTime: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  bookingStatus: {
    marginLeft: spacing.md,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  abandonedBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  abandonedText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: '#D97706',
  },
  abandonedContainer: {
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
  quickActionContainer: {
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
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  actionText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  emptyText: {
    color: colors.textLight,
    textAlign: 'center',
    padding: spacing.md,
  },
});
            