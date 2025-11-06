import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';

type ExerciseSelectorRouteProp = RouteProp<RootStackParamList, 'ExerciseSelector'>;
type ExerciseSelectorNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ExerciseSelector'
>;

// MVP: Hardcoded exercise list
// TODO: Replace with actual exercise library API
const MOCK_EXERCISES = [
  {
    id: '507f1f77bcf86cd799439011',
    name: 'Barbell Bench Press',
    category: 'chest',
    equipment: 'barbell',
  },
];

export const ExerciseSelectorScreen: React.FC = () => {
  const navigation = useNavigation<ExerciseSelectorNavigationProp>();
  const route = useRoute<ExerciseSelectorRouteProp>();
  const { blockId } = route.params;

  const handleSelectExercise = (exerciseId: string, exerciseName: string): void => {
    // TODO: Implement actual exercise addition using useWorkoutDetailsMutations
    // For MVP, just show an alert
    Alert.alert(
      'Exercise Selected',
      `You selected "${exerciseName}" for block ${blockId}.\n\nExercise addition will be implemented in the next phase.`,
      [
        {
          text: 'OK',
          onPress: (): void => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Exercise</Text>
        <TouchableOpacity onPress={(): void => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          📝 MVP: Only "Barbell Bench Press" available for now. Full exercise library coming
          soon!
        </Text>
      </View>

      {/* Exercise List */}
      <FlatList
        data={MOCK_EXERCISES}
        keyExtractor={(item): string => item.id}
        renderItem={({ item }): JSX.Element => (
          <TouchableOpacity
            style={styles.exerciseItem}
            onPress={(): void => handleSelectExercise(item.id, item.name)}
          >
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseMeta}>
                {item.category} • {item.equipment}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 12,
  },
});
