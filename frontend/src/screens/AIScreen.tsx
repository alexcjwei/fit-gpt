import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation.types';
import { parseWorkout } from '../api/workout.api';
import { colors, spacing, radius, typography } from '../theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const AIScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [workoutText, setWorkoutText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParseWorkout = async () => {
    // Validate text length
    if (workoutText.trim().length < 10) {
      setError('Please enter at least 10 characters of workout text');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse the workout text
      const workout = await parseWorkout(workoutText.trim());

      // Navigate to the workout details screen
      const workoutId = workout.id;

      navigation.navigate('Main');
      // @ts-ignore - Navigate to WorkoutDetailsScreen within the Workouts stack
      navigation.navigate('Workouts', {
        screen: 'WorkoutDetailsScreen',
        params: { workoutId },
      });

      // Clear the text input after successful parse
      setWorkoutText('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse workout';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const exampleText = `## Upper Body Push

**Warm Up**
- Light cardio: 5 min
- Arm circles: 2x15

**Main Lifts (4 sets)**
1. Bench Press: 6-8 reps
2. Overhead Press: 8-10 reps

**Cool Down**
- Stretch: 5 min`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Workout Parser</Text>
          <Text style={styles.subtitle}>
            Paste your workout text and let AI parse it into a structured workout
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Workout Text</Text>
          <TextInput
            style={styles.textInput}
            value={workoutText}
            onChangeText={setWorkoutText}
            placeholder={exampleText}
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={15}
            textAlignVertical="top"
            editable={!isLoading}
          />
          <Text style={styles.helperText}>
            Minimum 10 characters. Include exercise names, sets, and reps.
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleParseWorkout}
          disabled={isLoading || workoutText.trim().length < 10}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.buttonText}>Parsing your workout...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Parse Workout</Text>
          )}
        </TouchableOpacity>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for better results:</Text>
          <Text style={styles.tipText}>• Use clear exercise names</Text>
          <Text style={styles.tipText}>• Include set and rep information (e.g., "3x10")</Text>
          <Text style={styles.tipText}>• Group exercises into blocks or supersets</Text>
          <Text style={styles.tipText}>
            • Add section headers for warm-up, main work, cool-down
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.tight,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.text,
    minHeight: 300,
    backgroundColor: colors.backgroundGray,
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  errorText: {
    color: '#d00',
    fontSize: typography.sizes.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  buttonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.weights.semibold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipsContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  tipsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tipText: {
    fontSize: typography.sizes.sm,
    color: '#555',
    lineHeight: typography.lineHeights.tight,
    marginBottom: spacing.xxs,
  },
});
