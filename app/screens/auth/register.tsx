// app/screens/auth/register.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/firebase/firebaseConfig';
import ThemedForm from '../../components/themedForm';
import { colors } from '../../constants/theme';
import { StackNavigationProp } from '@react-navigation/stack';

// Define the type for the navigation prop
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
  const STUDENT_EMAIL_REGEX = /^[a-zA-Z]+\.[a-zA-Z]+@students\.jkuat\.ac\.ke$/;

  function getRole(email: string) {
    if (STUDENT_EMAIL_REGEX.test(email)) return 'student';
    return 'guest';
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    const role = getRole(email);
    
    try {
      if (role === 'student' && !STUDENT_EMAIL_REGEX.test(email)) {
        Alert.alert('Error', 'Student emails must be in the format name.name@students.jkuat.ac.ke');
        setLoading(false);
        return;
      }
      
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Add user to Firestore with role information
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      });
      
      Alert.alert('Success', 'Registration successful!', [
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
      <Text style={styles.title}>Create Account</Text>
      
      <Text style={[
        styles.roleInfo, 
        getRole(email) === 'student' ? styles.studentRole : styles.guestRole
      ]}>
        {getRole(email) === 'student' ? 'Student Registration' : 'Guest Registration'}
      </Text>
      
      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.switchText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
      
      <ThemedForm
        title="Register"
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleRegister}
        loading={loading}
        submitLabel="Register"
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