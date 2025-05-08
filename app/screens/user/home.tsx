// app/screens/user/home.tsx
import React, { useEffect, useState } from 'react';
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
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../../src/firebase/types';
import type { ParkingLot } from '../../../src/firebase/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

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
  const [user, setUser] = useState<User | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserAndLots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Get parking lots
      const lots = await fetchParkingLots();
      setParkingLots(lots);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading parking lots...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </Text>
          <View style={[
            styles.roleBadge,
            user?.role === 'student' ? styles.studentBadge : styles.guestBadge
          ]}>
            <Text style={styles.roleText}>
              {user?.role === 'student' ? 'Student' : 'Guest'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Available Parking Lots</Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
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
                style={styles.lotCard}
                onPress={() => handleLotPress(item.id)}
              >
                <View style={styles.lotDetails}>
                  <Text style={styles.lotName}>{item.name}</Text>
                  <Text style={styles.lotLocation}>{item.location}</Text>
                  
                  <View style={styles.lotStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{item.availableSpaces}</Text>
                      <Text style={styles.statLabel}>Available</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{item.totalSpaces}</Text>
                      <Text style={styles.statLabel}>Total</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{item.occupiedSpaces}</Text>
                      <Text style={styles.statLabel}>Occupied</Text>
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
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No parking lots available</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  header: {
    backgroundColor: colors.primary,
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
    color: colors.text,
    marginBottom: spacing.md,
  },
  lotCard: {
    backgroundColor: colors.cardBackground,
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  lotLocation: {
    fontSize: fontSizes.md,
    color: colors.textLight,
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
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  bookButton: {
    padding: spacing.sm,
  },
  errorContainer: {
    padding: spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
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
    color: colors.textLight,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
});