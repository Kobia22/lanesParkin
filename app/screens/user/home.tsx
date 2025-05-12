// app/screens/user/home.tsx - Improved UI and space count accuracy

import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  StatusBar
} from 'react-native';
import { fetchParkingLots } from '../../../src/firebase/database';
import { getCurrentUser } from '../../../src/firebase/auth';
import { spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../../src/firebase/types';
import type { ParkingLot } from '../../../src/firebase/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/themeContext';
import parkingUpdateService from '../../../src/firebase/realtimeUpdates';

type UserStackParamList = {
  Home: undefined;
  Booking: { lotId?: string; spaceId?: string };
  History: undefined;
  Profile: undefined;
};

type HomeScreenProps = {
  navigation: BottomTabNavigationProp<UserStackParamList, 'Home'>;
};

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadUserAndLots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Initial load of parking lots
      const lots = await fetchParkingLots();
      setParkingLots(lots);
      
      // Subscribe to real-time updates for all lots
      // Clean up any existing subscription first
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      unsubscribeRef.current = parkingUpdateService.subscribeToAllLots((updatedLots) => {
        console.log('Real-time parking lots update received:', updatedLots.length);
        setParkingLots(updatedLots);
      });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Unable to load parking lots. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserAndLots();
    
    // Clean up subscription when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserAndLots();
  };

  const handleLotPress = (lotId: string) => {
    navigation.navigate('Booking', { lotId });
  };

  const getOccupancyPercentage = (lot: ParkingLot) => {
    if (lot.totalSpaces === 0) return 0;
    const occupiedSpaces = lot.occupiedSpaces + lot.bookedSpaces;
    return (occupiedSpaces / lot.totalSpaces) * 100;
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return colors.error;
    if (percentage >= 70) return colors.accent;
    return colors.success;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading parking lots...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={colors.primary}
      />
      
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </Text>
          <View style={[
            styles.roleBadge,
            user?.role === 'student' ? 
              (isDarkMode ? { backgroundColor: 'rgba(8, 145, 178, 0.5)' } : styles.studentBadge) : 
              (isDarkMode ? { backgroundColor: 'rgba(139, 92, 246, 0.5)' } : styles.guestBadge)
          ]}>
            <Text style={styles.roleText}>
              {user?.role === 'student' ? 'Student' : 'Guest'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="refresh" color="#FFFFFF" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Available Parking Lots</Text>
        
        {error ? (
          <View style={[styles.errorContainer, { 
            backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2'
          }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary }]} 
              onPress={loadUserAndLots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={parkingLots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const occupancyPercentage = getOccupancyPercentage(item);
              const occupancyColor = getOccupancyColor(occupancyPercentage);
              
              return (
                <TouchableOpacity 
                  style={[
                    styles.lotCard, 
                    { 
                      backgroundColor: colors.cardBackground,
                      borderLeftColor: occupancyColor,
                      borderLeftWidth: 4
                    }
                  ]}
                  onPress={() => handleLotPress(item.id)}
                  disabled={item.availableSpaces === 0}
                >
                  <View style={styles.lotDetails}>
                    <View style={styles.lotHeader}>
                      <Text style={[styles.lotName, { color: colors.text }]}>{item.name}</Text>
                      
                      {item.availableSpaces === 0 ? (
                        <View style={[
                          styles.fullBadge, 
                          { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2' }
                        ]}>
                          <Text style={[styles.fullBadgeText, { color: colors.error }]}>Full</Text>
                        </View>
                      ) : (
                        <View style={[
                          styles.availableBadge, 
                          { backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }
                        ]}>
                          <Text style={[styles.availableBadgeText, { color: colors.success }]}>
                            {item.availableSpaces} Available
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.lotLocation, { color: colors.textLight }]}>
                      <Ionicons name="location-outline" size={14} color={colors.textLight} /> {item.location}
                    </Text>
                    
                    <View style={styles.occupancyContainer}>
                      <View style={[
                        styles.occupancyBar, 
                        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6' }
                      ]}>
                        <View 
                          style={[
                            styles.occupancyFill, 
                            { 
                              backgroundColor: occupancyColor,
                              width: `${occupancyPercentage}%`
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.occupancyText, { color: colors.textLight }]}>
                        {Math.round(occupancyPercentage)}% Occupied
                      </Text>
                    </View>
                    
                    <View style={styles.lotStats}>
                      <View style={[
                        styles.statItem, 
                        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB' }
                      ]}>
                        <Ionicons 
                          name="checkmark-circle-outline" 
                          size={20} 
                          color={colors.success} 
                          style={styles.statIcon}
                        />
                        <Text style={[styles.statValue, { color: colors.text }]}>{item.availableSpaces}</Text>
                        <Text style={[styles.statLabel, { color: colors.textLight }]}>Available</Text>
                      </View>
                      
                      <View style={[
                        styles.statItem, 
                        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB' }
                      ]}>
                        <Ionicons 
                          name="close-circle-outline" 
                          size={20} 
                          color={colors.error} 
                          style={styles.statIcon}
                        />
                        <Text style={[styles.statValue, { color: colors.text }]}>{item.occupiedSpaces}</Text>
                        <Text style={[styles.statLabel, { color: colors.textLight }]}>Occupied</Text>
                      </View>
                      
                      <View style={[
                        styles.statItem, 
                        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB' }
                      ]}>
                        <Ionicons 
                          name="time-outline" 
                          size={20} 
                          color={colors.accent} 
                          style={styles.statIcon}
                        />
                        <Text style={[styles.statValue, { color: colors.text }]}>{item.bookedSpaces}</Text>
                        <Text style={[styles.statLabel, { color: colors.textLight }]}>Booked</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.bookButton,
                    item.availableSpaces === 0 ? 
                      { backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.2)' : '#E5E7EB' } : 
                      { backgroundColor: colors.primary }
                  ]}>
                    <Ionicons 
                      name="arrow-forward" 
                      size={24} 
                      color={
                        item.availableSpaces === 0 ? 
                          (isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#9CA3AF') : 
                          '#FFFFFF'
                      } 
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
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
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No parking lots available</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  roleBadge: {
    borderRadius: 20,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  studentBadge: {
    backgroundColor: '#0891b2',
  },
  guestBadge: {
    backgroundColor: '#8b5cf6',
  },
  roleText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: fontSizes.sm,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  lotCard: {
    borderRadius: 12,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  lotDetails: {
    flex: 1,
    padding: spacing.md,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lotName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  fullBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fullBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  availableBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  availableBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  lotLocation: {
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
  },
  occupancyContainer: {
    marginBottom: spacing.sm,
  },
  occupancyBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
    borderRadius: 4,
  },
  occupancyText: {
    fontSize: fontSizes.xs,
    textAlign: 'right',
  },
  lotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  statItem: {
    flex: 1,
    borderRadius: 8,
    padding: spacing.sm,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSizes.xs,
  },
  bookButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: spacing.md,
  },
  errorContainer: {
    padding: spacing.lg,
    borderRadius: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
