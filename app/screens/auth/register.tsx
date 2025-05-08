// app/screens/auth/register.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView
} from 'react-native';
import { registerUser, determineUserRole } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigators/authNavigator';

type RegisterScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'guest'>('guest');

  // Update role based on email
  useEffect(() => {
    if (email) {
      const role = determineUserRole(email);
      if (role === 'student' || role === 'guest') {
        setUserRole(role);
      }
    }
  }, [email]);

  const handleRegister = async () => {
    try {
      // Validate inputs
      if (!email || !username || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Clear any previous errors
      setError(null);
      setLoading(true);
      
      // Register the user with username
      await registerUser(email, password, username);
      
      // Show success message
      Alert.alert(
        'Registration Successful',
        `Your account has been created successfully as a ${userRole}.`,
        [
          { text: 'Login Now', onPress: () => navigation.navigate('Login') }
        ]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific firebase error codes
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Please choose a stronger password (at least 6 characters).');
      } else {
        setError('An error occurred during registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>LanesParking</Text>
          <Text style={styles.subtitle}>Create an Account</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={[
            styles.roleInfo, 
            userRole === 'student' ? styles.studentRole : styles.guestRole
          ]}>
            <Text style={styles.roleInfoText}>
              {userRole === 'student' ? 'Student Registration' : 'Guest Registration'}
            </Text>
            <Text style={styles.roleTip}>
              {userRole === 'student' 
                ? 'Use your @students.jkuat.ac.ke email' 
                : 'Use any email for guest access'}
            </Text>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  formContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  roleInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  studentRole: {
    backgroundColor: colors.studentHighlight,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  guestRole: {
    backgroundColor: colors.guestHighlight,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  roleInfoText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  roleTip: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
  },
  inputIcon: {
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    fontSize: fontSizes.md,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    color: colors.textLight,
    fontSize: fontSizes.md,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});