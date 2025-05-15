// app/screens/admin/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { signOut, getCurrentUser } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../../../src/firebase/types';
import { useNavigation } from '@react-navigation/native';

export default function AdminProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // States for password change modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // States for staff management modal
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  
  // States for system logs modal
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  
  // States for system settings modal
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setDisplayName(currentUser.displayName || '');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from the admin account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await signOut();
              // The auth state listener in App.tsx will handle the navigation
            } catch (err) {
              console.error('Error signing out:', err);
              Alert.alert('Error', 'Failed to sign out');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real app, you would update Firebase Auth and Firestore
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      if (user) {
        const updatedUser = {
          ...user,
          displayName: displayName.trim(),
        };
        setUser(updatedUser);
        
        // In a real app, you would call something like:
        // await updateUserProfile(updatedUser);
      }
      
      setIsEditingName(false);
      Alert.alert('Success', 'Display name updated successfully');
    } catch (err) {
      console.error('Error updating display name:', err);
      Alert.alert('Error', 'Failed to update display name');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePassword = () => {
    // Reset the password form fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    
    // Show the password change modal
    setPasswordModalVisible(true);
  };
  
  const handleSavePassword = async () => {
    // Basic validation
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would call Firebase Auth to update the password
      // await updatePassword(currentPassword, newPassword);
      
      setPasswordModalVisible(false);
      Alert.alert('Success', 'Password updated successfully');
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('Failed to update password. Please check your current password and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleManageStaff = () => {
    // For now, just show a simple modal
    setStaffModalVisible(true);
    
    // In a full implementation, you might navigate to a staff management screen
    // navigation.navigate('StaffManagement');
  };
  
  const handleViewSystemLogs = () => {
    // For now, just show a simple modal
    setLogsModalVisible(true);
    
    // In a full implementation, you might navigate to a logs screen
    // navigation.navigate('SystemLogs');
  };
  
  const handleSystemSettings = () => {
    // For now, just show a simple modal
    setSettingsModalVisible(true);
    
    // In a full implementation, you might navigate to a settings screen
    // navigation.navigate('SystemSettings');
  };
  
  const handleHelpCenter = () => {
    // Navigate to the help center screen
    navigation.navigate('HelpCenter' as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load user profile</Text>
      </View>
    );
  }

  // Extract staff ID from email (for admin users)
  const staffId = user.email?.split('@')[0] || 'Admin';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : staffId.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              {isEditingName ? (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveButton]}
                      onPress={handleSaveDisplayName}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelButton]}
                      onPress={() => {
                        setDisplayName(user.displayName || '');
                        setIsEditingName(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.nameContainer}>
                  <Text style={styles.nameText}>
                    {user.displayName || 'Administrator'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.emailText}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Staff ID</Text>
              <Text style={styles.menuItemValue}>{staffId}</Text>
            </View>
          </View>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Email</Text>
              <Text style={styles.menuItemValue}>{user.email}</Text>
            </View>
          </View>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Last Login</Text>
              <Text style={styles.menuItemValue}>
                {user.lastLoginAt 
                  ? new Date(user.lastLoginAt).toLocaleString() 
                  : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleChangePassword}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleManageStaff}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Manage Staff Accounts</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleViewSystemLogs}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>View System Logs</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>System</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleSystemSettings}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>System Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleHelpCenter}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Admin Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {passwordError && (
                <View style={styles.errorMessageContainer}>
                  <Text style={styles.errorMessageText}>{passwordError}</Text>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSavePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Staff Management Modal */}
      <Modal
        visible={staffModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Staff Accounts</Text>
              <TouchableOpacity
                onPress={() => setStaffModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                This feature will allow you to manage staff accounts, including creating new admin and worker accounts, 
                editing permissions, and deactivating accounts as needed.
              </Text>
              
              <View style={styles.featureCard}>
                <Ionicons name="people" size={28} color={colors.primary} />
                <Text style={styles.featureCardTitle}>Staff Management</Text>
                <Text style={styles.featureCardDescription}>
                  Feature under development. This will allow you to manage all staff accounts in one place.
                </Text>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setStaffModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* System Logs Modal */}
      <Modal
        visible={logsModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>System Logs</Text>
              <TouchableOpacity
                onPress={() => setLogsModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                This feature will allow you to view system logs, including user actions, system events, 
                and error reports.
              </Text>
              
              <View style={styles.featureCard}>
                <Ionicons name="document-text" size={28} color={colors.primary} />
                <Text style={styles.featureCardTitle}>System Logging</Text>
                <Text style={styles.featureCardDescription}>
                  Feature under development. This will provide detailed system logs for monitoring and troubleshooting.
                </Text>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setLogsModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* System Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>System Settings</Text>
              <TouchableOpacity
                onPress={() => setSettingsModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                This feature will allow you to configure system-wide settings for the LanesParking application.
              </Text>
              
              <View style={styles.featureCard}>
                <Ionicons name="settings" size={28} color={colors.primary} />
                <Text style={styles.featureCardTitle}>System Configuration</Text>
                <Text style={styles.featureCardDescription}>
                  Feature under development. This will provide administrative controls for configuring the parking system.
                </Text>
              </View>
              
              {/* Simple setting toggle example */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemContent}>
                  <Text style={styles.settingTitle}>Enable Notifications</Text>
                  <Text style={styles.settingDescription}>Send push notifications for system events</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.toggleSwitch, styles.toggleSwitchOn]}
                  onPress={() => Alert.alert('Setting', 'Notification setting would be toggled')}
                >
                  <View style={[styles.toggleSwitchButton, styles.toggleSwitchButtonOn]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.settingItemContent}>
                  <Text style={styles.settingTitle}>Auto-cancel Bookings</Text>
                  <Text style={styles.settingDescription}>Cancel bookings after 30 minutes if user doesn't arrive</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.toggleSwitch, styles.toggleSwitchOn]}
                  onPress={() => Alert.alert('Setting', 'Auto-cancel setting would be toggled')}
                >
                  <View style={[styles.toggleSwitchButton, styles.toggleSwitchButtonOn]} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.md,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444', // Red for admin
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameText: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.xs,
  },
  editNameButton: {
    padding: spacing.xs,
  },
  editNameContainer: {
    marginBottom: spacing.xs,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSizes.md,
    marginBottom: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
  },
  editButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: colors.text,
  },
  emailText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    backgroundColor: '#FEE2E2', // Light red for admin
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: '#DC2626', // Red text for admin
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  menuItemValue: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  signOutButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  signOutButtonText: {
    color: '#DC2626',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 420,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
  },
  modalDescription: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: spacing.sm,
  },
  modalCancelButtonText: {
    color: colors.textLight,
    fontWeight: '500',
  },
  modalSaveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
  },
  errorMessageContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorMessageText: {
    color: '#DC2626',
    fontSize: fontSizes.sm,
  },
  featureCard: {
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  featureCardTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  featureCardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItemContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  settingDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleSwitchOn: {
    backgroundColor: colors.primary,
  },
  toggleSwitchOff: {
    backgroundColor: '#E5E7EB',
  },
  toggleSwitchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  toggleSwitchButtonOn: {
    marginLeft: 'auto',
  },
  toggleSwitchButtonOff: {
    marginLeft: 0,
  },
});