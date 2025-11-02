import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CalendarStackParamList, WorkoutsStackParamList, RootStackParamList } from '../types/navigation.types';

type WorkoutDetailsScreenRouteProp =
  | RouteProp<CalendarStackParamList, 'WorkoutDetailsScreen'>
  | RouteProp<WorkoutsStackParamList, 'WorkoutDetailsScreen'>;

type RootNavigationProp = StackNavigationProp<RootStackParamList>;

export const WorkoutDetailsScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailsScreenRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { workoutId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Details</Text>
      <Text style={styles.subtitle}>Workout ID: {workoutId}</Text>
      <Text style={styles.placeholder}>
        Workout details will be loaded here in a future phase.
      </Text>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => navigation.navigate('WorkoutEditor', { mode: 'edit', workoutId: workoutId })}
      >
        <Text style={styles.testButtonText}>Open Workout Editor Modal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => navigation.navigate('ExerciseSelector', { blockId: 'test-block-123' })}
      >
        <Text style={styles.testButtonText}>Open Exercise Selector Modal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => navigation.navigate('ExerciseDetails', { exerciseId: 'test-exercise-123' })}
      >
        <Text style={styles.testButtonText}>Open Exercise Details Sheet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => navigation.navigate('SetEditor', { setId: 'test-set-123' })}
      >
        <Text style={styles.testButtonText}>Open Set Editor Sheet</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
