// app/screens/admin/ParkingSpaceAdminPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
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
  deleteParkingSpace 
} from '../../../src/api/parkingService';import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { ParkingLot, ParkingSpace } from '../../../src/firebase/types';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';


type AdminStackParamList = {
  AdminDashboard: undefined;
  Analytics: undefined;
  ParkingLotAdminPanel: undefined;
  ParkingSpaceAdminPanel: { lotId: string | null };
  AdminProfile: undefined;
};

type ParkingSpaceAdminPanelProps = {
  navigation: StackNavigationProp<AdminStackParamList, 'ParkingSpaceAdminPanel'>;
  route: RouteProp<AdminStackParamList, 'ParkingSpaceAdminPanel'>;
};

interface SpaceFormData {
  number: string;
  isOccupied: boolean;
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
    isOccupied: false
  });
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);

  // Load parking lots and spaces on component mount
  useEffect(() => {
    loadParkingLots();
  }, []);

  // Handle route params if a specific lot is selected
  useEffect(() => {
    if (route.params?.lotId) {
      const lotId = route.params.lotId;
      
      // Set the selected lot and load its spaces
      if (lots.length > 0) {
        const lot = lots.find(l => l.id === lotId);
        if (lot) {
          setSelectedLot(lot);
          loadParkingSpaces(lot.id);
        }
      }
    }
  }, [route.params?.lotId, lots]);

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
    } catch (err) {
      console.error('Error fetching parking spaces:', err);
      setError('Failed to load parking spaces');
    } finally {
      setLoading(false);
    }
  };

  // Handler for selecting a lot
  const handleLotSelect = (lot: ParkingLot) => {
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
    setFormData({
      number: '',
      isOccupied: false
    });
    setModalVisible(true);
  };

  // Open modal to edit an existing space
  const handleEditSpace = (space: ParkingSpace) => {
    setEditingSpace(space);
    setFormData({
      number: space.number.toString(),
      isOccupied: space.isOccupied
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
        const existingSpace = spaces.find(s => s.number === spaceNumber);
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
        isOccupied: formData.isOccupied,
        currentBookingId: editingSpace?.currentBookingId || null
      };

      if (editingSpace) {
        // Update existing space
        await updateParkingSpace(editingSpace.id, spaceData);
        setSuccessMessage('Parking space updated successfully');
        
        // Update local state
        setSpaces(prev => 
          prev.map(space => space.id === editingSpace.id ? { ...space, ...spaceData } : space)
        );
      } else {
        // Create new space
        const newSpace = await addParkingSpace(spaceData);
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
      setError('Failed to save parking space');
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
              await deleteParkingSpace(space.id);
              
              // Update local state
              setSpaces(prev => prev.filter(item => item.id !== space.id));
              
              // Also update the lot's total spaces count
              if (selectedLot) {
                const updatedLot = {
                  ...selectedLot,
                  totalSpaces: selectedLot.totalSpaces - 1,
                  availableSpaces: space.isOccupied ? selectedLot.availableSpaces : selectedLot.availableSpaces - 1
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
              setError('Failed to delete parking space');
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
              setSaving(true);
              
              // Find the highest existing space number
              let highestNumber = 0;
              spaces.forEach(space => {
                if (space.number > highestNumber) {
                  highestNumber = space.number;
                }
              });
              
              // Create new spaces starting from the next number
              const newSpaces: ParkingSpace[] = [];
              for (let i = 1; i <= count; i++) {
                const spaceNumber = highestNumber + i;
                const spaceData = {
                  lotId: selectedLot.id,
                  number: spaceNumber,
                  isOccupied: false,
                  currentBookingId: null
                };
                
                const newSpace = await addParkingSpace(spaceData);
                newSpaces.push(newSpace);
              }
              
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
              setError('Failed to generate parking spaces');
            } finally {
              setSaving(false);
            }
          }
        }
      ],
      'plain-text',
      ''
    );
  };

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
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Space</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerateSpaces}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="layers" size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>Generate Multiple</Text>
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
                  <FlatList
                    data={spaces}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.spaceCard}>
                        <TouchableOpacity
                          style={styles.spaceHeader}
                          onPress={() => toggleSpaceDetails(item.id)}
                        >
                          <View style={styles.spaceInfo}>
                            <Text style={styles.spaceNumber}>Space #{item.number}</Text>
                            <View style={[
                              styles.statusBadge,
                              item.isOccupied ? styles.occupiedBadge : styles.availableBadge
                            ]}>
                              <Text style={[
                                styles.statusText,
                                item.isOccupied ? styles.occupiedText : styles.availableText
                              ]}>
                                {item.isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
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
                                item.isOccupied ? { color: colors.error } : { color: colors.success }
                              ]}>
                                {item.isOccupied ? 'Occupied' : 'Available'}
                              </Text>
                            </View>
                            
                            {item.currentBookingId && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Current Booking:</Text>
                                <Text style={styles.detailValue}>{item.currentBookingId}</Text>
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
                    )}
                    numColumns={1}
                    contentContainerStyle={styles.spacesList}
                  />
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
                        !formData.isOccupied && styles.statusOptionSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, isOccupied: false }))}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        !formData.isOccupied && styles.statusOptionTextSelected
                      ]}>
                        Available
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        formData.isOccupied && styles.statusOptionSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, isOccupied: true }))}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        formData.isOccupied && styles.statusOptionTextSelected
                      ]}>
                        Occupied
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
    },
    generateButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      marginLeft: spacing.xs,
    },
    spacesContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      padding: spacing.md,
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
      paddingBottom: spacing.sm,
    },
    spaceCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      marginBottom: spacing.md,
      overflow: 'hidden',
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
    occupiedBadge: {
      backgroundColor: '#FEE2E2',
    },
    statusText: {
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
    },
    availableText: {
      color: colors.success,
    },
    occupiedText: {
      color: colors.error,
    },
    spaceDetails: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    detailRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    detailLabel: {
      width: 120,
      fontSize: fontSizes.sm,
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
      backgroundColor: colors.accent,
      borderRadius: 6,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    editButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: fontSizes.sm,
      marginLeft: spacing.xs,
    },
    deleteButton: {
      backgroundColor: colors.error,
      borderRadius: 6,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
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
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      overflow: 'hidden',
    },
    statusOption: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
    },
    statusOptionSelected: {
      backgroundColor: colors.primary,
    },
    statusOptionText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
    statusOptionTextSelected: {
      color: '#FFFFFF',
      fontWeight: 'bold',
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
    }
  });