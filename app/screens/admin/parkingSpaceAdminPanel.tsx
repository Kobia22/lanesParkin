// app/screens/admin/parkingSpaceAdminPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { 
  getAllParkingLots as fetchParkingLots, 
  getParkingSpaces as fetchParkingSpaces,
  createParkingSpace as addParkingSpace, 
  updateParkingSpace, 
  deleteParkingSpace,
  createMultipleParkingSpaces
} from '../../../src/api/parkingService';
import { useTheme } from '../../context/themeContext';
import { Ionicons } from '@expo/vector-icons';
import type { ParkingLot, ParkingSpace, ParkingSpaceStatus } from '../../../src/firebase/types';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminParkingStackParamList } from '../navigators/adminNavigator';

type ParkingSpaceAdminPanelProps = {
  navigation: StackNavigationProp<AdminParkingStackParamList, 'ParkingSpaceAdminPanel'>;
  route: RouteProp<AdminParkingStackParamList, 'ParkingSpaceAdminPanel'>;
};

interface SpaceFormData {
  number: string;
  status: ParkingSpaceStatus;
}

const { width } = Dimensions.get('window');
const SPACE_ITEM_SIZE = (width - 80) / 4; // 4 spaces per row with margins

export default function ParkingSpaceAdminPanel({ navigation, route }: ParkingSpaceAdminPanelProps) {
  const { colors, isDarkMode } = useTheme();
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSpace, setEditingSpace] = useState<ParkingSpace | null>(null);
  const [formData, setFormData] = useState<SpaceFormData>({
    number: '',
    status: 'vacant'
  });
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  const [generatingSpaces, setGeneratingSpaces] = useState(false);
  const [spaceSearch, setSpaceSearch] = useState('');
  const [isStatusFilterVisible, setIsStatusFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ParkingSpaceStatus | 'all'>('all');

  // Load parking lots on component mount
  useEffect(() => {
    loadParkingLots();
  }, []);

  // Handle route params if a specific lot is selected
  useEffect(() => {
    if (route.params?.lotId) {
      const lotId = route.params.lotId;
      console.log(`Route params received - lot ID: ${lotId}`);
      
      // Set the selected lot and load its spaces
      if (lots.length > 0) {
        const lot = lots.find(l => l.id === lotId);
        if (lot) {
          console.log(`Selected lot from params: ${lot.name}`);
          setSelectedLot(lot);
          loadParkingSpaces(lot.id);
        } else {
          console.log(`Lot with ID ${lotId} not found in loaded lots`);
        }
      }
    }
  }, [route.params?.lotId, lots]);

  // Function to load all parking lots
  const loadParkingLots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching parking lots...');
      const fetchedLots = await fetchParkingLots();
      console.log(`Fetched ${fetchedLots.length} parking lots`);
      setLots(fetchedLots);
      
      // If no lot is selected and we have lots, select the first one
      if (!selectedLot && fetchedLots.length > 0) {
        console.log(`Automatically selecting lot: ${fetchedLots[0].name}`);
        setSelectedLot(fetchedLots[0]);
        await loadParkingSpaces(fetchedLots[0].id);
      } else if (selectedLot) {
        // If a lot is already selected, reload its spaces
        console.log(`Reloading spaces for selected lot: ${selectedLot.name}`);
        await loadParkingSpaces(selectedLot.id);
      }
    } catch (err) {
      console.error('Error fetching parking lots:', err);
      setError('Failed to load parking lots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to load spaces for a specific lot
  const loadParkingSpaces = async (lotId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading spaces for lot ID: ${lotId}`);
      const fetchedSpaces = await fetchParkingSpaces(lotId);
      console.log(`Fetched ${fetchedSpaces.length} spaces`);
      
      // Sort spaces by number
      fetchedSpaces.sort((a, b) => a.number - b.number);
      setSpaces(fetchedSpaces);
      
      // Update the lot with accurate counts if needed
      const updatedLot = lots.find(lot => lot.id === lotId);
      if (updatedLot) {
        // Refresh the lot data to get the synchronized counts
        const refreshedLots = await fetchParkingLots();
        setLots(refreshedLots);
        const refreshedLot = refreshedLots.find(lot => lot.id === lotId);
        if (refreshedLot) {
          setSelectedLot(refreshedLot);
        }
      }
    } catch (err) {
      console.error('Error fetching parking spaces:', err);
      setError('Failed to load parking spaces. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for selecting a lot
  const handleLotSelect = (lot: ParkingLot) => {
    console.log(`Selected lot: ${lot.name}`);
    setSelectedLot(lot);
    loadParkingSpaces(lot.id);
    setSuccessMessage(null);
    setError(null);
    setSpaceSearch('');
    setStatusFilter('all');
  };

  // Open modal to add a new space
  const handleAddSpace = () => {
    if (!selectedLot) {
      setError('Please select a parking lot first');
      return;
    }
    
    setEditingSpace(null);
    
    // Find the highest existing space number to provide as default
    let highestNumber = 0;
    spaces.forEach(space => {
      if (space.number > highestNumber) {
        highestNumber = space.number;
      }
    });
    
    setFormData({
      number: (highestNumber + 1).toString(),
      status: 'vacant'
    });
    
    setModalVisible(true);
  };

  // Open modal to edit an existing space
  const handleEditSpace = (space: ParkingSpace) => {
    console.log(`Editing space #${space.number}`);
    setEditingSpace(space);
    setFormData({
      number: space.number.toString(),
      status: space.status
    });
    setModalVisible(true);
  };

  // Save form data (either create or update)
  const handleSaveForm = async () => {
    if (!selectedLot) {
      setError('Please select a parking lot first');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setSaving(true);

      // Form validation
      if (!formData.number.trim()) {
        setError('Please enter a space number');
        setSaving(false);
        return;
      }

      const spaceNumber = parseInt(formData.number);
      if (isNaN(spaceNumber) || spaceNumber <= 0) {
        setError('Please enter a valid space number');
        setSaving(false);
        return;
      }

      // Check for duplicate space numbers
      if (!editingSpace) {
        const existingSpace = spaces.find(s => s.number === spaceNumber);
        if (existingSpace) {
          setError(`Space #${spaceNumber} already exists in this lot`);
          setSaving(false);
          return;
        }
      } else if (editingSpace.number !== spaceNumber) {
        const existingSpace = spaces.find(s => s.number === spaceNumber && s.id !== editingSpace.id);
        if (existingSpace) {
          setError(`Space #${spaceNumber} already exists in this lot`);
          setSaving(false);
          return;
        }
      }

      // Prepare data object
      const spaceData = {
        lotId: selectedLot.id,
        number: spaceNumber,
        status: formData.status,
        currentBookingId: editingSpace?.currentBookingId || null,
        userId: editingSpace?.userId || null,
        userEmail: editingSpace?.userEmail || null,
        vehicleInfo: editingSpace?.vehicleInfo || null,
        startTime: editingSpace?.startTime || null,
        bookingExpiryTime: editingSpace?.bookingExpiryTime || null
      };

      if (editingSpace) {
        // Update existing space
        console.log(`Updating space ${editingSpace.id}:`, spaceData);
        await updateParkingSpace(editingSpace.id, spaceData);
        setSuccessMessage('Parking space updated successfully');
        
        // Update local state
        setSpaces(prev => 
          prev.map(space => space.id === editingSpace.id ? { ...space, ...spaceData } : space)
            .sort((a, b) => a.number - b.number)
        );
      } else {
        // Create new space
        console.log('Creating new space:', spaceData);
        const newSpace = await addParkingSpace(spaceData);
        console.log('New space created:', newSpace);
        setSuccessMessage('Parking space added successfully');
        
        // Update local state
        setSpaces(prev => [...prev, newSpace].sort((a, b) => a.number - b.number));
      }

      // Close modal after success
      setModalVisible(false);
      
      // Reload the spaces to get updated counts
      if (selectedLot) {
        await loadParkingSpaces(selectedLot.id);
      }
    } catch (err) {
      console.error('Error saving parking space:', err);
      setError('Failed to save parking space. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete a parking space
  const handleDeleteSpace = (space: ParkingSpace) => {
    Alert.alert(
      'Delete Parking Space',
      `Are you sure you want to delete space #${space.number}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log(`Deleting space: ${space.id}`);
              await deleteParkingSpace(space.id);
              
              // Update local state
              setSpaces(prev => prev.filter(item => item.id !== space.id));
              
              setSuccessMessage('Parking space deleted successfully');
              
              // Reload the spaces to get updated counts
              if (selectedLot) {
                await loadParkingSpaces(selectedLot.id);
              }
            } catch (err) {
              console.error('Error deleting parking space:', err);
              setError('Failed to delete parking space. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Toggle space details expansion
  const toggleSpaceDetails = (spaceId: string) => {
    if (expandedSpace === spaceId) {
      setExpandedSpace(null);
    } else {
      setExpandedSpace(spaceId);
    }
  };

  // Generate multiple parking spaces at once
  const handleGenerateSpaces = () => {
    if (!selectedLot) {
      setError('Please select a parking lot first');
      return;
    }

    Alert.prompt(
      'Generate Parking Spaces',
      'How many consecutive spaces would you like to add?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Generate',
          onPress: async (numberOfSpaces) => {
            if (!numberOfSpaces) return;
            
            const count = parseInt(numberOfSpaces);
            if (isNaN(count) || count <= 0) {
              setError('Please enter a valid number');
              return;
            }
            
            try {
              setGeneratingSpaces(true);
              setSuccessMessage(`Generating ${count} spaces...`);
              
              // Find the highest existing space number
              let highestNumber = 0;
              spaces.forEach(space => {
                if (space.number > highestNumber) {
                  highestNumber = space.number;
                }
              });
              
              // Create multiple spaces using the API
              console.log(`Creating ${count} spaces for lot ${selectedLot.id} starting at number ${highestNumber + 1}`);
              const newSpaces = await createMultipleParkingSpaces(selectedLot.id, highestNumber + 1, count);
              console.log(`Successfully created ${newSpaces.length} spaces`);
              
              // Update local state
              setSpaces(prev => [...prev, ...newSpaces].sort((a, b) => a.number - b.number));
              
              setSuccessMessage(`${count} parking spaces added successfully`);
              
              // Reload the spaces to get updated counts
              if (selectedLot) {
                await loadParkingSpaces(selectedLot.id);
              }
            } catch (err) {
              console.error('Error generating parking spaces:', err);
              setError('Failed to generate parking spaces. Please try again.');
            } finally {
              setGeneratingSpaces(false);
            }
          }
        }
      ],
      'plain-text',
      ''
    );
  };

  // Refresh the current lot's spaces
  const handleRefresh = () => {
    if (selectedLot) {
      loadParkingSpaces(selectedLot.id);
    } else {
      loadParkingLots();
    }
    
    // Reset filters
    setSpaceSearch('');
    setStatusFilter('all');
  };

  // Filter spaces based on search and status filter
  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = spaceSearch === '' || 
                          space.number.toString().includes(spaceSearch) ||
                          (space.userEmail && space.userEmail.toLowerCase().includes(spaceSearch.toLowerCase())) ||
                          (space.vehicleInfo && space.vehicleInfo.toLowerCase().includes(spaceSearch.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || space.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group spaces into rows of 4 for grid display
  const groupedSpaces = filteredSpaces.reduce((groups, space, index) => {
    const groupIndex = Math.floor(index / 4);
    if (!groups[groupIndex]) {
      groups[groupIndex] = [];
    }
    groups[groupIndex].push(space);
    return groups;
  }, [] as ParkingSpace[][]);

  const styles = makeStyles(colors, isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking Spaces</Text>
        
        {selectedLot && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {successMessage && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}
          
          <View style={styles.lotSelectionContainer}>
            <Text style={styles.sectionTitle}>Select Parking Lot</Text>
            
            {loading && lots.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : lots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No parking lots available</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('ParkingLotAdminPanel')}
                >
                  <Text style={styles.emptyButtonText}>Add Parking Lots</Text>
                </TouchableOpacity>
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
                    <View style={styles.lotStatsRow}>
                      <Text style={[
                        styles.lotSpacesText,
                        selectedLot?.id === lot.id && styles.selectedLotButtonText
                      ]}>
                        {lot.totalSpaces} spaces
                      </Text>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: lot.availableSpaces > 0 ? colors.success : colors.error }
                      ]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          
          {selectedLot && (
            <>
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddSpace}
                  disabled={saving || generatingSpaces}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Add Space</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerateSpaces}
                  disabled={saving || generatingSpaces}
                >
                  {generatingSpaces ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="layers" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Bulk Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.spacesContainer}>
                <View style={styles.spacesHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Spaces</Text>
                    <Text style={styles.spaceSummary}>
                      {selectedLot.availableSpaces} available of {selectedLot.totalSpaces} total
                    </Text>
                  </View>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: colors.success }]} />
                      <Text style={styles.statText}>{selectedLot.availableSpaces} Available</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: colors.error }]} />
                      <Text style={styles.statText}>{selectedLot.occupiedSpaces} Occupied</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: colors.accent }]} />
                      <Text style={styles.statText}>{selectedLot.bookedSpaces} Booked</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.searchFilterContainer}>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      value={spaceSearch}
                      onChangeText={setSpaceSearch}
                      placeholder="Search space #, email, or vehicle"
                      placeholderTextColor={colors.textLight}
                    />
                    {spaceSearch !== '' && (
                      <TouchableOpacity 
                        onPress={() => setSpaceSearch('')}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.textLight} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.filterButton}
                    onPress={() => setIsStatusFilterVisible(!isStatusFilterVisible)}
                  >
                    <Ionicons 
                      name="filter" 
                      size={20} 
                      color={statusFilter !== 'all' ? colors.primary : colors.textLight} 
                    />
                  </TouchableOpacity>
                </View>
                
                {isStatusFilterVisible && (
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        statusFilter === 'all' && styles.filterOptionSelected
                      ]}
                      onPress={() => setStatusFilter('all')}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        statusFilter === 'all' && styles.filterOptionTextSelected
                      ]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        statusFilter === 'vacant' && styles.filterOptionSelected
                      ]}
                      onPress={() => setStatusFilter('vacant')}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        statusFilter === 'vacant' && styles.filterOptionTextSelected
                      ]}>Available</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        statusFilter === 'occupied' && styles.filterOptionSelected
                      ]}
                      onPress={() => setStatusFilter('occupied')}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        statusFilter === 'occupied' && styles.filterOptionTextSelected
                      ]}>Occupied</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        statusFilter === 'booked' && styles.filterOptionSelected
                      ]}
                      onPress={() => setStatusFilter('booked')}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        statusFilter === 'booked' && styles.filterOptionTextSelected
                      ]}>Booked</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading parking spaces...</Text>
                  </View>
                ) : filteredSpaces.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    {spaces.length === 0 ? (
                      <>
                        <Text style={styles.emptyText}>No parking spaces in this lot</Text>
                        <TouchableOpacity
                          style={styles.emptyButton}
                          onPress={handleAddSpace}
                        >
                          <Text style={styles.emptyButtonText}>Add First Space</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.emptyText}>
                        No spaces match your search criteria
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.spacesGrid}>
                    {groupedSpaces.map((row, rowIndex) => (
                      <View key={`row-${rowIndex}`} style={styles.spacesRow}>
                        {row.map(space => (
                          <View key={space.id} style={styles.spaceCardCompact}>
                            <TouchableOpacity
                              style={[
                                styles.spaceButton,
                                space.status === 'vacant' && styles.spaceVacant,
                                space.status === 'occupied' && styles.spaceOccupied,
                                space.status === 'booked' && styles.spaceBooked,
                                expandedSpace === space.id && styles.spaceSelected,
                              ]}
                              onPress={() => toggleSpaceDetails(space.id)}
                            >
                              <Text style={[
                                styles.spaceNumber,
                                (space.status === 'occupied' || space.status === 'booked') && 
                                styles.spaceNumberOccupied
                              ]}>
                                {space.number}
                              </Text>
                              
                              <View style={styles.spaceStatusIndicator}>
                                <Ionicons 
                                  name={
                                    space.status === 'vacant' ? 'checkmark-circle' : 
                                    space.status === 'occupied' ? 'close-circle' : 'time'
                                  }
                                  size={14}
                                  color={
                                    space.status === 'vacant' ? colors.success : 
                                    space.status === 'occupied' ? colors.error : colors.accent
                                  }
                                />
                              </View>
                            </TouchableOpacity>
                            
                            {expandedSpace === space.id && (
                              <View style={styles.spaceDetails}>
                                <View style={styles.spaceDetail}>
                                  <Text style={styles.spaceDetailLabel}>Status:</Text>
                                  <Text style={[
                                    styles.spaceDetailValue,
                                    { color: 
                                      space.status === 'vacant' ? colors.success : 
                                      space.status === 'occupied' ? colors.error : colors.accent
                                    }
                                  ]}>
                                    {space.status === 'vacant' ? 'Available' : 
                                    space.status === 'occupied' ? 'Occupied' : 'Booked'}
                                  </Text>
                                </View>
                                
                                {space.userEmail && (
                                  <View style={styles.spaceDetail}>
                                    <Text style={styles.spaceDetailLabel}>User:</Text>
                                    <Text style={styles.spaceDetailValue} numberOfLines={1}>
                                      {space.userEmail}
                                    </Text>
                                  </View>
                                )}
                                
                                {space.vehicleInfo && (
                                  <View style={styles.spaceDetail}>
                                    <Text style={styles.spaceDetailLabel}>Vehicle:</Text>
                                    <Text style={styles.spaceDetailValue} numberOfLines={1}>
                                      {space.vehicleInfo}
                                    </Text>
                                  </View>
                                )}
                                
                                <View style={styles.spaceActions}>
                                  <TouchableOpacity
                                    style={styles.editSpaceButton}
                                    onPress={() => handleEditSpace(space)}
                                  >
                                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                                    <Text style={styles.editSpaceText}>Edit</Text>
                                  </TouchableOpacity>
                                  
                                  <TouchableOpacity
                                    style={styles.deleteSpaceButton}
                                    onPress={() => handleDeleteSpace(space)}
                                  >
                                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                                    <Text style={styles.deleteSpaceText}>Delete</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add/Edit Parking Space Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSpace ? 'Edit Parking Space' : 'Add New Space'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Space Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, number: text }))}
                  placeholder="Enter space number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>
              
              {editingSpace && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Status</Text>
                  <View style={styles.statusToggle}>
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        formData.status === 'vacant' && styles.statusOptionSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'vacant' }))}
                    >
                      <Ionicons
                        name="checkmark-circle" 
                        size={16}
                        color={formData.status === 'vacant' ? '#FFFFFF' : colors.textLight}
                        style={styles.statusOptionIcon}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        formData.status === 'vacant' && styles.statusOptionTextSelected
                      ]}>
                        Available
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        formData.status === 'occupied' && styles.statusOptionSelectedOccupied
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'occupied' }))}
                    >
                      <Ionicons
                        name="close-circle" 
                        size={16}
                        color={formData.status === 'occupied' ? '#FFFFFF' : colors.textLight}
                        style={styles.statusOptionIcon}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        formData.status === 'occupied' && styles.statusOptionTextSelected
                      ]}>
                        Occupied
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        formData.status === 'booked' && styles.statusOptionSelectedBooked
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'booked' }))}
                    >
                      <Ionicons
                        name="time" 
                        size={16}
                        color={formData.status === 'booked' ? '#FFFFFF' : colors.textLight}
                        style={styles.statusOptionIcon}
                      />
                      <Text style={[
                        styles.statusOptionText,
                        formData.status === 'booked' && styles.statusOptionTextSelected
                      ]}>
                        Booked
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveForm}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingSpace ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Dynamic styles with theme support
const makeStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textLight,
  },
  errorContainer: {
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
  },
  successContainer: {
    backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.1)' : '#DCFCE7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: colors.success,
  },
  lotSelectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  lotsList: {
    paddingBottom: 8,
  },
  lotButton: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedLotButton: {
    backgroundColor: colors.primary,
  },
  lotButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLotButtonText: {
    color: '#FFFFFF',
  },
  lotStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lotSpacesText: {
    fontSize: 12,
    color: colors.textLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : colors.cardBackground,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  generateButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  spacesContainer: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : colors.cardBackground,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spacesHeader: {
    marginBottom: 12,
  },
  spaceSummary: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    color: colors.textLight,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptions: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  filterOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterOptionSelected: {
    backgroundColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
  },
  spacesGrid: {
    paddingTop: 4,
  },
  spacesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  spaceCardCompact: {
    width: SPACE_ITEM_SIZE,
    marginRight: 8,
    marginBottom: 8,
  },
  spaceButton: {
    width: SPACE_ITEM_SIZE,
    height: SPACE_ITEM_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
  },
  spaceVacant: {
    backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.1)' : '#F0FDF4',
    borderColor: isDarkMode ? 'rgba(22, 163, 74, 0.3)' : '#DCFCE7',
  },
  spaceOccupied: {
    backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2',
    borderColor: isDarkMode ? 'rgba(220, 38, 38, 0.3)' : '#FEE2E2',
  },
  spaceBooked: {
    backgroundColor: isDarkMode ? 'rgba(234, 179, 8, 0.1)' : '#FFFBEB',
    borderColor: isDarkMode ? 'rgba(234, 179, 8, 0.3)' : '#FEF3C7',
  },
  spaceSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  spaceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  spaceNumberOccupied: {
    color: colors.textLight,
  },
  spaceStatusIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  spaceDetails: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
  },
  spaceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spaceDetailLabel: {
    fontSize: 12,
    color: colors.textLight,
    width: 50,
  },
  spaceDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  spaceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editSpaceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginRight: 4,
    borderRadius: 4,
    backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.1)' : '#EFF6FF',
  },
  editSpaceText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
  },
  deleteSpaceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2',
  },
  deleteSpaceText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.error,
    marginLeft: 4,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: colors.text,
  },
  formInput: {
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
    color: colors.text,
  },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusOptionSelected: {
    backgroundColor: colors.success,
  },
  statusOptionSelectedOccupied: {
    backgroundColor: colors.error,
  },
  statusOptionSelectedBooked: {
    backgroundColor: colors.accent,
  },
  statusOptionIcon: {
    marginRight: 4,
  },
  statusOptionText: {
    color: colors.textLight,
    fontWeight: '500',
    fontSize: 12,
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
    marginRight: 12,
  },
  cancelButtonText: {
    color: colors.textLight,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default ParkingSpaceAdminPanel;