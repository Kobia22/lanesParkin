// app/components/ThemedForm.js
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSizes } from '../constants/theme';

interface ThemedFormProps {
  title?: string;
  email: string;
  password: string;
  onEmailChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel?: string;
}

export default function ThemedForm({
  title,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  loading,
  submitLabel = 'Submit',
}: ThemedFormProps) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.formTitle}>{title}</Text>}
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={onEmailChange}
          placeholder="your.name@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Your password"
          secureTextEntry
          autoComplete="password"
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.md,
  },
  formTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
    color: colors.text,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
    color: colors.textLight,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    backgroundColor: colors.primary + '80', // 50% opacity
  },
  buttonText: {
    color: '#ffffff',
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});