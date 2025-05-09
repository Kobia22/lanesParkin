// App.tsx - Modified with ThemeProvider
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase/firebaseConfig';
import { colors } from './app/constants/theme';
import { User, UserRole } from './src/firebase/types';
import { getCurrentUser } from './src/firebase/auth';
import { ThemeProvider, useTheme } from './app/context/themeContext';

// Import Navigators
import AuthNavigator from './app/screens/navigators/authNavigator';
import UserNavigator from './app/screens/navigators/userNavigator';
import AdminNavigator from './app/screens/navigators/adminNavigator';
import WorkerNavigator from './app/screens/navigators/workerNavigator';

// Main App content component
const AppContent = () => {
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { colors, isDarkMode } = useTheme();

  // Auth state listener
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log(`User authenticated: ${firebaseUser.uid}`);
          setLoading(true);
          
          // Get current user with our utility function
          const user = await getCurrentUser();
          
          if (user) {
            console.log(`User data loaded. Role: ${user.role}, ID: ${user.id}, Email: ${user.email}`);
            setCurrentUser(user);
          } else {
            console.log("No user data found. Creating fallback user.");
            
            // Fallback: determine role from email domain
            const email = firebaseUser.email || '';
            let role: UserRole = 'guest';
            
            if (email.endsWith('@admin.lanesparking.com')) {
              role = 'admin';
            } else if (email.endsWith('@worker.lanesparking.com')) {
              role = 'worker';
            } else if (email.endsWith('@students.jkuat.ac.ke')) {
              role = 'student';
            }
            
            // Create a basic user document in Firestore
            const basicUser: Omit<User, 'id'> = {
              email: email,
              role: role,
              displayName: firebaseUser.displayName || email.split('@')[0] || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            };
            
            // Save the user to Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), basicUser);
            
            setCurrentUser({
              id: firebaseUser.uid,
              ...basicUser
            });
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

  // Loading state
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

  // Main app with navigator based on user role
  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={colors.primary}
      />
      <NavigationContainer>
        {!currentUser ? (
          <AuthNavigator />
        ) : currentUser.role === 'admin' ? (
          <AdminNavigator />
        ) : currentUser.role === 'worker' ? (
          <WorkerNavigator />
        ) : (
          <UserNavigator />
        )}
      </NavigationContainer>
    </>
  );
};

// Main App component with ThemeProvider
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}