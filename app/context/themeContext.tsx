// app/context/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define theme types
export type ThemeMode = 'light' | 'dark';

// Light theme colors
export const lightColors = {
  primary: '#06b6d4', // Cyan
  secondary: '#0369a1', // Blue
  accent: '#2563eb', // Blue
  background: '#f5faff', // Light blue
  cardBackground: '#ffffff', // White
  text: '#333333', // Dark gray
  textLight: '#555555', // Medium gray
  error: '#ef4444', // Red
  success: '#22c55e', // Green
  studentHighlight: '#e0f2fe', // Light blue background
  guestHighlight: '#ede9fe', // Light purple background
  tabBarBackground: '#ffffff',
  borderColor: '#E2E8F0',
  icon: '#555555',
};

// Dark theme colors
export const darkColors = {
  primary: '#0e7490', // Darker Cyan
  secondary: '#075985', // Darker Blue
  accent: '#1d4ed8', // Darker Blue
  background: '#121212', // Dark background
  cardBackground: '#1e1e1e', // Dark card background
  text: '#e0e0e0', // Light gray text
  textLight: '#a0a0a0', // Medium light gray text
  error: '#f87171', // Lighter Red
  success: '#4ade80', // Lighter Green
  studentHighlight: '#082f49', // Dark blue background
  guestHighlight: '#4c1d95', // Dark purple background
  tabBarBackground: '#1e1e1e',
  borderColor: '#2d3748',
  icon: '#a0a0a0',
};

// Theme context type
interface ThemeContextProps {
  themeMode: ThemeMode;
  colors: typeof lightColors;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

// Create the context
const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'light',
  colors: lightColors,
  toggleTheme: () => {},
  isDarkMode: false,
});

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  
  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme) {
          setThemeMode(savedTheme as ThemeMode);
        } else if (systemColorScheme) {
          // Use system preference if no saved theme
          setThemeMode(systemColorScheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadTheme();
  }, [systemColorScheme]);
  
  // Save theme preference when it changes
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('themeMode', themeMode);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    };
    
    saveTheme();
  }, [themeMode]);
  
  // Toggle between light and dark themes
  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };
  
  // Get current colors based on theme mode
  const colors = themeMode === 'dark' ? darkColors : lightColors;
  const isDarkMode = themeMode === 'dark';
  
  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colors,
        toggleTheme,
        isDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);