import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutsStackParamList } from '../types/navigation.types';

type WorkoutListScreenNavigationProp = StackNavigationProp<WorkoutsStackParamList, 'WorkoutListScreen'>;

export const WorkoutListScreen: React.FC = () => {
  const navigation = useNavigation<WorkoutListScreenNavigationProp>();

  const handleNavigateToDetails = () => {
    navigation.navigate('WorkoutDetailsScreen', { workoutId: 'test-workout-123' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workouts</Text>
      <Text style={styles.subtitle}>Browse your workout templates</Text>

      <TouchableOpacity
        style={styles.testButton}
        onPress={handleNavigateToDetails}
      >
        <Text style={styles.testButtonText}>View Test Workout Details</Text>
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
