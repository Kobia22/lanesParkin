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
import ParkingSpaceAdminPanel from '../admin/parkingSpaceAdminPanel';
import AdminProfileScreen from '../admin/profile';

// Help Center Screens
import HelpCenterScreen from '../admin/helpCenter';
import HelpTopicScreen from '../admin/helpTopic';
import DocumentationScreen from '../admin/documentation';

// Admin Stack Param List for the parking management
export type AdminParkingStackParamList = {
  ParkingLotAdminPanel: undefined;
  ParkingSpaceAdminPanel: { lotId: string | null };
};

// Help Center Stack Param List
export type HelpCenterStackParamList = {
  HelpCenter: undefined;
  HelpTopic: { topicId: string };
  Documentation: undefined;
};

// Create a stack navigator for the parking management screens
const ParkingStack = createStackNavigator<AdminParkingStackParamList>();

const ParkingManagementNavigator = () => {
  return (
    <ParkingStack.Navigator
      initialRouteName="ParkingLotAdminPanel"
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

// Create a stack navigator for the help center screens
const HelpStack = createStackNavigator<HelpCenterStackParamList>();

const HelpCenterNavigator = () => {
  return (
    <HelpStack.Navigator
      initialRouteName="HelpCenter"
      screenOptions={{
        headerShown: false, // We're managing headers in each screen
      }}
    >
      <HelpStack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <HelpStack.Screen name="HelpTopic" component={HelpTopicScreen} />
      <HelpStack.Screen name="Documentation" component={DocumentationScreen} />
    </HelpStack.Navigator>
  );
};

// Create a stack navigator for the profile section that includes the help center
const ProfileStack = createStackNavigator();

const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator
      initialRouteName="ProfileMain"
      screenOptions={{
        headerShown: false, // We're managing headers in each screen
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={AdminProfileScreen} />
      <ProfileStack.Screen name="HelpCenter" component={HelpCenterNavigator} />
    </ProfileStack.Navigator>
  );
};

// Admin Tab Param List
export type AdminTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;
  ParkingManagement: undefined | { screen: string, params?: any };
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
        component={ProfileNavigator} 
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminNavigator;