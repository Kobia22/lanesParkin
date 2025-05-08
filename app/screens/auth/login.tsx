// app/screens/auth/login.tsx
import React, { useState } from 'react';
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
import { signIn } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigators/authNavigator';

type LoginScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle the login process
  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Validate inputs
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }
      
      // Use the signInUser function from auth.ts
      // This will work for all user types (admin, worker, student, guest)
      await signIn(email, password);
      
      // Auth state changes will be caught by the App component
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific firebase error codes
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many unsuccessful login attempts. Please try again later');
      } else {
        setError('An error occurred during login. Please try again');
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
          <Text style={styles.subtitle}>Welcome Back</Text>
        </View>
        
        <View style={styles.formContainer}>
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
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Account Types:</Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.boldText}>Students:</Text> Use your student email (@students.jkuat.ac.ke)
            </Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.boldText}>Admins:</Text> Use your admin email (@admin.lanesparking.com)
            </Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.boldText}>Workers:</Text> Use your worker email (@worker.lanesparking.com)
            </Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.boldText}>Guests:</Text> Use any other email format
            </Text>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: spacing.sm,
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
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    color: colors.textLight,
    fontSize: fontSizes.md,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  instructionsContainer: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  instructionsTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.text,
  }
});