// app/screens/navigators/UserNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../context/themeContext';

// User Screens
import HomeScreen from '../user/home';
import BookingScreen from '../user/booking';
import HistoryScreen from '../user/history';
import ProfileScreen from '../user/profile';
import ChangePasswordScreen from '../user/changePassword';
import AppearanceScreen from '../user/appearance';
import TermsOfServiceScreen from '../user/termsOfService';
import PrivacyPolicyScreen from '../user/privacyPolicy';
import HelpSupportScreen from '../user/helpSupport';

function ProfileStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <ProfileStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: colors.background }
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="Appearance" component={AppearanceScreen} />
      <ProfileStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} />
    </ProfileStack.Navigator>
  );
}
// User Tab Param List
export type UserTabParamList = {
  Home: undefined;
  Booking: { lotId?: string; spaceId?: string };
  History: undefined;
  Profile: undefined;
};

// First, let's add the new screens to the ProfileStackParamList in userNavigator.tsx

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
  Appearance: undefined;
  TermsOfService: undefined;  // New screen
  PrivacyPolicy: undefined;   // New screen
  HelpSupport: undefined;     // New screen
};

const Tab = createBottomTabNavigator<UserTabParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();


const UserNavigator = () => {
  const { colors } = useTheme();
  
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
          borderTopColor: colors.borderColor,
          backgroundColor: colors.tabBarBackground,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Parking Lots',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Booking" 
        component={BookingScreen} 
        options={{
          title: 'Book Now',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator} 
        options={{
          title: 'My Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default UserNavigator;