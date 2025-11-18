import React from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';

export interface FormButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  testID?: string;
}

export const FormButton: React.FC<FormButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  children,
  testID,
}) => {
  const isDisabled = disabled || loading;

  const buttonStyle: ViewStyle[] = [
    styles.button,
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
    ...(isDisabled ? [styles.disabledButton] : []),
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    variant === 'primary' ? styles.primaryText : styles.secondaryText,
    ...(isDisabled ? [styles.disabledText] : []),
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
    >
      {loading ? (
        <>
          <ActivityIndicator
            color={variant === 'primary' ? colors.white : colors.primaryAlt}
            testID={testID ? `${testID}-spinner` : 'button-spinner'}
          />
          <Text style={[textStyle, styles.hiddenText]}>{children}</Text>
        </>
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.sm,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primaryAlt,
  },
  secondaryButton: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.textLight,
  },
  disabledText: {
    opacity: 0.7,
  },
  hiddenText: {
    opacity: 0,
    position: 'absolute',
  },
});
