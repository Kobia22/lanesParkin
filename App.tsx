// App.tsx - Simplified
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/firebase/firebaseConfig';
import { colors } from './app/constants/theme';

// Import Navigators
import AuthNavigator from './app/screens/navigators/authNavigator';
import UserNavigator from './app/screens/navigators/userNavigator';
import AdminNavigator from './app/screens/navigators/adminNavigator';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'student' | 'guest' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        
        // Try to figure out the role
        try {
          // Using optional import for safety
          const userEmail = firebaseUser.email || '';
          if (userEmail.endsWith('@admin.lanesparking.com')) {
            setUserRole('admin');
          } else if (userEmail.endsWith('@students.jkuat.ac.ke')) {
            setUserRole('student');
          } else {
            setUserRole('guest');
          }
        } catch (error) {
          console.error('Error determining user role:', error);
          // Default to guest if we can't determine
          setUserRole('guest');
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
      
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ 
          marginTop: 10, 
          color: colors.text,
          fontSize: 16
        }}>
          Loading LanesParking...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.primary}
      />
      <NavigationContainer>
        {!isAuthenticated ? (
          <AuthNavigator />
        ) : userRole === 'admin' ? (
          <AdminNavigator />
        ) : (
          <UserNavigator />
        )}
      </NavigationContainer>
    </>
  );
}