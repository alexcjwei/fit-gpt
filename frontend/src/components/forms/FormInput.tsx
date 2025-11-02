import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});
