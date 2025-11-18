import React from 'react';
import type { TextInputProps } from 'react-native';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';

export interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  value,
  onChangeText,
  testID,
  secureTextEntry,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        testID={testID}
        secureTextEntry={secureTextEntry}
        accessible={true}
        accessibilityLabel={label}
        accessibilityHint={error}
        {...rest}
      />
      {error && (
        <Text style={styles.error} testID={testID ? `${testID}-error` : 'input-error'}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.errorAlt,
    borderWidth: 2,
  },
  error: {
    color: colors.errorAlt,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xxs,
  },
});
