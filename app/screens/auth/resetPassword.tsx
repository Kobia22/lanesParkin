// app/screens/auth/resetPassword.tsx
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
import { sendPasswordResetEmail } from '../../../src/firebase/auth';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigators/authNavigator';

type ResetPasswordScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: ResetPasswordScreenProps) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await sendPasswordResetEmail(email);
      
      setResetSent(true);
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email inbox for password reset instructions.',
        [
          { text: 'Return to Login', onPress: () => navigation.navigate('Login') }
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('No account exists with this email address');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else {
        setError('Failed to send password reset email. Please try again.');
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.resetInfoContainer}>
            <Ionicons name="key-outline" size={48} color={colors.primary} style={styles.resetIcon} />
            <Text style={styles.resetTitle}>Forgot Your Password?</Text>
            <Text style={styles.resetInstructions}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {resetSent && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Password reset email sent! Please check your inbox.
              </Text>
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
                autoFocus={!route.params?.email}
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetPassword}
            disabled={loading || resetSent}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.resetButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.backToLoginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
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
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    top: 60,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  formContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  resetInfoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resetIcon: {
    marginBottom: spacing.md,
  },
  resetTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  resetInstructions: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
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
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  successText: {
    color: '#2E7D32',
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
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  backToLoginButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  backToLoginText: {
    color: colors.primary,
    fontSize: fontSizes.md,
  },
});