// app/screens/user/privacyPolicy.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/themeContext';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            LanesParking Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textLight }]}>
            Last Updated: May 15, 2025
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            This Privacy Policy describes how LanesParking collects, uses, and shares your personal information when you use our mobile application and related services.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>1. Information We Collect</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We collect information you provide directly to us, such as when you create an account, make a booking, or contact customer support. This information may include:
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Name, email address, and other contact information</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Account credentials</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Vehicle information (registration number)</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Payment information</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Profile pictures</Text>

          <Text style={[styles.heading, { color: colors.text }]}>2. How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We use the information we collect to:
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Provide, maintain, and improve our services</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Process transactions and send related information</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Manage your account and communicate with you</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Monitor and analyze usage patterns</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• Personalize your experience</Text>

          <Text style={[styles.heading, { color: colors.text }]}>3. Information Sharing</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We do not share your personal information with third parties except in the following circumstances:
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• With your consent</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• To comply with laws or legal obligations</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• To protect our rights, property, or safety of our users</Text>
          <Text style={[styles.listItem, { color: colors.text }]}>• With service providers who assist in our operations</Text>

          <Text style={[styles.heading, { color: colors.text }]}>4. Data Security</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>5. Your Rights</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your information.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>6. Contact Us</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            If you have any questions about this Privacy Policy, please contact us at privacy@lanesparking.com.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
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
  card: {
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: fontSizes.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  listItem: {
    fontSize: fontSizes.md,
    lineHeight: 24,
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
});