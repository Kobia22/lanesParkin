// app/screens/user/appearance.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/themeContext';
import { spacing, fontSizes } from '../../constants/theme';

const AppearanceScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.primary}
      />
      
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
      </View>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <View style={[styles.sectionContainer, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme Settings</Text>
          
          <View style={[styles.themeOption, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.themeOptionContent}>
              <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? colors.primary : '#F3F4F6' }]}>
                <Ionicons 
                  name={isDarkMode ? "moon" : "sunny"} 
                  size={24} 
                  color={isDarkMode ? "#FFFFFF" : colors.primary} 
                />
              </View>
              <View style={styles.themeDetails}>
                <Text style={[styles.themeTitle, { color: colors.text }]}>
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={[styles.themeDescription, { color: colors.textLight }]}>
                  {isDarkMode 
                    ? 'Switch to light theme for brighter colors' 
                    : 'Switch to dark theme for reduced eye strain'}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.themeOption, { borderBottomWidth: 0 }]}
            onPress={() => {
              // Logic for system theme (if implemented)
            }}
          >
            <View style={styles.themeOptionContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="settings-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.themeDetails}>
                <Text style={[styles.themeTitle, { color: colors.text }]}>Use System Settings</Text>
                <Text style={[styles.themeDescription, { color: colors.textLight }]}>
                  Follow system dark/light mode settings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.themePreview, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>Preview</Text>
          
          <View style={[styles.previewContent, { backgroundColor: colors.background }]}>
            <View style={[styles.previewHeader, { backgroundColor: colors.primary }]}>
              <Text style={styles.previewHeaderText}>LanesParking</Text>
            </View>
            
            <View style={styles.previewBody}>
              <View style={[styles.previewCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
                <Text style={[styles.previewCardTitle, { color: colors.text }]}>Available Lots</Text>
                <Text style={[styles.previewCardCount, { color: colors.primary }]}>12</Text>
              </View>
              
              <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.previewButtonText}>Book Now</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionContainer: {
    borderRadius: 10,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  themeOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  themeDetails: {
    flex: 1,
  },
  themeTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: fontSizes.sm,
  },
  themePreview: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    padding: spacing.md,
  },
  previewContent: {
    borderRadius: 8,
    margin: spacing.md,
    overflow: 'hidden',
    height: 200,
  },
  previewHeader: {
    padding: spacing.md,
  },
  previewHeaderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  previewBody: {
    padding: spacing.md,
    alignItems: 'center',
  },
  previewCard: {
    width: '80%',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  previewCardTitle: {
    fontSize: fontSizes.sm,
    marginBottom: 4,
  },
  previewCardCount: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  previewButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default AppearanceScreen;