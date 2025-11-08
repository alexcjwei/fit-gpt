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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { parseWorkout } from '../api/workout.api';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const AIScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to parse workout';
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
        contentContainerStyle={styles.scrollContent}
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
            placeholderTextColor="#999"
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
              <ActivityIndicator size="small" color="#fff" />
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
          <Text style={styles.tipText}>• Add section headers for warm-up, main work, cool-down</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 300,
    backgroundColor: '#f8f9fa',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#d00',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipsContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 4,
  },
});
