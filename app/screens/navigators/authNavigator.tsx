// app/screens/navigators/AuthNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Auth Screens
import LoginScreen from '../auth/login';
import RegisterScreen from '../auth/register';
import ResetPasswordScreen from '../auth/resetPassword';

// Auth Stack Param List
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: { email?: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;