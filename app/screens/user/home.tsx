// app/screens/user/home.tsx - Updated with real-time updates
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
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

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store unsubscribe function
  const unsubscribeRef = useRef<() => void | null>(null);

const loadUserAndLots = async () => {
  try {
    setLoading(true);
    setError(null);

    // Get current user
    const currentUser = await getCurrentUser();
    setUser(currentUser);  // Changed from setCurrentUser to setUser

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
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.lotCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleLotPress(item.id)}
              >
                <View style={styles.lotDetails}>
                  <Text style={[styles.lotName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.lotLocation, { color: colors.textLight }]}>{item.location}</Text>
                  
                  <View style={styles.lotStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{item.availableSpaces}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Available</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{item.totalSpaces}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Total</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{item.occupiedSpaces}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Occupied</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.bookButton}>
                  <Ionicons name="arrow-forward" size={24} color={colors.primary} />
                </View>
              </TouchableOpacity>
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
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No parking lots available</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  // Styles unchanged from original
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  lotCard: {
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lotDetails: {
    flex: 1,
  },
  lotName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  lotLocation: {
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
  },
  lotStats: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  statItem: {
    marginRight: spacing.lg,
  },
  statValue: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSizes.sm,
  },
  bookButton: {
    padding: spacing.sm,
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
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
});