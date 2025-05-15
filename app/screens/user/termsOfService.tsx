// app/screens/user/termsOfService.tsx
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

export default function TermsOfServiceScreen() {
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
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            LanesParking Terms of Service
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textLight }]}>
            Last Updated: May 15, 2025
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            Welcome to LanesParking. By using our application, you agree to these Terms of Service. Please read them carefully.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            By accessing or using the LanesParking service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>2. Description of Service</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            LanesParking provides a platform for users to locate, book, and pay for parking spaces at designated lots on campus. Our service allows students, guests, and staff to manage parking efficiently.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>3. User Accounts</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Users are responsible for maintaining the confidentiality of their account information and password. You agree to notify us immediately of any unauthorized use of your account.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>4. Booking and Payments</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            4.1 Booking Confirmation: A booking is only confirmed after successful payment processing.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            4.2 Cancellation Policy: Users may cancel a booking before the start time. Refunds will be processed according to our Refund Policy.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            4.3 Expiration: Bookings expire after 5 minutes if the user does not arrive at the parking space.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>5. User Conduct</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Users agree not to use the service for any unlawful purpose or in any way that could damage, disable, or impair the service.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>6. Modifications to Service</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>7. Limitation of Liability</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            LanesParking shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>8. Contact Information</Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            If you have any questions about these Terms, please contact us at support@lanesparking.com.
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
});