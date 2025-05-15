// app/screens/worker/completeBookings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { 
  completeBooking,
  updateBookingStatus
} from '../../../src/firebase/database';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, User } from '../../../src/firebase/types';
import { useTheme } from '../../context/themeContext';

export default function CompleteBookingsScreen() {
  const { colors, isDarkMode } = useTheme();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  
  // New state for payment confirmation modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  
  // Mock active bookings for demonstration
  // In a real app, these would come from the database
  const mockActiveBookings: Booking[] = [
    {
      id: 'booking1',
      userId: 'user1',
      userEmail: 'student@students.jkuat.ac.ke',
      userRole: 'student',
      lotId: 'lot1',
      lotName: 'Lot A',
      spaceId: 'space1',
      spaceNumber: 5,
      status: 'occupied',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      endTime: null,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours in future
      vehicleInfo: 'KCA 123Y',
      paymentStatus: 'pending',
      paymentAmount: 200,
      billingType: 'student_fixed',
      billingRate: 200
    },
    {
      id: 'booking2',
      userId: 'user2',
      userEmail: 'guest@example.com',
      userRole: 'guest',
      lotId: 'lot1',
      lotName: 'Lot A',
      spaceId: 'space2',
      spaceNumber: 10,
      status: 'occupied',
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      endTime: null,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours in future
      vehicleInfo: 'KBZ 567X',
      paymentStatus: 'pending',
      paymentAmount: 100,
      billingType: 'guest_hourly',
      billingRate: 50
    },
    {
      id: 'booking3',
      userId: 'user3',
      userEmail: 'guest2@gmail.com',
      userRole: 'guest',
      lotId: 'lot2',
      lotName: 'Lot B',
      spaceId: 'space15',
      spaceNumber: 15,
      status: 'occupied',
      startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      endTime: null,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours in future
      vehicleInfo: 'KDJ 432P',
      paymentStatus: 'pending',
      paymentAmount: 0, // Will be free (under 30 mins for guest)
      billingType: 'guest_hourly',
      billingRate: 50
    }
  ];
  
  // Load active bookings
  const loadBookings = useCallback(() => {
    try {
      setError(null);
      setLoading(true);
      
      // In a real app, you'd fetch these from the database
      setActiveBookings(mockActiveBookings);
      applySearchFilter(mockActiveBookings, searchQuery);
      
    } catch (err) {
      console.error('Error fetching active bookings:', err);
      setError('Failed to load active bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);
  
  // Apply search filter
  const applySearchFilter = (bookings: Booking[], query: string) => {
    if (!query.trim()) {
      setFilteredBookings(bookings);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = bookings.filter(booking => 
      booking.userEmail.toLowerCase().includes(lowerQuery) ||
      (booking.vehicleInfo?.toLowerCase() || '').includes(lowerQuery) ||
      booking.id.toLowerCase().includes(lowerQuery) ||
      booking.lotName.toLowerCase().includes(lowerQuery) ||
      booking.spaceNumber.toString().includes(lowerQuery)
    );
    
    setFilteredBookings(filtered);
  };
  
  // Handle search input change
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applySearchFilter(activeBookings, text);
  };

  useEffect(() => {
    loadBookings();
    
    // Set up polling to refresh bookings every minute
    const pollInterval = setInterval(() => {
      loadBookings();
    }, 60000);
    
    return () => clearInterval(pollInterval);
  }, [loadBookings]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Calculate final payment amount
  const calculateFinalAmount = (booking: Booking): number => {
    let finalAmount = booking.paymentAmount;
    
    if (booking.userRole === 'guest') {
      // Calculate actual duration
      const startTime = new Date(booking.startTime);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // First 30 minutes are free
      if (durationHours <= 0.5) {
        finalAmount = 0;
      } else {
        // Calculate billable hours (after free period)
        const billableHours = durationHours - 0.5;
        
        // Round up to next hour
        const roundedHours = Math.ceil(billableHours);
        
        // Calculate cost
        finalAmount = roundedHours * booking.billingRate;
      }
    }
    
    return finalAmount;
  };

  // Handle booking completion
  const handleCompleteBooking = (booking: Booking) => {
    // Calculate the final amount
    const finalAmount = calculateFinalAmount(booking);
    
    // Store the current booking and calculated amount
    setCurrentBooking(booking);
    setCalculatedAmount(finalAmount);
    
    // Reset payment information
    setPaymentReceived(false);
    setPaymentMethod('cash');
    setPaymentNote('');
    
    // Show the payment confirmation modal
    setPaymentModalVisible(true);
  };

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!currentBooking) return;
    
    try {
      setProcessingBooking(currentBooking.id);
      
      // In a real app, you'd call the API function
      // await completeBooking(currentBooking.id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setActiveBookings(prev => prev.filter(b => b.id !== currentBooking.id));
      applySearchFilter(
        activeBookings.filter(b => b.id !== currentBooking.id), 
        searchQuery
      );
      
      // Close the modal
      setPaymentModalVisible(false);
      
      // Show success message
      Alert.alert(
        'Payment Complete',
        `Payment of KSH ${calculatedAmount} has been processed. Space #${currentBooking.spaceNumber} is now available.`,
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      console.error('Error completing booking:', err);
      Alert.alert('Error', 'Failed to complete booking');
    } finally {
      setProcessingBooking(null);
    }
  };

  // Calculate booking duration
  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const durationMs = now.getTime() - start.getTime();
    
    // Convert to hours and minutes
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Estimate cost based on duration
  const estimateCost = (booking: Booking) => {
    if (booking.userRole === 'student') {
      return `KSH ${booking.billingRate} (fixed)`;
    } else {
      const startTime = new Date(booking.startTime);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      
      // Convert to hours
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // First 30 minutes are free
      if (durationHours <= 0.5) {
        return 'Free (under 30 min)';
      }
      
      // Calculate billable hours (after free period)
      const billableHours = durationHours - 0.5;
      
      // Round up to next hour
      const roundedHours = Math.ceil(billableHours);
      
      // Calculate cost
      const cost = roundedHours * booking.billingRate;
      
      return `KSH ${cost}`;
    }
  };
  
  // Render booking card
  const renderBookingCard = ({ item }: { item: Booking }) => {
    const duration = calculateDuration(item.startTime);
    const estimatedCost = estimateCost(item);
    
    return (
      <View style={[styles.bookingCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }]}>
        <View style={[styles.bookingHeader, { 
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6'
        }]}>
          <View>
            <Text style={[styles.bookingIdText, { color: colors.textLight }]}>ID: {item.id.substring(0, 8)}...</Text>
            <Text style={[styles.spaceInfoText, { color: colors.text }]}>{item.lotName} - Space #{item.spaceNumber}</Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            item.status === 'occupied' ? styles.occupiedBadge : styles.pendingBadge
          ]}>
            <Text style={styles.statusText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.userInfoContainer}>
            <Ionicons name="person" size={18} color={colors.textLight} style={styles.infoIcon} />
            <Text style={[styles.userInfoText, { color: colors.text }]}>{item.userEmail}</Text>
          </View>
          
          <View style={styles.userInfoContainer}>
            <Ionicons name="car" size={18} color={colors.textLight} style={styles.infoIcon} />
            <Text style={[styles.userInfoText, { color: colors.text }]}>{item.vehicleInfo || 'No vehicle info'}</Text>
          </View>
          
          <View style={styles.costContainer}>
            <View style={styles.costItem}>
              <Text style={[styles.costLabel, { color: colors.textLight }]}>Duration:</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>{duration}</Text>
            </View>
            
            <View style={styles.costItem}>
              <Text style={[styles.costLabel, { color: colors.textLight }]}>Est. Cost:</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>{estimatedCost}</Text>
            </View>
            
            <View style={styles.costItem}>
              <Text style={[styles.costLabel, { color: colors.textLight }]}>Type:</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>
                {item.userRole === 'student' ? 'Student (Fixed)' : 'Guest (Hourly)'}
              </Text>
            </View>
          </View>
          
          <View style={styles.bookingActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.completeButton
              ]}
              onPress={() => handleCompleteBooking(item)}
              disabled={processingBooking === item.id}
            >
              {processingBooking === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={18} color="#FFFFFF" style={styles.actionIcon} />
                  <Text style={styles.actionButtonText}>Process Payment & Checkout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>Complete Bookings</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by vehicle, email, or space number"
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textLight }]}>
                Loading active bookings...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Bookings</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                There are currently no active bookings that need to be completed.
              </Text>
            </View>
          )
        }
        contentContainerStyle={
          filteredBookings.length === 0 ? { flex: 1 } : styles.listContent
        }
      />

      <View style={[styles.infoContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>Pricing Information:</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          • Students pay a fixed rate of KSH 200 per day
        </Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          • Guests pay KSH 50 per hour (first 30 minutes free)
        </Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          • Payment is processed when a booking is completed
        </Text>
      </View>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Confirmation</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setPaymentModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {currentBooking && (
              <View style={styles.modalContent}>
                <View style={styles.bookingSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Space:</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {currentBooking.lotName} - #{currentBooking.spaceNumber}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Vehicle:</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {currentBooking.vehicleInfo || 'Not specified'}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>User:</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {currentBooking.userEmail}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Duration:</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {calculateDuration(currentBooking.startTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Type:</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {currentBooking.userRole === 'student' ? 'Student (Fixed)' : 'Guest (Hourly)'}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.amountContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
                  <Text style={[styles.amountLabel, { color: colors.text }]}>Total Amount Due:</Text>
                  <Text style={[styles.amountValue, { color: calculatedAmount === 0 ? colors.success : colors.text }]}>
                    {calculatedAmount === 0 ? 'FREE' : `KSH ${calculatedAmount.toFixed(2)}`}
                  </Text>
                  {calculatedAmount === 0 && (
                    <Text style={styles.freeExplanation}>
                      (Under 30 minutes - Free parking)
                    </Text>
                  )}
                </View>
                
                {calculatedAmount > 0 && (
                  <View style={styles.paymentMethodContainer}>
                    <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>Payment Method:</Text>
                    
                    <View style={styles.paymentOptions}>
                      <TouchableOpacity 
                        style={[
                          styles.paymentMethodButton, 
                          paymentMethod === 'cash' && [
                            styles.selectedPaymentMethod,
                            { backgroundColor: `${colors.primary}20` }
                          ]
                        ]}
                        onPress={() => setPaymentMethod('cash')}
                      >
                        <Ionicons 
                          name="cash-outline" 
                          size={24} 
                          color={paymentMethod === 'cash' ? colors.primary : colors.textLight} 
                        />
                        <Text style={[
                          styles.paymentMethodText,
                          { color: paymentMethod === 'cash' ? colors.primary : colors.textLight }
                        ]}>
                          Cash
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.paymentMethodButton, 
                          paymentMethod === 'mpesa' && [
                            styles.selectedPaymentMethod,
                            { backgroundColor: `${colors.primary}20` }
                          ]
                        ]}
                        onPress={() => setPaymentMethod('mpesa')}
                      >
                        <Ionicons 
                          name="phone-portrait-outline" 
                          size={24} 
                          color={paymentMethod === 'mpesa' ? colors.primary : colors.textLight} 
                        />
                        <Text style={[
                          styles.paymentMethodText,
                          { color: paymentMethod === 'mpesa' ? colors.primary : colors.textLight }
                        ]}>
                          M-Pesa
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.paymentMethodButton, 
                          paymentMethod === 'card' && [
                            styles.selectedPaymentMethod,
                            { backgroundColor: `${colors.primary}20` }
                          ]
                        ]}
                        onPress={() => setPaymentMethod('card')}
                      >
                        <Ionicons 
                          name="card-outline" 
                          size={24} 
                          color={paymentMethod === 'card' ? colors.primary : colors.textLight} 
                        />
                        <Text style={[
                          styles.paymentMethodText,
                          { color: paymentMethod === 'card' ? colors.primary : colors.textLight }
                        ]}>
                          Card
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.noteContainer}>
                      <Text style={[styles.noteLabel, { color: colors.text }]}>Notes (optional):</Text>
                      <TextInput
                        style={[
                          styles.noteInput, 
                          { 
                            borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                            color: colors.text
                          }
                        ]}
                        placeholder="Payment reference, transaction ID, etc."
                        placeholderTextColor={colors.textLight}
                        value={paymentNote}
                        onChangeText={setPaymentNote}
                        multiline={true}
                      />
                    </View>
                    
                    <View style={styles.paymentCheckContainer}>
                      <TouchableOpacity
                        style={styles.paymentCheckbox}
                        onPress={() => setPaymentReceived(!paymentReceived)}
                      >
                        <View style={[
                          styles.checkbox,
                          paymentReceived && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}>
                          {paymentReceived && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                          I confirm that payment has been received
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setPaymentModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.confirmButton,
                      (!paymentReceived && calculatedAmount > 0) && styles.disabledButton
                    ]}
                    onPress={handleConfirmPayment}
                    disabled={!paymentReceived && calculatedAmount > 0}
                  >
                    <Text style={styles.confirmButtonText}>
                      {calculatedAmount === 0 ? 'Complete (Free)' : 'Confirm Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: spacing.md,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
  },
  errorContainer: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: spacing.md,
    textAlign: 'center',
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
  listContent: {
    padding: spacing.md,
  },
  bookingCard: {
    borderRadius: 10,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  bookingIdText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  spaceInfoText: {
    fontSize: fontSizes.sm,
  },
  statusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  occupiedBadge: {
    backgroundColor: '#FEE2E2',
  },
  pendingBadge: {
    backgroundColor: '#E0F2F1',
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.text,
  },
  bookingDetails: {
    padding: spacing.md,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  userInfoText: {
    fontSize: fontSizes.sm,
    flex: 1,
  },
  costContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  costLabel: {
    fontSize: fontSizes.sm,
  },
  costValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  bookingActions: {
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  infoContainer: {
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
  },
  bookingSummary: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    width: 80,
  },
  summaryValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  amountContainer: {
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSizes.md,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: fontSizes.xl * 1.5,
    fontWeight: 'bold',
  },
  freeExplanation: {
    fontSize: fontSizes.sm,
    color: colors.success,
    marginTop: spacing.xs,
  },
  paymentMethodContainer: {
    marginBottom: spacing.md,
  },
  paymentMethodTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  paymentMethodButton: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedPaymentMethod: {
    borderColor: colors.primary,
  },
  paymentMethodText: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
  },
  noteContainer: {
    marginBottom: spacing.md,
  },
  noteLabel: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentCheckContainer: {
    marginBottom: spacing.md,
  },
  paymentCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: fontSizes.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: spacing.sm,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    opacity: 0.7,
  },
});