// app/screens/admin/helpCenter.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Help topic sections for the Help Center
const helpTopics = [
  {
    id: 'dashboard',
    title: 'Dashboard Guide',
    icon: 'grid-outline',
    description: 'Learn how to use the admin dashboard effectively',
  },
  {
    id: 'parking',
    title: 'Parking Management',
    icon: 'car-outline',
    description: 'Manage parking lots and individual parking spaces',
  },
  {
    id: 'staff',
    title: 'Staff Management',
    icon: 'people-outline',
    description: 'Add, edit, and manage staff accounts',
  },
  {
    id: 'reports',
    title: 'Analytics & Reports',
    icon: 'stats-chart-outline',
    description: 'Generate and interpret parking usage reports',
  },
  {
    id: 'settings',
    title: 'System Settings',
    icon: 'settings-outline',
    description: 'Configure application settings and preferences',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'help-buoy-outline',
    description: 'Common issues and their solutions',
  },
];

// Frequently Asked Questions
const faqItems = [
  {
    question: 'How do I add a new parking lot?',
    answer: 'Navigate to Parking Management tab, tap on "Add New Lot" button, and fill in the required details including lot name, location, and capacity.',
  },
  {
    question: 'How can I modify parking rates?',
    answer: 'Go to System Settings, select "Parking Rates", choose the lot you want to modify, and update the hourly, daily, or monthly rates as needed.',
  },
  {
    question: 'How do I add a staff member?',
    answer: 'From your Profile, tap on "Manage Staff Accounts", then tap the "+" button. Fill in the staff details and assign appropriate permissions.',
  },
  {
    question: 'Where can I view reservation history?',
    answer: 'Access the Analytics tab and select "Booking History". You can filter by date range, specific lot, or user.',
  },
  {
    question: 'How do I export parking reports?',
    answer: 'In the Analytics tab, generate the report you need, then tap the "Export" button in the top right corner to download as PDF or CSV.',
  },
];

export default function HelpCenterScreen() {
  const navigation = useNavigation();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const toggleFaq = (question: string) => {
    if (expandedFaq === question) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(question);
    }
  };

  const handleTopicPress = (topicId: string) => {
    navigation.navigate('HelpTopic' as never, { topicId } as never);
  };

  const handleContactSupport = () => {
    // In a real app, you would open email client or chat
    Linking.openURL('mailto:support@lanesparking.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Help Center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <Image
            source={{ uri: 'https://placehold.co/400x200/4f46e5/FFFFFF?text=LanesParking+Help' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Admin Support Portal</Text>
            <Text style={styles.bannerSubtitle}>
              Find guides, tutorials, and answers to common questions
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleContactSupport}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="mail-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.quickActionText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Documentation' as never)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.quickActionText}>Documentation</Text>
          </TouchableOpacity>
        </View>

        {/* Help Topics */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Help Topics</Text>
          <View style={styles.topicsGrid}>
            {helpTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                onPress={() => handleTopicPress(topic.id)}
              >
                <View style={styles.topicIconContainer}>
                  <Ionicons name={topic.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription}>{topic.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequently Asked Questions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqItems.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFaq(faq.question)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === faq.question ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textLight}
                />
              </View>
              {expandedFaq === faq.question && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Information */}
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Need more help?</Text>
          <Text style={styles.contactText}>
            Our support team is available Monday-Friday, 8am-6pm
          </Text>
          <View style={styles.contactInfoRow}>
            <Ionicons name="mail" size={20} color={colors.primary} />
            <Text style={styles.contactInfoText}>support@lanesparking.com</Text>
          </View>
          <View style={styles.contactInfoRow}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <Text style={styles.contactInfoText}>+254-700-000-000</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: spacing.md,
  },
  welcomeBanner: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  bannerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  bannerSubtitle: {
    fontSize: fontSizes.md,
    color: '#FFFFFF',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topicIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  topicDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    lineHeight: 18,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  faqAnswer: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contactText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contactInfoText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
});