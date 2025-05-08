// app/screens/auth/login.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../src/firebase/firebaseConfig';
import ThemedForm from '../../components/themedForm';
import { colors } from '../../constants/theme';
import { StackNavigationProp } from '@react-navigation/stack';

// Define the type for the navigation prop
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: Props) {
  const STUDENT_EMAIL_REGEX = /^[a-zA-Z]+\.[a-zA-Z]+@students\.jkuat\.ac\.ke$/;

  function getRole(email: string) {
    if (STUDENT_EMAIL_REGEX.test(email)) return 'student';
    return 'guest';
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const role = getRole(email);
    
    try {
      if (role === 'student' && !STUDENT_EMAIL_REGEX.test(email)) {
        Alert.alert('Error', 'Student emails must be in the format name.name@students.jkuat.ac.ke');
        setLoading(false);
        return;
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Success', 'Login successful!', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
    }
    
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>LanesParking</Text>
      <Text style={styles.title}>Welcome Back</Text>
      
      <Text style={[
        styles.roleInfo, 
        getRole(email) === 'student' ? styles.studentRole : styles.guestRole
      ]}>
        {getRole(email) === 'student' ? 'Student Login' : 'Guest Login'}
      </Text>
      
      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.switchText}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
      
      <ThemedForm
        title="Login"
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        loading={loading}
        submitLabel="Login"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  brand: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  roleInfo: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  studentRole: {
    backgroundColor: colors.studentHighlight,
    color: colors.secondary,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  guestRole: {
    backgroundColor: colors.guestHighlight,
    color: colors.primary,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  switchButton: {
    marginBottom: 8,
  },
  switchText: {
    color: colors.primary,
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});