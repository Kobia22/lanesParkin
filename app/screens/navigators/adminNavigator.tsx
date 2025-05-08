// app/screens/navigators/AdminNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

// Admin Screens
import AdminDashboardScreen from '../admin/dashboard';
import AnalyticsScreen from '../admin/analytics';
import ParkingLotAdminPanel from '../admin/parkingLotAdminPanel';
import ParkingSpaceAdminPanel from '../admin/parkingSpace';
import AdminProfileScreen from '../admin/profile';

// Admin Stack Param List for the parking management
export type AdminParkingStackParamList = {
  ParkingLotAdminPanel: undefined;
  ParkingSpaceAdminPanel: { lotId: string | null };
};

// Create a stack navigator for the parking management screens
const ParkingStack = createStackNavigator<AdminParkingStackParamList>();

const ParkingManagementNavigator = () => {
  return (
    <ParkingStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <ParkingStack.Screen 
        name="ParkingLotAdminPanel" 
        component={ParkingLotAdminPanel} 
        options={{ title: 'Parking Lots' }}
      />
      <ParkingStack.Screen 
        name="ParkingSpaceAdminPanel" 
        component={ParkingSpaceAdminPanel} 
        options={{ title: 'Parking Spaces' }}
      />
    </ParkingStack.Navigator>
  );
};

// Admin Tab Param List
export type AdminTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;
  ParkingManagement: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminNavigator = () => {
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
        name="Dashboard" 
        component={AdminDashboardScreen} 
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="ParkingManagement" 
        component={ParkingManagementNavigator} 
        options={{
          title: 'Parking',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AdminProfileScreen} 
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

export default AdminNavigator;