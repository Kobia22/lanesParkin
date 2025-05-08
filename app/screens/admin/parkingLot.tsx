// app/screens/admin/ParkingLotAdminPanel.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { fetchParkingLots, addParkingLot, updateParkingLot, deleteParkingLot, addParkingSpace } from '../../../src/firebase/database';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { ParkingLot, ParkingSpace } from '../../../src/firebase/types';

interface ParkingLotFormData {
  name: string;
  location: string;
  totalSpaces: string;
  availableSpaces: string;
  occupiedSpaces: string;
  bookedSpaces: string;
}

export default function ParkingLotAdminPanel() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLot, setEditingLot] = useState<ParkingLot | null>(null);
  const [formData, setFormData] = useState<ParkingLotFormData>({
    name: '',
    location: '',
    totalSpaces: '0',
    availableSpaces: '0',
    occupiedSpaces: '0',
    bookedSpaces: '0'
  });

  // Load parking lots on component mount
  useEffect(() => {
    loadParkingLots();
  }, []);

  // Function to load all parking lots
  const loadParkingLots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const lots = await fetchParkingLots();
      setParkingLots(lots);
    } catch (err) {
      console.error('Error fetching parking lots:', err);
      setError('Failed to load parking lots');
    } finally {
      setLoading(false);
    }
  };

  // Open modal to add a new lot
  const handleAddLot = () => {
    setEditingLot(null);
    setFormData({
      name: '',
      location: '',
      totalSpaces: '0',
      availableSpaces: '0',
      occupiedSpaces: '0',
      bookedSpaces: '0'
    });
    setModalVisible(true);
  };

  // Open modal to edit an existing lot
  const handleEditLot = (lot: ParkingLot) => {
    setEditingLot(lot);
    setFormData({
      name: lot.name,
      location: lot.location,
      totalSpaces: lot.totalSpaces.toString(),
      availableSpaces: lot.availableSpaces.toString(),
      occupiedSpaces: lot.occupiedSpaces.toString(),
      bookedSpaces: lot.bookedSpaces.toString()
    });
    setModalVisible(true);
  };

  // Save form data (either create or update)
  const handleSaveForm = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      setSaving(true);

      // Form validation
      if (!formData.name.trim()) {
        setError('Please enter a lot name');
        setSaving(false);
        return;
      }

      if (!formData.location.trim()) {
        setError('Please enter a location');
        setSaving(false);
        return;
      }

      const totalSpaces = parseInt(formData.totalSpaces);
      if (isNaN(totalSpaces) || totalSpaces < 0) {
        setError('Please enter a valid number of total spaces');
        setSaving(false);
        return;
      }

      // Prepare data object
      const lotData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        totalSpaces: totalSpaces,
        availableSpaces: parseInt(formData.availableSpaces) || totalSpaces,
        occupiedSpaces: parseInt(formData.occupiedSpaces) || 0,
        bookedSpaces: parseInt(formData.bookedSpaces) || 0
      };

      if (editingLot) {
        // Update existing lot
        await updateParkingLot(editingLot.id, lotData);
        setSuccessMessage('Parking lot updated successfully');
        
        // Update local state
        setParkingLots(prev => 
          prev.map(lot => lot.id === editingLot.id ? { ...lot, ...lotData } : lot)
        );
      } else {
        // Create new lot
        const newLot = await addParkingLot(lotData);
        setSuccessMessage('Parking lot added successfully');
        
        // Create initial parking spaces
        for (let i = 1; i <= totalSpaces; i++) {
          await addParkingSpace({
            lotId: newLot.id,
            number: i,
            isOccupied: false,
            currentBookingId: null
          });
        }
        
        // Update local state
        setParkingLots(prev => [...prev, newLot]);
      }

      // Close modal after success
      setModalVisible(false);
    } catch (err) {
      console.error('Error saving parking lot:', err);
      setError('Failed to save parking lot');
    } finally {
      setSaving(false);
    }
  };

  // Delete a parking lot
  const handleDeleteLot = (lot: ParkingLot) => {
    Alert.alert(
      'Delete Parking Lot',
      `Are you sure you want to delete ${lot.name}? This will also delete all spaces in this lot.`,
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
              await deleteParkingLot(lot.id);
              
              // Update local state
              setParkingLots(prev => prev.filter(item => item.id !== lot.id));
              
              setSuccessMessage('Parking lot deleted successfully');
            } catch (err) {
              console.error('Error deleting parking lot:', err);
              setError('Failed to delete parking lot');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Add test data
  const handleAddTestData = async () => {
    try {
      setSaving(true);
      
      const testLots = [
        { 
          name: 'Lot A', 
          location: 'North Wing', 
          totalSpaces: 10, 
          availableSpaces: 10,
          occupiedSpaces: 0,
          bookedSpaces: 0
        },
        { 
          name: 'Lot B', 
          location: 'South Wing', 
          totalSpaces: 10, 
          availableSpaces: 10,
          occupiedSpaces: 0,
          bookedSpaces: 0
        },
        { 
          name: 'Lot C', 
          location: 'East Wing', 
          totalSpaces: 10, 
          availableSpaces: 10,
          occupiedSpaces: 0,
          bookedSpaces: 0
        },
        { 
          name: 'Lot D', 
          location: 'West Wing', 
          totalSpaces: 10, 
          availableSpaces: 10,
          occupiedSpaces: 0,
          bookedSpaces: 0
        },
      ];
      
      for (const lotData of testLots) {
        const newLot = await addParkingLot(lotData);
        
        // Create parking spaces for each lot
        for (let i = 1; i <= lotData.totalSpaces; i++) {
          await addParkingSpace({
            lotId: newLot.id,
            number: i,
            isOccupied: false,
            currentBookingId: null
          });
        }
      }
      
      // Refresh the list
      await loadParkingLots();
      
      Alert.alert('Success', 'Test lots and spaces added successfully');
    } catch (err) {
      console.error('Error adding test data:', err);
      Alert.alert('Error', 'Failed to add test data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking Lots Management</Text>
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
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddLot}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add New Lot</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.testDataButton}
              onPress={handleAddTestData}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.testDataButtonText}>Add Test Data</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading parking lots...</Text>
            </View>
          ) : parkingLots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Parking Lots</Text>
              <Text style={styles.emptyText}>
                Add your first parking lot to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={parkingLots}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.lotCard}>
                  <View style={styles.lotHeader}>
                    <Text style={styles.lotName}>{item.name}</Text>
                    <View style={styles.lotActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditLot(item)}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteLot(item)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.lotLocation}>{item.location}</Text>
                  
                  <View style={styles.lotStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{item.totalSpaces}</Text>
                      <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.success }]}>
                        {item.availableSpaces}
                      </Text>
                      <Text style={styles.statLabel}>Available</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.error }]}>
                        {item.occupiedSpaces}
                      </Text>
                      <Text style={styles.statLabel}>Occupied</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.accent }]}>
                        {item.bookedSpaces}
                      </Text>
                      <Text style={styles.statLabel}>Booked</Text>
                    </View>
                  </View>
                  
                  <View style={styles.lotUtilization}>
                    <View 
                      style={[
                        styles.utilizationBar,
                        { width: `${(item.occupiedSpaces / item.totalSpaces) * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              )}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add/Edit Parking Lot Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLot ? 'Edit Parking Lot' : 'Add New Parking Lot'}
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
            
            <ScrollView style={styles.formScrollView}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Lot Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter lot name"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.location}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                  placeholder="Enter location"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Spaces</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.totalSpaces}
                  onChangeText={(text) => {
                    const totalSpaces = text ? parseInt(text) : 0;
                    setFormData(prev => ({ 
                      ...prev, 
                      totalSpaces: text,
                      // If creating a new lot, set available spaces to total spaces
                      availableSpaces: !editingLot ? totalSpaces.toString() : prev.availableSpaces
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="Enter total number of spaces"
                />
              </View>
              
              {editingLot && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Available Spaces</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.availableSpaces}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, availableSpaces: text }))}
                      keyboardType="numeric"
                      placeholder="Enter available spaces"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Occupied Spaces</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.occupiedSpaces}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, occupiedSpaces: text }))}
                      keyboardType="numeric"
                      placeholder="Enter occupied spaces"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Booked Spaces</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.bookedSpaces}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, bookedSpaces: text }))}
                      keyboardType="numeric"
                      placeholder="Enter booked spaces"
                    />
                  </View>
                </>
              )}
            </ScrollView>
            
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
                    {editingLot ? 'Update' : 'Create'}
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
  testDataButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  testDataButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center',
  },
  lotCard: {
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
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lotName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  lotActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  lotLocation: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  lotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  lotUtilization: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  utilizationBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
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
  formScrollView: {
    padding: spacing.md,
    maxHeight: 400,
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