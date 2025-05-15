// app/screens/user/helpSupport.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/themeContext';
import { getCurrentUser } from '../../../src/firebase/auth';

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!supportMessage.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }

    try {
      setSending(true);
      
      // In a real app, you would send this to your backend
      // For now, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get current user email for the support message
      const user = await getCurrentUser();
      const userEmail = user?.email || 'Anonymous';
      
      console.log('Support message sent:', {
        category: selectedCategory,
        message: supportMessage,
        userEmail
      });
      
      // Clear form and show success message
      setSupportMessage('');
      setSelectedCategory(null);
      Alert.alert(
        'Message Sent',
        'Thank you for contacting support. We will respond to your inquiry within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending support message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  const categories = [
    { id: 'account', label: 'Account Issues', icon: 'person-circle-outline' },
    { id: 'booking', label: 'Booking Problems', icon: 'calendar-outline' },
    { id: 'payment', label: 'Payment Issues', icon: 'card-outline' },
    { id: 'app', label: 'App Technical Issues', icon: 'phone-portrait-outline' },
    { id: 'other', label: 'Other Inquiries', icon: 'help-circle-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How can we help you?
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
            Please select a category and provide details about your issue. Our support team will get back to you within 24 hours.
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Select a category:</Text>
          <View style={styles.categoriesContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: selectedCategory === category.id
                      ? colors.primary + '20'  // 20% opacity
                      : isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                    borderColor: selectedCategory === category.id
                      ? colors.primary
                      : colors.borderColor
                  }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.id ? colors.primary : colors.textLight}
                  style={styles.categoryIcon}
                />
                <Text style={[
                  styles.categoryLabel,
                  {
                    color: selectedCategory === category.id
                      ? colors.primary
                      : colors.text
                  }
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Describe your issue:</Text>
          <TextInput
            style={[
              styles.messageInput,
              {
                borderColor: colors.borderColor,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                color: colors.text
              }
            ]}
            multiline
            placeholder="Please provide details about your issue..."
            placeholderTextColor={colors.textLight}
            value={supportMessage}
            onChangeText={setSupportMessage}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (!selectedCategory || !supportMessage.trim() || sending) && { opacity: 0.6 }
            ]}
            onPress={handleSendMessage}
            disabled={!selectedCategory || !supportMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>
          
          <View style={[styles.faqItem, { borderBottomColor: colors.borderColor }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              How do I cancel a booking?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textLight }]}>
              You can cancel a booking by going to the "My Bookings" tab and selecting the booking you wish to cancel. Tap the "Cancel Booking" button at the bottom of the booking details.
            </Text>
          </View>
          
          <View style={[styles.faqItem, { borderBottomColor: colors.borderColor }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              What happens if my booking expires?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textLight }]}>
              Bookings expire after 5 minutes if you don't arrive at the parking space. The space will be released for other users to book, and you will not be charged.
            </Text>
          </View>
          
          <View style={[styles.faqItem, { borderBottomColor: colors.borderColor }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              How do the parking rates work?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textLight }]}>
              Students are charged a fixed daily rate of KSH 200. Guests are charged KSH 50 per hour, with the first 30 minutes free. All rates are automatically calculated based on your user type and duration.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              How do I update my vehicle information?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textLight }]}>
              You can update your vehicle information when making a new booking. The system will remember your most recently used vehicle registration number for convenience.
            </Text>
          </View>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Us Directly</Text>
          
          <View style={styles.contactMethod}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>support@lanesparking.com</Text>
          </View>
          
          <View style={styles.contactMethod}>
            <Ionicons name="call-outline" size={24} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>+254 712 345 678</Text>
          </View>
          
          <View style={styles.contactMethod}>
            <Ionicons name="location-outline" size={24} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>Admin Block, 2nd Floor, Room 204</Text>
          </View>
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
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs/2,
  },
  categoryItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    marginHorizontal: spacing.xs/2,
    marginBottom: spacing.sm,
    width: '48%',
    alignItems: 'center',
  },
  categoryIcon: {
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 150,
    fontSize: fontSizes.md,
  },
  sendButton: {
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  faqItem: {
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  faqQuestion: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  contactCard: {
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contactText: {
    fontSize: fontSizes.md,
    marginLeft: spacing.md,
  },
});