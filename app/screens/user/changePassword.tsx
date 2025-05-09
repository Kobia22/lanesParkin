// app/screens/user/changePassword.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { changeUserPassword } from '../../../src/firebase/auth';
import { spacing, fontSizes } from '../../constants/theme';
import { useTheme } from '../../context/themeContext';

type Props = {
  navigation: any;
};

export default function ChangePasswordScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Password validation states
  const [isLengthValid, setIsLengthValid] = useState(false);
  const [hasUpperCase, setHasUpperCase] = useState(false);
  const [hasLowerCase, setHasLowerCase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  
  // Validate password as user types
  const validatePassword = (password: string) => {
    setIsLengthValid(password.length >= 8);
    setHasUpperCase(/[A-Z]/.test(password));
    setHasLowerCase(/[a-z]/.test(password));
    setHasNumber(/[0-9]/.test(password));
  };
  
  // Check if passwords match
  const checkPasswordsMatch = () => {
    setPasswordsMatch(newPassword === confirmPassword && newPassword !== '');
  };
  
  // Update validation when password changes
  React.useEffect(() => {
    validatePassword(newPassword);
    checkPasswordsMatch();
  }, [newPassword, confirmPassword]);
  
  const handleChangePassword = async () => {
    // Validate all inputs are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Check if new password meets requirements
    if (!isLengthValid || !hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert('Error', 'New password does not meet requirements');
      return;
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    // Confirm password change with user
    Alert.alert(
      'Confirm Password Change',
      'Are you sure you want to change your password?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Change Password',
          onPress: async () => {
            try {
              setLoading(true);
              await changeUserPassword(currentPassword, newPassword);
              Alert.alert(
                'Success',
                'Your password has been updated successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Password change error:', error);
              
              // Handle specific error cases
              if (error.code === 'auth/wrong-password') {
                Alert.alert('Error', 'Current password is incorrect');
              } else if (error.code === 'auth/weak-password') {
                Alert.alert('Error', 'New password is too weak');
              } else {
                Alert.alert('Error', 'Failed to change password. Please try again.');
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.formContainer, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Security First</Text>
            <Text style={[styles.description, { color: colors.textLight }]}>
              To change your password, please first verify your current password
              and then enter a new strong password.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password</Text>
              <View style={[styles.passwordInputWrapper, { 
                borderColor: colors.borderColor,
                backgroundColor: isDarkMode ? colors.cardBackground : '#F9FAFB'
              }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
              <View style={[styles.passwordInputWrapper, { 
                borderColor: colors.borderColor,
                backgroundColor: isDarkMode ? colors.cardBackground : '#F9FAFB'
              }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    validatePassword(text);
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
              <View style={[styles.passwordInputWrapper, { 
                borderColor: colors.borderColor,
                backgroundColor: isDarkMode ? colors.cardBackground : '#F9FAFB'
              }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.requirementsContainer, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
              borderColor: colors.borderColor 
            }]}>
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>Password Requirements:</Text>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={isLengthValid ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={isLengthValid ? colors.success : colors.error}
                />
                <Text style={[
                  styles.requirementText,
                  { color: isLengthValid ? colors.success : colors.error }
                ]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={hasUpperCase ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={hasUpperCase ? colors.success : colors.error}
                />
                <Text style={[
                  styles.requirementText,
                  { color: hasUpperCase ? colors.success : colors.error }
                ]}>
                  At least one uppercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={hasLowerCase ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={hasLowerCase ? colors.success : colors.error}
                />
                <Text style={[
                  styles.requirementText,
                  { color: hasLowerCase ? colors.success : colors.error }
                ]}>
                  At least one lowercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={hasNumber ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={hasNumber ? colors.success : colors.error}
                />
                <Text style={[
                  styles.requirementText,
                  { color: hasNumber ? colors.success : colors.error }
                ]}>
                  At least one number
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={passwordsMatch ? colors.success : colors.error}
                />
                <Text style={[
                  styles.requirementText,
                  { color: passwordsMatch ? colors.success : colors.error }
                ]}>
                  Passwords match
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.changePasswordButton,
                {
                  backgroundColor: (isLengthValid && hasUpperCase && hasLowerCase && 
                    hasNumber && passwordsMatch && currentPassword) 
                    ? colors.primary 
                    : isDarkMode ? '#444444' : '#D1D5DB'
                }
              ]}
              onPress={handleChangePassword}
              disabled={
                !isLengthValid || 
                !hasUpperCase || 
                !hasLowerCase || 
                !hasNumber || 
                !passwordsMatch ||
                !currentPassword ||
                loading
              }
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.changePasswordButtonText}>
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: spacing.md,
  },
  formContainer: {
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSizes.md,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.md,
  },
  eyeIcon: {
    padding: spacing.md,
  },
  requirementsContainer: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  requirementsTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  requirementText: {
    fontSize: fontSizes.sm,
    marginLeft: spacing.xs,
  },
  changePasswordButton: {
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  changePasswordButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
});