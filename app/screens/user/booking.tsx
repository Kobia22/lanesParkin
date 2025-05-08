// app/screens/user/booking.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  getParkingLot,
  fetchParkingSpaces,
  createBooking,
  fetchParkingLots,
} from '../../../src/firebase/database';
import { getCurrentUser } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import type { ParkingLot, ParkingSpace, User } from '../../../src/firebase/types';

type UserStackParamList = {
  Home: undefined;
  Booking: { lotId?: string; spaceId?: string };
  History: undefined;
  Profile: undefined;
};

type BookingScreenProps = {
  navigation: BottomTabNavigationProp<UserStackParamList, 'Booking'>;
  route: RouteProp<UserStackParamList, 'Booking'>;
};

export default function BookingScreen({ navigation, route }: BookingScreenProps) {
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [vehicleReg, setVehicleReg] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load user, parking lots, and any lot passed in route params
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // Fetch all parking lots
        const lots = await fetchParkingLots();
        setParkingLots(lots);
        
        if (route.params?.lotId) {
          const lot = await getParkingLot(route.params.lotId);
          if (lot) {
            setSelectedLot(lot);
            // Also load spaces for this lot
            const spaces = await fetchParkingSpaces(lot.id);
            setParkingSpaces(spaces);
          }
        }
      } catch (err) {
        console.error('Error fetching initial lot data:', err);
        setError('Failed to load parking lot data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [route.params?.lotId]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const lots = await fetchParkingLots();
      setParkingLots(lots);
      
      if (selectedLot) {
        const updatedLot = await getParkingLot(selectedLot.id);
        if (updatedLot) {
          setSelectedLot(updatedLot);
          const spaces = await fetchParkingSpaces(updatedLot.id);
          setParkingSpaces(spaces);
        }
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Function to load spaces for a selected lot
  const handleLotSelect = async (lot: ParkingLot) => {
    try {
      setLoading(true);
      setSelectedLot(lot);
      setSelectedSpace(null);
      
      const spaces = await fetchParkingSpaces(lot.id);
      setParkingSpaces(spaces);
    } catch (err) {
      console.error('Error fetching spaces:', err);
      setError('Failed to load parking spaces');
    } finally {
      setLoading(false);
    }
  };

  // Handle booking creation
  const handleCreateBooking = async () => {
    if (!selectedLot || !selectedSpace) {
      Alert.alert('Error', 'Please select a parking space');
      return;
    }

    if (!vehicleReg.trim()) {
      Alert.alert('Error', 'Please enter your vehicle registration number');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'You need to be logged in to book a parking space');
      return;
    }

    try {
      setBookingLoading(true);
      setError(null);

      // Create a new booking
      const startTime = new Date().toISOString();
      // Default end time is 8 hours from now
      const endTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString();

      await createBooking({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        lotId: selectedLot.id,
        lotName: selectedLot.name,
        spaceId: selectedSpace.id,
        spaceNumber: selectedSpace.number,
        startTime,
        endTime,
        vehicleInfo: vehicleReg,
      });

      Alert.alert(
        'Booking Confirmed!',
        `Your parking space #${selectedSpace.number} has been booked successfully. You have 5 minutes to arrive at the space before the booking expires.`,
        [
          { 
            text: 'View My Bookings', 
            onPress: () => navigation.navigate('History') 
          },
          { 
            text: 'OK',
            style: 'cancel'
          }
        ]
      );

      // Reset state
      setSelectedSpace(null);
      setVehicleReg('');
      
      // Reload spaces to update availability
      if (selectedLot) {
        const updatedSpaces = await fetchParkingSpaces(selectedLot.id);
        setParkingSpaces(updatedSpaces);
        
        // Also refresh the lot data to update counts
        const updatedLot = await getParkingLot(selectedLot.id);
        if (updatedLot) {
          setSelectedLot(updatedLot);
        }
        
        // Update the lot in the parkingLots array
        const updatedLots = await fetchParkingLots();
        setParkingLots(updatedLots);
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Determine if a space is bookable
  const isSpaceBookable = (space: ParkingSpace) => {
    return space.status === 'vacant';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading parking information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Book a Parking Space</Text>
          {selectedLot && (
            <View style={styles.lotInfo}>
              <Text style={styles.lotName}>{selectedLot.name}</Text>
              <Text style={styles.lotLocation}>{selectedLot.location}</Text>
              <View style={styles.lotStats}>
                <Text style={styles.lotStat}>
                  Available: {selectedLot.availableSpaces}/{selectedLot.totalSpaces}
                </Text>
              </View>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!selectedLot ? (
          <View style={styles.lotSelectionContainer}>
            <Text style={styles.sectionTitle}>Select a parking lot:</Text>
            
            <FlatList
              data={parkingLots}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.lotCard}
                  onPress={() => handleLotSelect(item)}
                  disabled={item.availableSpaces === 0}
                >
                  <Text style={styles.lotCardName}>{item.name}</Text>
                  <Text style={styles.lotCardLocation}>{item.location}</Text>
                  <View style={[
                    styles.availabilityIndicator,
                    item.availableSpaces === 0 ? styles.fullLot : styles.availableLot
                  ]}>
                    <Text style={styles.availabilityText}>
                      {item.availableSpaces === 0 ? 'Full' : `${item.availableSpaces} Available`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.lotsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="car-outline" size={48} color={colors.textLight} />
                  <Text style={styles.emptyText}>No parking lots available</Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.spacesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select a parking space:</Text>
              <TouchableOpacity 
                style={styles.changeLotButton}
                onPress={() => {
                  setSelectedLot(null);
                  setSelectedSpace(null);
                }}
              >
                <Text style={styles.changeLotText}>Change Lot</Text>
              </TouchableOpacity>
            </View>
            
            {parkingSpaces.length > 0 ? (
              <View style={styles.spacesLayout}>
                <View style={styles.spaceGrid}>
                  {parkingSpaces.map((space) => (
                    <TouchableOpacity
                      key={space.id}
                      style={[
                        styles.spaceItem,
                        !isSpaceBookable(space) && styles.spaceOccupied,
                        selectedSpace?.id === space.id && styles.spaceSelected,
                      ]}
                      onPress={() => {
                        if (isSpaceBookable(space)) {
                          setSelectedSpace(space);
                        }
                      }}
                      disabled={!isSpaceBookable(space)}
                    >
                      <Text style={[
                        styles.spaceNumber,
                        !isSpaceBookable(space) && styles.spaceNumberOccupied,
                        selectedSpace?.id === space.id && styles.spaceNumberSelected,
                      ]}>
                        {space.number}
                      </Text>
                      <View style={[
                        styles.statusIndicator,
                        space.status === 'vacant' && styles.vacantIndicator,
                        space.status === 'occupied' && styles.occupiedIndicator,
                        space.status === 'booked' && styles.bookedIndicator,
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.spaceLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.vacantIndicator]} />
                    <Text style={styles.legendText}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.occupiedIndicator]} />
                    <Text style={styles.legendText}>Occupied</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.bookedIndicator]} />
                    <Text style={styles.legendText}>Booked</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptySpaces}>
                <Text style={styles.emptyText}>
                  No parking spaces available for this lot.
                </Text>
              </View>
            )}

            {selectedSpace && (
              <View style={styles.bookingForm}>
                <View style={styles.selectedSpaceInfo}>
                  <Text style={styles.formLabel}>
                    Selected Space: <Text style={styles.spaceHighlight}>#{selectedSpace.number}</Text>
                  </Text>
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Vehicle Registration:</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleReg}
                    onChangeText={setVehicleReg}
                    placeholder="e.g. KBZ 123Y"
                    autoCapitalize="characters"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Pricing Information:</Text>
                  <View style={styles.pricingInfo}>
                    {currentUser?.role === 'student' ? (
                      <View style={styles.pricingItem}>
                        <Text style={styles.pricingLabel}>Student Rate:</Text>
                        <Text style={styles.pricingValue}>KSH 200 (fixed daily rate)</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.pricingItem}>
                          <Text style={styles.pricingLabel}>Guest Rate:</Text>
                          <Text style={styles.pricingValue}>KSH 50 per hour</Text>
                        </View>
                        <View style={styles.pricingItem}>
                          <Text style={styles.pricingLabel}>First 30 minutes:</Text>
                          <Text style={styles.pricingValue}>Free</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formHelperText}>
                    * Booking will expire in 5 minutes if you don't arrive at the space
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleCreateBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
    padding: spacing.md,
    backgroundColor: colors.primary,
    paddingTop: 60,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  lotInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  lotName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lotLocation: {
    fontSize: fontSizes.md,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  lotStats: {
    marginTop: spacing.xs,
  },
  lotStat: {
    fontSize: fontSizes.md,
    color: '#FFFFFF',
    fontWeight: '500',
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
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  lotSelectionContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  lotsList: {
    paddingHorizontal: spacing.xs,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lotCardName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  lotCardLocation: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  availabilityIndicator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  availableLot: {
    backgroundColor: '#DCFCE7',
  },
  fullLot: {
    backgroundColor: '#FEE2E2',
  },
  availabilityText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
  },
  spacesContainer: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  changeLotButton: {
    padding: spacing.sm,
  },
  changeLotText: {
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  spacesLayout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  spaceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    margin: spacing.xs,
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  spaceOccupied: {
    backgroundColor: '#F3F4F6',
  },
  spaceSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  spaceNumber: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  spaceNumberOccupied: {
    color: colors.textLight,
  },
  spaceNumberSelected: {
    color: colors.primary,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  vacantIndicator: {
    backgroundColor: colors.success,
  },
  occupiedIndicator: {
    backgroundColor: colors.error,
  },
  bookedIndicator: {
    backgroundColor: colors.accent,
  },
  spaceLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptySpaces: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textLight,
    textAlign: 'center',
  },
  bookingForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedSpaceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  spaceHighlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  formField: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
  },
  pricingInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  pricingLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  pricingValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
  },
  formHelperText: {
    fontSize: fontSizes.sm,
    color: colors.accent,
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
});