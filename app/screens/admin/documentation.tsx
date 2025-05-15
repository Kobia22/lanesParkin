// app/screens/admin/documentation.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Sample documentation structure
const documentationContent = [
  {
    id: 'gs',
    title: 'Getting Started',
    icon: 'play-circle-outline',
    documents: [
      {
        id: 'gs1',
        title: 'Administrator Setup Guide',
        description: 'First-time setup for admin accounts',
        lastUpdated: 'May 2, 2024',
      },
      {
        id: 'gs2',
        title: 'Understanding the Interface',
        description: 'Overview of the admin dashboard',
        lastUpdated: 'April 28, 2024',
      },
      {
        id: 'gs3',
        title: 'System Requirements',
        description: 'Hardware and software requirements',
        lastUpdated: 'March 15, 2024',
      },
    ],
  },
  {
    id: 'um',
    title: 'User Management',
    icon: 'people-circle-outline',
    documents: [
      {
        id: 'um1',
        title: 'Creating User Accounts',
        description: 'How to add and configure new users',
        lastUpdated: 'May 1, 2024',
      },
      {
        id: 'um2',
        title: 'User Roles and Permissions',
        description: 'Understanding different access levels',
        lastUpdated: 'April 25, 2024',
      },
      {
        id: 'um3',
        title: 'User Activity Monitoring',
        description: 'Tracking and auditing user actions',
        lastUpdated: 'April 20, 2024',
      },
    ],
  },
  {
    id: 'pm',
    title: 'Parking Management',
    icon: 'car-outline',
    documents: [
      {
        id: 'pm1',
        title: 'Parking Lot Configuration',
        description: 'Setting up and customizing parking areas',
        lastUpdated: 'May 5, 2024',
      },
      {
        id: 'pm2',
        title: 'Space Management',
        description: 'Managing individual parking spaces',
        lastUpdated: 'April 30, 2024',
      },
      {
        id: 'pm3',
        title: 'Pricing Strategies',
        description: 'Setting up rates and special offers',
        lastUpdated: 'April 15, 2024',
      },
      {
        id: 'pm4',
        title: 'Reservation Workflows',
        description: 'Understanding the booking process',
        lastUpdated: 'April 10, 2024',
      },
    ],
  },
  {
    id: 'rp',
    title: 'Reports & Analytics',
    icon: 'bar-chart-outline',
    documents: [
      {
        id: 'rp1',
        title: 'Standard Reports',
        description: 'Overview of built-in reports',
        lastUpdated: 'May 3, 2024',
      },
      {
        id: 'rp2',
        title: 'Custom Reporting',
        description: 'Creating tailored analytics',
        lastUpdated: 'April 22, 2024',
      },
      {
        id: 'rp3',
        title: 'Data Export Options',
        description: 'Exporting data to various formats',
        lastUpdated: 'April 5, 2024',
      },
    ],
  },
  {
    id: 'sc',
    title: 'Security & Compliance',
    icon: 'shield-checkmark-outline',
    documents: [
      {
        id: 'sc1',
        title: 'Data Security Measures',
        description: 'Understanding security features',
        lastUpdated: 'May 4, 2024',
      },
      {
        id: 'sc2',
        title: 'Privacy Compliance',
        description: 'Meeting data protection regulations',
        lastUpdated: 'April 18, 2024',
      },
      {
        id: 'sc3',
        title: 'Audit Trail Management',
        description: 'Tracking system changes and access',
        lastUpdated: 'March 25, 2024',
      },
    ],
  },
];

export default function DocumentationScreen() {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('gs');

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleDocumentPress = (documentId: string) => {
    // In a real app, you would navigate to the specific document
    // For now, we'll just show an alert
    alert(`Opening document: ${documentId}`);
  };

  // Find the active category
  const currentCategory = documentationContent.find(cat => cat.id === activeCategory);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Documentation</Text>
      </View>

      <View style={styles.content}>
        {/* Categories horizontal scrolling */}
        <View style={styles.categoryContainer}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {documentationContent.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  activeCategory === category.id && styles.activeCategoryButton
                ]}
                onPress={() => handleCategoryPress(category.id)}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={22} 
                  color={activeCategory === category.id ? '#FFFFFF' : colors.primary} 
                />
                <Text 
                  style={[
                    styles.categoryText,
                    activeCategory === category.id && styles.activeCategoryText
                  ]}
                >
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Document list */}
        <View style={styles.documentsContainer}>
          <Text style={styles.sectionTitle}>
            {currentCategory?.title || 'Documents'}
          </Text>
          
          <FlatList
            data={currentCategory?.documents || []}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.documentItem}
                onPress={() => handleDocumentPress(item.id)}
              >
                <View style={styles.documentIconContainer}>
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.documentContent}>
                  <Text style={styles.documentTitle}>{item.title}</Text>
                  <Text style={styles.documentDescription}>{item.description}</Text>
                  <Text style={styles.documentDate}>Last updated: {item.lastUpdated}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.documentsList}
          />
        </View>
      </View>
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
    paddingTop: 50,
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
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoriesScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  activeCategoryButton: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  // Recently viewed section
  recentlyViewedContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  recentlyViewedTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  recentlyViewedScrollContent: {
    paddingVertical: spacing.xs,
  },
  recentlyViewedItem: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: spacing.sm,
    marginRight: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    alignItems: 'center',
  },
  recentlyViewedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recentlyViewedText: {
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlign: 'center',
  },
  // Document list
  documentsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  documentsList: {
    paddingBottom: spacing.xl,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.md,
    overflow: 'hidden',
  },
  documentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  documentContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  documentTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  documentDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: 4,
    lineHeight: 18,
  },
  documentDate: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginBottom: 4,
  },
  documentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 5,
    marginTop: 4,
  },
  tagText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  separator: {
    height: spacing.sm,
  },
  emptyResultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyResultText: {
    fontSize: fontSizes.lg,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyResultSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  // Document Viewer styles
  documentViewerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  documentViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  documentViewerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  documentViewerContent: {
    flex: 1,
    padding: spacing.md,
  },
  documentHeaderImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  documentMeta: {
    marginBottom: spacing.md,
  },
  documentMetaText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  documentViewerDescription: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  documentSection: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  documentSectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  documentSectionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  // Related documents
  relatedDocumentsContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  relatedDocumentsTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  relatedDocumentsScrollContent: {
    paddingVertical: spacing.xs,
  },
  relatedDocumentCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginRight: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  relatedDocumentImage: {
    width: '100%',
    height: 80,
  },
  relatedDocumentContent: {
    padding: spacing.sm,
  },
  relatedDocumentTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  relatedDocumentCategory: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  // Feedback section
  feedbackContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  feedbackButtonsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    marginHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  reportButton: {
    padding: spacing.xs,
  },
  reportButtonText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
  }
});