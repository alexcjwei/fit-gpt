import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

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
            color={variant === 'primary' ? '#fff' : '#3b82f6'}
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
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#374151',
  },
  disabledText: {
    opacity: 0.7,
  },
  hiddenText: {
    opacity: 0,
    position: 'absolute',
  },
});
