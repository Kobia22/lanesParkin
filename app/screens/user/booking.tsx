// app/screens/user/booking.tsx - Updated with real-time updates
import React, { useState, useEffect, useRef } from 'react';
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
} from '../../../src/api/parkingAPIIntegration';
import { getCurrentUser } from '../../../src/firebase/auth';
import { spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import type { ParkingLot, ParkingSpace, User } from '../../../src/firebase/types';
import { useTheme } from '../../context/themeContext';
import parkingUpdateService from '../../../src/firebase/realTimeUpdates';

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
  const { colors, isDarkMode } = useTheme();
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
  // Store unsubscribe functions
  const lotsUnsubscribeRef = useRef<(() => void) | null>(null);
  const spacesUnsubscribeRef = useRef<(() => void) | null>(null);
  const selectedLotUnsubscribeRef = useRef<(() => void) | null>(null);

  // Load user, parking lots, and any lot passed in route params
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // Initial fetch of all parking lots
        const lots = await fetchParkingLots();
        setParkingLots(lots);
        
        // Subscribe to real-time updates for all lots
        if (lotsUnsubscribeRef.current) {
          lotsUnsubscribeRef.current();
        }
        
        lotsUnsubscribeRef.current = parkingUpdateService.subscribeToAllLots((updatedLots) => {
          console.log('Booking screen: Real-time parking lots update received:', updatedLots.length);
          setParkingLots(updatedLots);
          
          // If we have a selected lot, update its data too
          if (selectedLot) {
            const updatedSelectedLot = updatedLots.find(lot => lot.id === selectedLot.id);
            if (updatedSelectedLot && JSON.stringify(updatedSelectedLot) !== JSON.stringify(selectedLot)) {
              console.log(`Auto-updating selected lot ${selectedLot.id} with new data`);
              setSelectedLot(updatedSelectedLot);
            }
          }
        });
        
        // If a specific lot is passed in route params, select it
        if (route.params?.lotId) {
          const lot = await getParkingLot(route.params.lotId);
          if (lot) {
            setSelectedLot(lot);
            // Subscribe to real-time updates for this specific lot's spaces
            await subscribeToSpaces(lot.id);
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
    
    // Clean up subscriptions when component unmounts
    return () => {
      if (lotsUnsubscribeRef.current) {
        lotsUnsubscribeRef.current();
      }
      if (spacesUnsubscribeRef.current) {
        spacesUnsubscribeRef.current();
      }
      if (selectedLotUnsubscribeRef.current) {
        selectedLotUnsubscribeRef.current();
      }
    };
  }, [route.params?.lotId]);

  // Subscribe to spaces for a lot
  const subscribeToSpaces = async (lotId: string) => {
    try {
      // First, get initial data
      const spaces = await fetchParkingSpaces(lotId);
      setParkingSpaces(spaces);
      
      // Then subscribe to updates
      if (spacesUnsubscribeRef.current) {
        spacesUnsubscribeRef.current();
      }
      
      spacesUnsubscribeRef.current = parkingUpdateService.subscribeToSpaces(lotId, (updatedSpaces) => {
        console.log(`Booking screen: Real-time spaces update for lot ${lotId}:`, updatedSpaces.length);
        setParkingSpaces(updatedSpaces);
        
        // If we have a selected space, check if it's still available
        if (selectedSpace) {
          const updatedSelectedSpace = updatedSpaces.find(space => space.id === selectedSpace.id);
          
          // If space was selected but is no longer available, show alert and deselect
          if (updatedSelectedSpace && !isSpaceBookable(updatedSelectedSpace) && isSpaceBookable(selectedSpace)) {
            Alert.alert(
              'Space No Longer Available',
              `The parking space #${selectedSpace.number} you selected is no longer available. Please select another space.`,
              [{ text: 'OK' }]
            );
            setSelectedSpace(null);
          } else if (updatedSelectedSpace && JSON.stringify(updatedSelectedSpace) !== JSON.stringify(selectedSpace)) {
            // Update the selected space data
            setSelectedSpace(updatedSelectedSpace);
          }
        }
      });

      // Also subscribe to real-time updates for the selected lot
      if (selectedLotUnsubscribeRef.current) {
        selectedLotUnsubscribeRef.current();
      }
      
      selectedLotUnsubscribeRef.current = parkingUpdateService.subscribeToLot(lotId, (updatedLot) => {
        console.log(`Booking screen: Real-time update for selected lot ${lotId}`);
        setSelectedLot(updatedLot);
      });
      
    } catch (err) {
      console.error('Error subscribing to parking spaces:', err);
      setError('Failed to load parking spaces');
      return false;
    }
    return true;
  };

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
          await subscribeToSpaces(updatedLot.id);
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
      
      // Subscribe to space updates for this lot
      const success = await subscribeToSpaces(lot.id);
      
      if (!success) {
        throw new Error('Failed to load parking spaces');
      }
    } catch (err) {
      console.error('Error selecting lot:', err);
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

      // Verify the space is still available before booking
      const latestSpace = await getLatestSpaceStatus(selectedSpace.id);
      if (!latestSpace || !isSpaceBookable(latestSpace)) {
        Alert.alert(
          'Space No Longer Available',
          'This parking space is no longer available. Please select another space.',
          [{ text: 'OK' }]
        );
        // Refresh spaces to show updated status
        if (selectedLot) {
          await subscribeToSpaces(selectedLot.id);
        }
        setSelectedSpace(null);
        setBookingLoading(false);
        return;
      }

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
      
      // The spaces and lot will automatically update through our real-time subscriptions
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper function to get the latest status of a space
  const getLatestSpaceStatus = async (spaceId: string): Promise<ParkingSpace | null> => {
    try {
      const spaces = await fetchParkingSpaces(selectedLot!.id);
      return spaces.find(space => space.id === spaceId) || null;
    } catch (err) {
      console.error('Error fetching latest space status:', err);
      return null;
    }
  };

  // Determine if a space is bookable
  const isSpaceBookable = (space: ParkingSpace) => {
    return space.status === 'vacant';
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading parking information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
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
          <View style={[styles.errorContainer, { 
            backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEE2E2'
          }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {!selectedLot ? (
          <View style={styles.lotSelectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select a parking lot:</Text>
            
            <FlatList
              data={parkingLots}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.lotCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleLotSelect(item)}
                  disabled={item.availableSpaces === 0}
                >
                  <Text style={[styles.lotCardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.lotCardLocation, { color: colors.textLight }]}>{item.location}</Text>
                  <View style={[
                    styles.availabilityIndicator,
                    item.availableSpaces === 0 ? 
                      (isDarkMode ? { backgroundColor: 'rgba(220, 38, 38, 0.2)' } : styles.fullLot) : 
                      (isDarkMode ? { backgroundColor: 'rgba(34, 197, 94, 0.2)' } : styles.availableLot)
                  ]}>
                    <Text style={[styles.availabilityText, { color: colors.text }]}>
                      {item.availableSpaces === 0 ? 'Full' : `${item.availableSpaces} Available`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.lotsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="car-outline" size={48} color={colors.textLight} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>No parking lots available</Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.spacesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select a parking space:</Text>
              <TouchableOpacity 
                style={styles.changeLotButton}
                onPress={() => {
                  // Clean up space subscriptions first
                  if (spacesUnsubscribeRef.current) {
                    spacesUnsubscribeRef.current();
                    spacesUnsubscribeRef.current = null;
                  }
                  if (selectedLotUnsubscribeRef.current) {
                    selectedLotUnsubscribeRef.current();
                    selectedLotUnsubscribeRef.current = null;
                  }
                  setSelectedLot(null);
                  setSelectedSpace(null);
                }}
              >
                <Text style={[styles.changeLotText, { color: colors.primary }]}>Change Lot</Text>
              </TouchableOpacity>
            </View>
            
            {parkingSpaces.length > 0 ? (
              <View style={[styles.spacesLayout, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.spaceGrid}>
                  {parkingSpaces.map((space) => (
                    <TouchableOpacity
                      key={space.id}
                      style={[
                        styles.spaceItem,
                        { 
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.borderColor 
                        },
                        !isSpaceBookable(space) && [
                          styles.spaceOccupied, 
                          { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }
                        ],
                        selectedSpace?.id === space.id && [
                          styles.spaceSelected,
                          { borderColor: colors.primary }
                        ],
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
                        { color: colors.text },
                        !isSpaceBookable(space) && [
                          styles.spaceNumberOccupied,
                          { color: colors.textLight }
                        ],
                        selectedSpace?.id === space.id && [
                          styles.spaceNumberSelected,
                          { color: colors.primary }
                        ],
                      ]}>
                        {space.number}
                      </Text>
                      <View style={[
                        styles.statusIndicator,
                        space.status === 'vacant' && { backgroundColor: colors.success },
                        space.status === 'occupied' && { backgroundColor: colors.error },
                        space.status === 'booked' && { backgroundColor: colors.accent },
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.spaceLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.legendText, { color: colors.textLight }]}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                    <Text style={[styles.legendText, { color: colors.textLight }]}>Occupied</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.legendText, { color: colors.textLight }]}>Booked</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.emptySpaces, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No parking spaces available for this lot.
                </Text>
              </View>
            )}

            {selectedSpace && (
              <View style={[styles.bookingForm, { backgroundColor: colors.cardBackground }]}>
                <View style={[styles.selectedSpaceInfo, { borderBottomColor: colors.borderColor }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>
                    Selected Space: <Text style={[styles.spaceHighlight, { color: colors.primary }]}>#{selectedSpace.number}</Text>
                  </Text>
                </View>
                
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Vehicle Registration:</Text>
                  <TextInput
                    style={[styles.input, { 
                      borderColor: colors.borderColor, 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                      color: colors.text
                    }]}
                    value={vehicleReg}
                    onChangeText={setVehicleReg}
                    placeholder="e.g. KBZ 123Y"
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="characters"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Pricing Information:</Text>
                  <View style={[styles.pricingInfo, { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                  }]}>
                    {currentUser?.role === 'student' ? (
                      <View style={styles.pricingItem}>
                        <Text style={[styles.pricingLabel, { color: colors.textLight }]}>Student Rate:</Text>
                        <Text style={[styles.pricingValue, { color: colors.text }]}>KSH 200 (fixed daily rate)</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.pricingItem}>
                          <Text style={[styles.pricingLabel, { color: colors.textLight }]}>Guest Rate:</Text>
                          <Text style={[styles.pricingValue, { color: colors.text }]}>KSH 50 per hour</Text>
                        </View>
                        <View style={styles.pricingItem}>
                          <Text style={[styles.pricingLabel, { color: colors.textLight }]}>First 30 minutes:</Text>
                          <Text style={[styles.pricingValue, { color: colors.text }]}>Free</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.formField}>
                  <Text style={[styles.formHelperText, { color: colors.accent }]}>
                    * Booking will expire in 5 minutes if you don't arrive at the space
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.primary }]}
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
  },
  header: {
    padding: spacing.md,
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
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
  },
  errorContainer: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
  },
  errorText: {
    textAlign: 'center',
  },
  lotSelectionContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  lotsList: {
    paddingHorizontal: spacing.xs,
  },
  lotCard: {
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
  },
  lotCardLocation: {
    fontSize: fontSizes.sm,
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
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  spacesLayout: {
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
    borderRadius: 5,
    margin: spacing.xs,
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  spaceOccupied: {
  },
  spaceSelected: {
    borderWidth: 2,
  },
  spaceNumber: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  spaceNumberOccupied: {
  },
  spaceNumberSelected: {
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
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
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptySpaces: {
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  bookingForm: {
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
  },
  spaceHighlight: {
    fontWeight: 'bold',
  },
  formField: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
  },
  pricingInfo: {
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
  },
  pricingValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  formHelperText: {
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
  },
  confirmButton: {
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