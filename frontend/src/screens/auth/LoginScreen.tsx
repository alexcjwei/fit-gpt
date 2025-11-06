import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { useAuth } from '../../contexts/AuthContext';
import { loginSchema, type LoginFormData } from '../../types/auth.validation';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      setIsLoading(true);
      setApiError('');
      await login(data.email, data.password);
      // Navigation will be handled by AuthNavigator/AppNavigator
    } catch (error: unknown) {
      // Handle API errors
      const errorMessage =
        (error !== null && typeof error === 'object' && 'response' in error &&
          error.response !== null && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data !== null && typeof error.response.data === 'object' && 'error' in error.response.data &&
          typeof error.response.data.error === 'string') ? error.response.data.error :
        (error !== null && typeof error === 'object' && 'response' in error &&
          error.response !== null && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data !== null && typeof error.response.data === 'object' && 'message' in error.response.data &&
          typeof error.response.data.message === 'string') ? error.response.data.message :
        error instanceof Error ? error.message :
        'An error occurred during login. Please try again.';
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
          </View>

          {/* Error Message */}
          {apiError !== '' ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }): JSX.Element => (
                <FormInput
                  label="Email"
                  value={value}
                  onChangeText={(text): void => {
                    onChange(text);
                    setApiError(''); // Clear API error when user types
                  }}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-email-input"
                  placeholder="your.email@example.com"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }): JSX.Element => (
                <FormInput
                  label="Password"
                  value={value}
                  onChangeText={(text): void => {
                    onChange(text);
                    setApiError(''); // Clear API error when user types
                  }}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-password-input"
                  placeholder="Enter your password"
                />
              )}
            />

            <FormButton
              onPress={(): void => { void handleSubmit(onSubmit)(); }}
              loading={isLoading}
              disabled={!isValid || isLoading}
              variant="primary"
              testID="login-submit-button"
            >
              Sign In
            </FormButton>
          </View>

          {/* OAuth Section - Placeholder for future implementation */}
          {/*
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.oauthContainer}>
            <FormButton
              onPress={() => {}}
              variant="secondary"
              testID="login-google-button"
            >
              Continue with Google
            </FormButton>
            <FormButton
              onPress={() => {}}
              variant="secondary"
              testID="login-apple-button"
            >
              Continue with Apple
            </FormButton>
          </View>
          */}

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={(): void => {
                // TODO: Navigate to Register screen when navigator is set up
                // navigation.navigate('Register');
                console.log('Navigate to Register - navigator not yet implemented');
              }}
              testID="login-register-link"
            >
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
