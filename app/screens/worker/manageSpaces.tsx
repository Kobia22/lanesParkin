// app/screens/worker/manageSpaces.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  RefreshControl,
  ScrollView
} from 'react-native';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { 
  fetchParkingLots, 
  fetchParkingSpaces, 
  updateParkingSpaceStatus 
} from '../../../src/api/parkingAPIIntegration';
import type { ParkingLot, ParkingSpace, ParkingSpaceStatus } from '../../../src/firebase/types';
import { useTheme } from '../../context/themeContext';
// Import the real-time updates service
import parkingUpdateService from '../../../src/firebase/realtimeUpdates';

export default function ManageSpacesScreen() {
  const { colors, isDarkMode } = useTheme();
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [searchText, setSearchText] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Filter options
  const [statusFilter, setStatusFilter] = useState<ParkingSpaceStatus | 'all'>('all');
  
  // Store unsubscribe functions
  const lotsUnsubscribeRef = useRef<(() => void) | null>(null);
  const spacesUnsubscribeRef = useRef<(() => void) | null>(null);
  
  // Load data on component mount
  useEffect(() => {
    loadParkingLots();

    // Clean up subscriptions when component unmounts
    return () => {
      if (lotsUnsubscribeRef.current) {
        lotsUnsubscribeRef.current();
      }
      if (spacesUnsubscribeRef.current) {
        spacesUnsubscribeRef.current();
      }
    };
  }, []);
  
  // Apply filters when search text or status filter changes
  useEffect(() => {
    applyFilters();
  }, [searchText, statusFilter, spaces]);

  // Function to load all parking lots
  const loadParkingLots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedLots = await fetchParkingLots();
      setLots(fetchedLots);
      
      // Subscribe to real-time updates for all lots
      if (lotsUnsubscribeRef.current) {
        lotsUnsubscribeRef.current();
      }
      
      lotsUnsubscribeRef.current = parkingUpdateService.subscribeToAllLots((updatedLots) => {
        console.log('Manage Spaces: Real-time parking lots update received:', updatedLots.length);
        setLots(updatedLots);
        
        // If we have a selected lot, update it too
        if (selectedLot) {
          const updatedSelectedLot = updatedLots.find(lot => lot.id === selectedLot.id);
          if (updatedSelectedLot && JSON.stringify(updatedSelectedLot) !== JSON.stringify(selectedLot)) {
            console.log(`Auto-updating selected lot ${selectedLot.id} with new data`);
            setSelectedLot(updatedSelectedLot);
          }
        }
      });
      
      // If no lot is selected and we have lots, select the first one
      if (!selectedLot && fetchedLots.length > 0) {
        setSelectedLot(fetchedLots[0]);
        await subscribeToSpaces(fetchedLots[0].id);
      } else if (selectedLot) {
        // If a lot is already selected, reload its spaces
        await subscribeToSpaces(selectedLot.id);
      }
    } catch (err) {
      console.error('Error fetching parking lots:', err);
      setError('Failed to load parking lots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to subscribe to spaces for a lot
  const subscribeToSpaces = async (lotId: string) => {
    try {
      // First, get initial data
      const fetchedSpaces = await fetchParkingSpaces(lotId);
      // Sort spaces by number
      fetchedSpaces.sort((a, b) => a.number - b.number);
      setSpaces(fetchedSpaces);
      setFilteredSpaces(fetchedSpaces);
      
      // Then subscribe to updates
      if (spacesUnsubscribeRef.current) {
        spacesUnsubscribeRef.current();
      }
      
      spacesUnsubscribeRef.current = parkingUpdateService.subscribeToSpaces(lotId, (updatedSpaces) => {
        console.log(`Manage Spaces: Real-time spaces update for lot ${lotId}:`, updatedSpaces.length);
        
        // Sort spaces by number
        updatedSpaces.sort((a, b) => a.number - b.number);
        setSpaces(updatedSpaces);
        
        // Will trigger the useEffect to apply filters
      });
    } catch (err) {
      console.error('Error subscribing to parking spaces:', err);
      setError('Failed to load parking spaces');
    }
  };

  // Apply filters based on search text and status filter
  const applyFilters = () => {
    let filtered = [...spaces];
    
    // Apply text search
    if (searchText) {
      filtered = filtered.filter(space => 
        space.number.toString().includes(searchText) ||
        (space.userEmail && space.userEmail.toLowerCase().includes(searchText.toLowerCase())) ||
        (space.vehicleInfo && space.vehicleInfo.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(space => space.status === statusFilter);
    }
    
    setFilteredSpaces(filtered);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedLot) {
      await subscribeToSpaces(selectedLot.id);
    } else {
      await loadParkingLots();
    }
    setRefreshing(false);
  };

  // Handle lot selection
  const handleLotSelect = (lot: ParkingLot) => {
    setSelectedLot(lot);
    subscribeToSpaces(lot.id);
    // Reset filters
    setSearchText('');
    setStatusFilter('all');
  };

  // Open status change modal for a space
  const handleChangeStatus = (space: ParkingSpace) => {
    setSelectedSpace(space);
    setUserEmail(space.userEmail || '');
    setVehicleInfo(space.vehicleInfo || '');
    setModalVisible(true);
  };

  // Update space status
  const updateStatus = async (status: ParkingSpaceStatus) => {
    if (!selectedSpace) return;
    
    try {
      setUpdatingStatus(true);
      
      let userData = undefined;
      
      // Only include user data if the status is not vacant
      if (status !== 'vacant') {
        userData = {
          userEmail: userEmail,
          vehicleInfo: vehicleInfo
        };
      }
      
      await updateParkingSpaceStatus(selectedSpace.id, status, userData);
      
      setModalVisible(false);
      
      // The real-time updates will refresh the spaces and lots automatically
    } catch (err) {
      console.error('Error updating space status:', err);
      Alert.alert('Error', 'Failed to update space status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: ParkingSpaceStatus) => {
    switch (status) {
      case 'vacant':
        return colors.success;
      case 'occupied':
        return colors.error;
      case 'booked':
        return colors.accent;
      default:
        return colors.textLight;
    }
  };

  const renderStatusBadge = (status: ParkingSpaceStatus) => {
    return (
      <View style={[
        styles.statusBadge,
        { backgroundColor: `${getStatusColor(status)}20` } // Using hex opacity
      ]}>
        <Text style={[
          styles.statusText,
          { color: getStatusColor(status) }
        ]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading parking spaces...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>Manage Parking Spaces</Text>
      </View>
      
      <View style={styles.content}>
        {error && (
          <View style={[styles.errorContainer, { 
            backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2'
          }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary }]} 
              onPress={loadParkingLots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.lotSelectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select a Parking Lot</Text>
          
          {lots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No parking lots available</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lotsList}
            >
              {lots.map((lot) => (
                <TouchableOpacity
                  key={lot.id}
                  style={[
                    styles.lotButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground },
                    selectedLot?.id === lot.id && [
                      styles.selectedLotButton,
                      { backgroundColor: colors.primary }
                    ]
                  ]}
                  onPress={() => handleLotSelect(lot)}
                >
                  <Text 
                    style={[
                      styles.lotButtonText,
                      { color: colors.text },
                      selectedLot?.id === lot.id && styles.selectedLotButtonText
                    ]}
                  >
                    {lot.name}
                  </Text>
                  <View style={styles.lotStats}>
                    <View style={styles.lotStat}>
                      <Ionicons name="checkmark-circle" size={12} color={selectedLot?.id === lot.id ? '#FFFFFF' : colors.success} />
                      <Text style={[
                        styles.lotStatText,
                        { color: selectedLot?.id === lot.id ? '#FFFFFF' : colors.text },
                      ]}>
                        {lot.availableSpaces}
                      </Text>
                    </View>
                    <View style={styles.lotStat}>
                      <Ionicons name="close-circle" size={12} color={selectedLot?.id === lot.id ? '#FFFFFF' : colors.error} />
                      <Text style={[
                        styles.lotStatText,
                        { color: selectedLot?.id === lot.id ? '#FFFFFF' : colors.text },
                      ]}>
                        {lot.occupiedSpaces}
                      </Text>
                    </View>
                    <View style={styles.lotStat}>
                      <Ionicons name="time" size={12} color={selectedLot?.id === lot.id ? '#FFFFFF' : colors.accent} />
                      <Text style={[
                        styles.lotStatText,
                        { color: selectedLot?.id === lot.id ? '#FFFFFF' : colors.text },
                      ]}>
                        {lot.bookedSpaces}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        
        {selectedLot && (
          <>
            <View style={styles.filterContainer}>
              <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
                <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search space #, user or vehicle"
                  placeholderTextColor={colors.textLight}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchText('')}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                ) : null}
              </View>
              
              <View style={styles.statusFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
                    statusFilter === 'all' && [
                      styles.activeFilterButton,
                      { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }
                    ]
                  ]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: colors.textLight },
                    statusFilter === 'all' && { color: colors.text }
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
                    statusFilter === 'vacant' && [
                      styles.activeFilterButton,
                      { backgroundColor: `${colors.success}20` }
                    ]
                  ]}
                  onPress={() => setStatusFilter('vacant')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: colors.textLight },
                    statusFilter === 'vacant' && { color: colors.success }
                  ]}>
                    Vacant
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
                    statusFilter === 'occupied' && [
                      styles.activeFilterButton,
                      { backgroundColor: `${colors.error}20` }
                    ]
                  ]}
                  onPress={() => setStatusFilter('occupied')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: colors.textLight },
                    statusFilter === 'occupied' && { color: colors.error }
                  ]}>
                    Occupied
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
                    statusFilter === 'booked' && [
                      styles.activeFilterButton,
                      { backgroundColor: `${colors.accent}20` }
                    ]
                  ]}
                  onPress={() => setStatusFilter('booked')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: colors.textLight },
                    statusFilter === 'booked' && { color: colors.accent }
                  ]}>
                    Booked
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={[styles.spacesContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.cardBackground }]}>
              <View style={styles.spacesHeader}>
                <Text style={[styles.spacesTitle, { color: colors.text }]}>
                  {selectedLot.name} Spaces ({filteredSpaces.length} of {spaces.length})
                </Text>
                <Text style={[styles.spacesSubtitle, { color: colors.textLight }]}>
                  Tap a space to update its status
                </Text>
              </View>
              
              <FlatList
                data={filteredSpaces}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.spaceCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}
                    onPress={() => handleChangeStatus(item)}
                  >
                    <View style={styles.spaceCardHeader}>
                      <Text style={[styles.spaceNumber, { color: colors.text }]}>Space #{item.number}</Text>
                      {renderStatusBadge(item.status)}
                    </View>
                    
                    {item.userEmail && (
                      <View style={styles.userInfo}>
                        <Ionicons name="person-outline" size={14} color={colors.textLight} />
                        <Text style={[styles.userInfoText, { color: colors.text }]}>{item.userEmail}</Text>
                      </View>
                    )}
                    
                    {item.vehicleInfo && (
                      <View style={styles.userInfo}>
                        <Ionicons name="car-outline" size={14} color={colors.textLight} />
                        <Text style={[styles.userInfoText, { color: colors.text }]}>{item.vehicleInfo}</Text>
                      </View>
                    )}
                    
                    {item.startTime && item.status !== 'vacant' && (
                      <View style={styles.userInfo}>
                        <Ionicons name="time-outline" size={14} color={colors.textLight} />
                        <Text style={[styles.userInfoText, { color: colors.text }]}>
                          Since: {new Date(item.startTime).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.editIconContainer}>
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
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
                    <Ionicons name="car-outline" size={48} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.textLight }]}>No spaces match your filters</Text>
                  </View>
                }
                contentContainerStyle={
                  filteredSpaces.length === 0 ? { flex: 1 } : styles.spacesList
                }
              />
            </View>
          </>
        )}
      </View>
      
      {/* Status Change Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1F2937' : colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Update Space #{selectedSpace?.number} Status
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Current Status:</Text>
              <View style={styles.currentStatusContainer}>
                {selectedSpace && renderStatusBadge(selectedSpace.status)}
              </View>
              
              <Text style={[styles.modalLabel, { color: colors.text }]}>Set New Status:</Text>
              <View style={styles.statusButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { backgroundColor: `${colors.success}20` }
                  ]}
                  onPress={() => updateStatus('vacant')}
                  disabled={updatingStatus}
                >
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={[styles.statusButtonText, { color: colors.success }]}>
                    Vacant
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { backgroundColor: `${colors.error}20` }
                  ]}
                  onPress={() => updateStatus('occupied')}
                  disabled={updatingStatus}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                  <Text style={[styles.statusButtonText, { color: colors.error }]}>
                    Occupied
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { backgroundColor: `${colors.accent}20` }
                  ]}
                  onPress={() => updateStatus('booked')}
                  disabled={updatingStatus}
                >
                  <Ionicons name="time" size={24} color={colors.accent} />
                  <Text style={[styles.statusButtonText, { color: colors.accent }]}>
                    Booked
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.modalLabel, { color: colors.text }]}>User Information:</Text>
              <Text style={[styles.modalSubLabel, { color: colors.textLight }]}>
                (Required for occupied or booked status)
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>User Email</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      borderColor: isDarkMode ? '#374151' : '#E2E8F0',
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      color: colors.text 
                    }
                  ]}
                  placeholder="Enter user email"
                  placeholderTextColor={colors.textLight}
                  value={userEmail}
                  onChangeText={setUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Vehicle Information</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      borderColor: isDarkMode ? '#374151' : '#E2E8F0',
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      color: colors.text 
                    }
                  ]}
                  placeholder="e.g., License Plate, Model, Color"
                  placeholderTextColor={colors.textLight}
                  value={vehicleInfo}
                  onChangeText={setVehicleInfo}
                />
              </View>
            </View>
            
            {updatingStatus && (
              <View style={[styles.loadingOverlay, { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Updating status...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: spacing.md,
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
    borderRadius: 8,
    marginBottom: spacing.md,
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
  lotSelectionContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  lotsList: {
    paddingBottom: spacing.xs,
  },
  lotButton: {
    borderRadius: 8,
    padding: spacing.md,
    marginRight: spacing.md,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedLotButton: {
    backgroundColor: colors.primary,
  },
  lotButtonText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  selectedLotButtonText: {
    color: '#FFFFFF',
  },
  lotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lotStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotStatText: {
    fontSize: fontSizes.xs,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
  },
  clearButton: {
    padding: spacing.xs,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 4,
  },
  activeFilterButton: {
  },
  filterButtonText: {
    fontSize: fontSizes.sm,
  },
  spacesContainer: {
    flex: 1,
    borderRadius: 10,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spacesHeader: {
    marginBottom: spacing.md,
  },
  spacesTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  spacesSubtitle: {
    fontSize: fontSizes.sm,
  },
  spacesList: {
    paddingBottom: spacing.md,
  },
  spaceCard: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  spaceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  spaceNumber: {
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  userInfoText: {
    fontSize: fontSizes.sm,
    marginLeft: spacing.xs,
    flex: 1,
  },
  editIconContainer: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    marginTop: -12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
  },
  modalLabel: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  modalSubLabel: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.sm,
  },
  currentStatusContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statusButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statusButtonText: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});