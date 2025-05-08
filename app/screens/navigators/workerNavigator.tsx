// app/screens/navigators/workerNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

// Worker Screens
import WorkerDashboardScreen from '../worker/dashboard';
import ManageBookingsScreen from '../worker/manageBookings';
import CompleteBookingsScreen from '../worker/completeBookings';
import ManageSpacesScreen from '../worker/manageSpaces';
import WorkerProfileScreen from '../worker/profile';
import ChangePasswordScreen from '../user/changePassword';

// Worker Tab Param List
export type WorkerTabParamList = {
  WorkerDashboard: undefined;
  ManageBookings: undefined;
  CompleteBookings: undefined;
  ManageSpaces: undefined;
  WorkerProfile: undefined;
};

// For the Profile Stack
export type WorkerProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
};

// Create the Profile stack navigator
const ProfileStack = createStackNavigator<WorkerProfileStackParamList>();

// Profile Stack Navigator Component
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={WorkerProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<WorkerTabParamList>();

const WorkerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          elevation: 5,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
          borderTopColor: '#E2E8F0',
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tab.Screen 
        name="WorkerDashboard" 
        component={WorkerDashboardScreen} 
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="ManageBookings" 
        component={ManageBookingsScreen} 
        options={{
          title: 'Check In',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="log-in" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="CompleteBookings" 
        component={CompleteBookingsScreen} 
        options={{
          title: 'Check Out',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="log-out" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="ManageSpaces" 
        component={ManageSpacesScreen} 
        options={{
          title: 'Spaces',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="WorkerProfile" 
        component={ProfileStackNavigator} 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default WorkerNavigator;