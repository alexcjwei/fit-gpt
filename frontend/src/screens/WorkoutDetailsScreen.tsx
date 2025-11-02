import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { CalendarStackParamList } from '../types/navigation.types';

type WorkoutDetailsScreenRouteProp = RouteProp<CalendarStackParamList, 'WorkoutDetailsScreen'>;

export const WorkoutDetailsScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailsScreenRouteProp>();
  const { workoutId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Details</Text>
      <Text style={styles.subtitle}>Workout ID: {workoutId}</Text>
      <Text style={styles.placeholder}>
        Workout details will be loaded here in a future phase.
      </Text>
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
});
