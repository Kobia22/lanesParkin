// app/screens/worker/manageSpaces.tsx
import React, { useState, useEffect } from 'react';
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
} from '../../../src/firebase/database';
import type { ParkingLot, ParkingSpace, ParkingSpaceStatus } from '../../../src/firebase/types';

export default function ManageSpacesScreen() {
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
  
  // Load data on component mount
  useEffect(() => {
    loadParkingLots();
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
      
      // If no lot is selected and we have lots, select the first one
      if (!selectedLot && fetchedLots.length > 0) {
        setSelectedLot(fetchedLots[0]);
        await loadParkingSpaces(fetchedLots[0].id);
      } else if (selectedLot) {
        // If a lot is already selected, reload its spaces
        await loadParkingSpaces(selectedLot.id);
      }
    } catch (err) {
      console.error('Error fetching parking lots:', err);
      setError('Failed to load parking lots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to load spaces for a specific lot
  const loadParkingSpaces = async (lotId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedSpaces = await fetchParkingSpaces(lotId);
      // Sort spaces by number
      fetchedSpaces.sort((a, b) => a.number - b.number);
      setSpaces(fetchedSpaces);
      setFilteredSpaces(fetchedSpaces);
    } catch (err) {
      console.error('Error fetching parking spaces:', err);
      setError('Failed to load parking spaces');
    } finally {
      setLoading(false);
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
      await loadParkingSpaces(selectedLot.id);
    } else {
      await loadParkingLots();
    }
  };

  // Handle lot selection
  const handleLotSelect = (lot: ParkingLot) => {
    setSelectedLot(lot);
    loadParkingSpaces(lot.id);
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
      
      // Update the local state
      const updatedSpace = {
        ...selectedSpace,
        status,
        userEmail: status === 'vacant' ? null : userEmail,
        vehicleInfo: status === 'vacant' ? null : vehicleInfo,
        startTime: status === 'vacant' ? null : new Date().toISOString()
      };
      
      setSpaces(prev => 
        prev.map(space => space.id === selectedSpace.id ? updatedSpace : space)
      );
      
      // Update the selected lot's statistics
      if (selectedLot) {
        const oldStatus = selectedSpace.status;
        let lotUpdate = { ...selectedLot };
        
        // Remove from old status count
        if (oldStatus === 'vacant') lotUpdate.availableSpaces--;
        else if (oldStatus === 'occupied') lotUpdate.occupiedSpaces--;
        else if (oldStatus === 'booked') lotUpdate.bookedSpaces--;
        
        // Add to new status count
        if (status === 'vacant') lotUpdate.availableSpaces++;
        else if (status === 'occupied') lotUpdate.occupiedSpaces++;
        else if (status === 'booked') lotUpdate.bookedSpaces++;
        
        setSelectedLot(lotUpdate);
        
        // Update the lot in the lots list
        setLots(prev => 
          prev.map(lot => lot.id === selectedLot.id ? lotUpdate : lot)
        );
      }
      
      Alert.alert('Success', `Space #${selectedSpace.number} status updated to ${status}`);
      setModalVisible(false);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading parking spaces...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Parking Spaces</Text>
      </View>
      
      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.lotSelectionContainer}>
          <Text style={styles.sectionTitle}>Select a Parking Lot</Text>
          
          {lots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No parking lots available</Text>
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
                    selectedLot?.id === lot.id && styles.selectedLotButton
                  ]}
                  onPress={() => handleLotSelect(lot)}
                >
                  <Text 
                    style={[
                      styles.lotButtonText,
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
                        selectedLot?.id === lot.id && styles.selectedLotButtonText
                      ]}>
                        {lot.availableSpaces}
                      </Text>
                    </View>
                    <View style={styles.lotStat}>
                      <Ionicons name="close-circle" size={12} color={selectedLot?.id === lot.id ? '#FFFFFF' : colors.error} />
                      <Text style={[
                        styles.lotStatText,
                        selectedLot?.id === lot.id && styles.selectedLotButtonText
                      ]}>
                        {lot.occupiedSpaces}
                      </Text>
                    </View>
                    <View style={styles.lotStat}>
                      <Ionicons name="time" size={12} color={selectedLot?.id === lot.id ? '#FFFFFF' : colors.accent} />
                      <Text style={[
                        styles.lotStatText,
                        selectedLot?.id === lot.id && styles.selectedLotButtonText
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
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search space #, user or vehicle"
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
                    statusFilter === 'all' && styles.activeFilterButton
                  ]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    statusFilter === 'all' && styles.activeFilterButtonText
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === 'vacant' && styles.activeFilterButton,
                    statusFilter === 'vacant' && { backgroundColor: `${colors.success}20` }
                  ]}
                  onPress={() => setStatusFilter('vacant')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    statusFilter === 'vacant' && { color: colors.success }
                  ]}>
                    Vacant
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === 'occupied' && styles.activeFilterButton,
                    statusFilter === 'occupied' && { backgroundColor: `${colors.error}20` }
                  ]}
                  onPress={() => setStatusFilter('occupied')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    statusFilter === 'occupied' && { color: colors.error }
                  ]}>
                    Occupied
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === 'booked' && styles.activeFilterButton,
                    statusFilter === 'booked' && { backgroundColor: `${colors.accent}20` }
                  ]}
                  onPress={() => setStatusFilter('booked')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    statusFilter === 'booked' && { color: colors.accent }
                  ]}>
                    Booked
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.spacesContainer}>
              <View style={styles.spacesHeader}>
                <Text style={styles.spacesTitle}>
                  {selectedLot.name} Spaces ({filteredSpaces.length} of {spaces.length})
                </Text>
                <Text style={styles.spacesSubtitle}>
                  Tap a space to update its status
                </Text>
              </View>
              
              <FlatList
                data={filteredSpaces}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.spaceCard}
                    onPress={() => handleChangeStatus(item)}
                  >
                    <View style={styles.spaceCardHeader}>
                      <Text style={styles.spaceNumber}>Space #{item.number}</Text>
                      {renderStatusBadge(item.status)}
                    </View>
                    
                    {item.userEmail && (
                      <View style={styles.userInfo}>
                        <Ionicons name="person-outline" size={14} color={colors.textLight} />
                        <Text style={styles.userInfoText}>{item.userEmail}</Text>
                      </View>
                    )}
                    
                    {item.vehicleInfo && (
                      <View style={styles.userInfo}>
                        <Ionicons name="car-outline" size={14} color={colors.textLight} />
                        <Text style={styles.userInfoText}>{item.vehicleInfo}</Text>
                      </View>
                    )}
                    
                    {item.startTime && item.status !== 'vacant' && (
                      <View style={styles.userInfo}>
                        <Ionicons name="time-outline" size={14} color={colors.textLight} />
                        <Text style={styles.userInfoText}>
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
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="car-outline" size={48} color={colors.textLight} />
                    <Text style={styles.emptyText}>No spaces match your filters</Text>
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
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
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
              <Text style={styles.modalLabel}>Current Status:</Text>
              <View style={styles.currentStatusContainer}>
                {selectedSpace && renderStatusBadge(selectedSpace.status)}
              </View>
              
              <Text style={styles.modalLabel}>Set New Status:</Text>
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
              
              <Text style={styles.modalLabel}>User Information:</Text>
              <Text style={styles.modalSubLabel}>
                (Required for occupied or booked status)
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>User Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter user email"
                  value={userEmail}
                  onChangeText={setUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Vehicle Information</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., License Plate, Model, Color"
                  value={vehicleInfo}
                  onChangeText={setVehicleInfo}
                />
              </View>
            </View>
            
            {updatingStatus && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Updating status...</Text>
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
  content: {
    flex: 1,
    padding: spacing.md,
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
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
  },
  lotSelectionContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  lotsList: {
    paddingBottom: spacing.xs,
  },
  lotButton: {
    backgroundColor: colors.cardBackground,
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
    color: colors.text,
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
    color: colors.textLight,
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
    color: colors.textLight,
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
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
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#E5E7EB',
  },
  filterButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  activeFilterButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  spacesContainer: {
    flex: 1,
    backgroundColor: colors.cardBackground,
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
    color: colors.text,
  },
  spacesSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  spacesList: {
    paddingBottom: spacing.md,
  },
  spaceCard: {
    backgroundColor: '#F9FAFB',
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
    color: colors.text,
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
    color: colors.textLight,
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
    backgroundColor: colors.cardBackground,
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
    borderBottomColor: '#E5E7EB',
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    backgroundColor: '#F9FAFB',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});