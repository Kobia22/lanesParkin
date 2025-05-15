// app/screens/admin/helpTopic.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Import topicContent from a separate file in a real app
// For this example, we'll define it at the top of this file
// (topic content was defined in the previous file)

export default function HelpTopicScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  
  // Get the topic ID from route params
  const { topicId } = route.params as { topicId: string };
  
  // Get the topic data
  const topic = topicContent[topicId as keyof typeof topicContent];
  
  if (!topic) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Help Topic</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Topic not found</Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.returnButtonText}>Return to Help Center</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{topic.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Topic Header */}
        <View style={styles.topicHeader}>
          <View style={styles.topicIconContainer}>
            <Ionicons name={topic.icon as any} size={32} color={colors.primary} />
          </View>
          <Text style={styles.topicTitle}>{topic.title}</Text>
        </View>

        {/* Sections */}
        {topic.sections.map((section, index) => (
          <View key={index} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            {section.image && (
              <Image 
                source={{ uri: section.image }} 
                style={[styles.sectionImage, { width: width - (spacing.md * 2) }]}
                resizeMode="contain"
              />
            )}
            
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Related Topics */}
        <View style={styles.relatedTopicsContainer}>
          <Text style={styles.relatedTopicsTitle}>Related Topics</Text>
          <View style={styles.relatedTopicsList}>
            {Object.entries(topicContent)
              .filter(([key]) => key !== topicId)
              .slice(0, 3)
              .map(([key, relatedTopic]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.relatedTopicItem}
                  onPress={() => navigation.navigate('HelpTopic' as never, { topicId: key } as never)}
                >
                  <Ionicons 
                    name={relatedTopic.icon as any} 
                    size={20} 
                    color={colors.primary} 
                    style={styles.relatedTopicIcon}
                  />
                  <Text style={styles.relatedTopicText}>{relatedTopic.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate('HelpCenter' as never)}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
    paddingBottom: spacing.xl * 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.error,
    marginBottom: spacing.md,
  },
  returnButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  topicHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  topicIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionImage: {
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  sectionContent: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 24,
  },
  relatedTopicsContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  relatedTopicsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  relatedTopicsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  relatedTopicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  relatedTopicIcon: {
    marginRight: spacing.sm,
  },
  relatedTopicText: {
    fontSize: fontSizes.md,
    color: colors.text,
    flex: 1,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
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
    marginBottom: spacing.md,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
});