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
  Platform
} from 'react-native';
import { 
  getAllParkingLots as fetchParkingLots, 
  getParkingSpaces as fetchParkingSpaces,
  createParkingSpace as addParkingSpace, 
  updateParkingSpace, 
  deleteParkingSpace,
  createMultipleParkingSpaces
} from '../../../src/api/parkingService';
import { colors, spacing, fontSizes } from '../../constants/theme';
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

export default function ParkingSpaceAdminPanel({ navigation, route }: ParkingSpaceAdminPanelProps) {
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
      } else {
        console.log(`Waiting for lots to load to select lot ID: ${lotId}`);
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
        
        // Also update the lot's total spaces count
        if (selectedLot) {
          const updatedLot = {
            ...selectedLot,
            totalSpaces: selectedLot.totalSpaces + 1,
            availableSpaces: selectedLot.availableSpaces + 1
          };
          setSelectedLot(updatedLot);
          
          // Update the lot in the lots array
          setLots(prev => 
            prev.map(lot => lot.id === selectedLot.id ? updatedLot : lot)
          );
        }
      }

      // Close modal after success
      setModalVisible(false);
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
              
              // Also update the lot's total spaces count
              if (selectedLot) {
                const updatedLot = {
                  ...selectedLot,
                  totalSpaces: selectedLot.totalSpaces - 1,
                  availableSpaces: space.status === 'vacant' ? selectedLot.availableSpaces - 1 : selectedLot.availableSpaces,
                  occupiedSpaces: space.status === 'occupied' ? selectedLot.occupiedSpaces - 1 : selectedLot.occupiedSpaces,
                  bookedSpaces: space.status === 'booked' ? selectedLot.bookedSpaces - 1 : selectedLot.bookedSpaces
                };
                setSelectedLot(updatedLot);
                
                // Update the lot in the lots array
                setLots(prev => 
                  prev.map(lot => lot.id === selectedLot.id ? updatedLot : lot)
                );
              }
              
              setSuccessMessage('Parking space deleted successfully');
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
              
              // Also update the lot's total spaces count
              if (selectedLot) {
                const updatedLot = {
                  ...selectedLot,
                  totalSpaces: selectedLot.totalSpaces + count,
                  availableSpaces: selectedLot.availableSpaces + count
                };
                setSelectedLot(updatedLot);
                
                // Update the lot in the lots array
                setLots(prev => 
                  prev.map(lot => lot.id === selectedLot.id ? updatedLot : lot)
                );
              }
              
              setSuccessMessage(`${count} parking spaces added successfully`);
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
  };

  // Render a space item - helper function for the spaces list
  const renderSpaceItem = (item: ParkingSpace) => (
    <View key={item.id} style={styles.spaceCard}>
      <TouchableOpacity
        style={styles.spaceHeader}
        onPress={() => toggleSpaceDetails(item.id)}
      >
        <View style={styles.spaceInfo}>
          <Text style={styles.spaceNumber}>Space #{item.number}</Text>
          <View style={[
            styles.statusBadge,
            item.status === 'occupied' ? styles.occupiedBadge : 
            item.status === 'booked' ? styles.bookedBadge : 
            styles.availableBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'occupied' ? styles.occupiedText : 
              item.status === 'booked' ? styles.bookedText : 
              styles.availableText
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <Ionicons 
          name={expandedSpace === item.id ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={colors.textLight} 
        />
      </TouchableOpacity>
      
      {expandedSpace === item.id && (
        <View style={styles.spaceDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[
              styles.detailValue,
              item.status === 'occupied' ? { color: colors.error } : 
              item.status === 'booked' ? { color: colors.accent } : 
              { color: colors.success }
            ]}>
              {item.status === 'occupied' ? 'Occupied' : 
               item.status === 'booked' ? 'Booked' : 
               'Available'}
            </Text>
          </View>
          
          {item.currentBookingId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Booking:</Text>
              <Text style={styles.detailValue}>{item.currentBookingId}</Text>
            </View>
          )}
          
          {item.userEmail && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User:</Text>
              <Text style={styles.detailValue}>{item.userEmail}</Text>
            </View>
          )}
          
          {item.vehicleInfo && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vehicle:</Text>
              <Text style={styles.detailValue}>{item.vehicleInfo}</Text>
            </View>
          )}
          
          {item.startTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Time:</Text>
              <Text style={styles.detailValue}>
                {new Date(item.startTime).toLocaleString()}
              </Text>
            </View>
          )}
          
          <View style={styles.spaceActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditSpace(item)}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSpace(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking Spaces Management</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.content}>
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
            <Text style={styles.sectionTitle}>Select a Parking Lot</Text>
            
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
                    <Text 
                      style={[
                        styles.lotSpacesText,
                        selectedLot?.id === lot.id && styles.selectedLotButtonText
                      ]}
                    >
                      {lot.totalSpaces} spaces
                    </Text>
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
                  <Text style={styles.addButtonText}>Add Space</Text>
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
                      <Text style={styles.generateButtonText}>Generate Multiple</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.spacesContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Parking Spaces</Text>
                  <Text style={styles.spacesCount}>
                    {spaces.length} spaces in {selectedLot.name}
                  </Text>
                </View>
                
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading parking spaces...</Text>
                  </View>
                ) : spaces.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No parking spaces in this lot</Text>
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={handleAddSpace}
                    >
                      <Text style={styles.emptyButtonText}>Add First Space</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Replace FlatList with direct rendering via map
                  <View style={styles.spacesList}>
                    {spaces.map(renderSpaceItem)}
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
                {editingSpace ? 'Edit Parking Space' : 'Add New Parking Space'}
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
                        formData.status === 'occupied' && styles.statusOptionSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'occupied' }))}
                    >
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
                        formData.status === 'booked' && styles.statusOptionSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'booked' }))}
                    >
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
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
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

const styles = StyleSheet.create({
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
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
  successContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.success,
  },
  lotSelectionContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  lotsList: {
    paddingBottom: spacing.sm,
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
  lotSpacesText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  generateButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
    marginRight: spacing.sm,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  refreshButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  spacesContainer: {
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
  spacesCount: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  spacesList: {
    paddingBottom: spacing.md,
  },
  spaceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  spaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  spaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceNumber: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.md,
  },
  statusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  availableBadge: {
    backgroundColor: '#DCFCE7',
  },
  bookedBadge: {
    backgroundColor: '#FEF3C7',
  },
  occupiedBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  availableText: {
    color: '#16A34A',
  },
  bookedText: {
    color: '#D97706',
  },
  occupiedText: {
    color: '#DC2626',
  },
  spaceDetails: {
    padding: spacing.md,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    width: 100,
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.textLight,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  spaceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    marginLeft: spacing.xs,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    marginLeft: spacing.xs,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    backgroundColor: '#F9FAFB',
  },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  statusOptionText: {
    color: colors.textLight,
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: spacing.md,
  },
  cancelButtonText: {
    color: colors.textLight,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
 saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});