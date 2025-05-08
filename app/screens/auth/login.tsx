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
import { signInUser, signInAdmin } from '../../../src/firebase/auth';
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
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [staffId, setStaffId] = useState('');

  // Handle the login process
  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Validate inputs
      if (isAdminLogin) {
        if (!staffId || !password) {
          setError('Please enter both Staff ID and password');
          setLoading(false);
          return;
        }
        
        // Use the signInAdmin function from auth.ts
        try {
          await signInAdmin(staffId, password);
          // Auth state changes will be caught by the App component
        } catch (err: any) {
          if (err.message.includes("Invalid staff ID format")) {
            setError('Staff ID must be in the format ABC12-123');
          } else if (err.message.includes("User does not have admin privileges")) {
            setError('You do not have admin privileges');
          } else {
            setError('Invalid staff ID or password');
          }
          throw err; // Rethrow to be caught by the outer catch block
        }
      } else {
        // Regular user login
        if (!email || !password) {
          setError('Please enter both email and password');
          setLoading(false);
          return;
        }
        
        // Use the signInUser function from auth.ts
        await signInUser(email, password);
        // Auth state changes will be caught by the App component
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Don't set error message if it's already been set in the inner try/catch
      if (!error) {
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
      }
    } finally {
      setLoading(false);
    }
  };

  // Define screens based on login mode
  const renderRegularLoginForm = () => (
    <>
      <Text style={styles.subtitle}>Welcome to LanesParking</Text>
      
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
    </>
  );

  const renderAdminLoginForm = () => (
    <>
      <Text style={styles.subtitle}>Admin Portal</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Staff ID</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your Staff ID (e.g., ABC12-123)"
            value={staffId}
            onChangeText={setStaffId}
            autoCapitalize="characters"
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
          <Text style={styles.loginButtonText}>Login as Admin</Text>
        )}
      </TouchableOpacity>
    </>
  );

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
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, !isAdminLogin && styles.activeTab]}
              onPress={() => setIsAdminLogin(false)}
            >
              <Text style={[styles.tabText, !isAdminLogin && styles.activeTabText]}>User</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, isAdminLogin && styles.activeTab]}
              onPress={() => setIsAdminLogin(true)}
            >
              <Text style={[styles.tabText, isAdminLogin && styles.activeTabText]}>Admin</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formContainer}>
          {isAdminLogin ? renderAdminLoginForm() : renderRegularLoginForm()}
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
    marginBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    width: '80%',
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 30,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: fontSizes.md,
  },
  activeTabText: {
    color: colors.primary,
  },
  formContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
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
  switchModeContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  switchModeText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: fontSizes.sm,
  },
});