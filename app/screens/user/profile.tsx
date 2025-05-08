
// app/screens/user/profile.tsx
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
  Switch,
  Image,
  Platform,
} from 'react-native';
import { signOut, getCurrentUser } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../src/firebase/firebaseConfig';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from '../../../src/firebase/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../navigators/userNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setDisplayName(currentUser.displayName || '');
          if (currentUser.profileImageUrl) {
            setProfileImage(currentUser.profileImageUrl);
          }
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

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return false;
      }
      return true;
    }
    return true;
  };

  const pickImage = async () => {
    const permissionGranted = await requestPermissions();
    
    if (!permissionGranted) return;

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        uploadProfileImage(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user) return;
    
    try {
      setUploadingImage(true);
      
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a reference to Firebase Storage
      const storage = getStorage();
      const filename = `profileImages/${user.id}_${new Date().getTime()}`;
      const storageRef = ref(storage, filename);
      
      // Upload the blob
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user document in Firestore
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        profileImageUrl: downloadURL
      });
      
      // Update local state
      setProfileImage(downloadURL);
      
      // Update user object
      if (user) {
        setUser({
          ...user,
          profileImageUrl: downloadURL
        });
      }
      
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', 'Failed to upload profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Update Firestore document
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        displayName: displayName
      });
      
      // Update local state
      setUser({
        ...user,
        displayName: displayName,
      });
      
      setIsEditingName(false);
      Alert.alert('Success', 'Display name updated successfully');
    } catch (err) {
      console.error('Error updating display name:', err);
      Alert.alert('Error', 'Failed to update display name');
    } finally {
      setLoading(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={styles.avatarWrapper}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.avatar}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.displayName
                      ? user.displayName.charAt(0).toUpperCase()
                      : user.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
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
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.usernameText}>
                @{user.displayName?.toLowerCase().replace(/\s+/g, '') || user.email?.split('@')[0]}
              </Text>
              <Text style={styles.emailText}>{user.email}</Text>
              <View style={[
                styles.roleBadge,
                { backgroundColor: user.role === 'student' ? colors.studentHighlight : colors.guestHighlight }
              ]}>
                <Text style={styles.roleText}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          
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
              <Text style={styles.menuItemTitle}>Joined</Text>
              <Text style={styles.menuItemValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Appearance</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIconContainer}>
              <Ionicons name="shield-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Privacy Policy</Text>
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
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  nameText: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.xs,
  },
  usernameText: {
    fontSize: fontSizes.md,
    color: colors.primary,
    marginBottom: spacing.xs / 2,
    fontWeight: '500',
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
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
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
});