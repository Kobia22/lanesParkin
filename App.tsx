// App.tsx - Modified to get user role from Firestore
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase/firebaseConfig';
import { colors } from './app/constants/theme';
import { User, UserRole } from './src/firebase/types';

// Import Navigators
import AuthNavigator from './app/screens/navigators/authNavigator';
import UserNavigator from './app/screens/navigators/userNavigator';
import AdminNavigator from './app/screens/navigators/adminNavigator';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log(`User authenticated: ${firebaseUser.uid}`);
          setLoading(true);
          
          // Fetch user data from Firestore to get the role
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log(`Firestore user data loaded. Role: ${userData.role}`);
            
            setCurrentUser({
              id: firebaseUser.uid,
              ...userData as Omit<User, 'id'>
            });
          } else {
            console.log("No Firestore document found for user. Creating a fallback user with email-based role.");
            
            // Fallback: determine role from email domain
            const email = firebaseUser.email || '';
            let role: UserRole = 'guest';
            
            if (email.endsWith('@admin.lanesparking.com')) {
              role = 'admin';
            } else if (email.endsWith('@students.jkuat.ac.ke')) {
              role = 'student';
            }
            
            // Create a basic user with email-determined role
            const basicUser: User = {
              id: firebaseUser.uid,
              email: email,
              role: role,
              displayName: firebaseUser.displayName || email.split('@')[0] || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            };
            
            setCurrentUser(basicUser);
          }
        } else {
          console.log("No user is signed in");
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    });
    
    return unsubscribe;
  }, []);

  if (initializing || loading) {
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
        {!currentUser ? (
          <AuthNavigator />
        ) : currentUser.role === 'admin' ? (
          <AdminNavigator />
        ) : (
          <UserNavigator />
        )}
      </NavigationContainer>
    </>
  );
}