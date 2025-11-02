import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';

type ExerciseDetailsRouteProp = RouteProp<RootStackParamList, 'ExerciseDetails'>;
type ExerciseDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'ExerciseDetails'>;

export const ExerciseDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ExerciseDetailsNavigationProp>();
  const route = useRoute<ExerciseDetailsRouteProp>();

  const { exerciseId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Details</Text>
      <Text style={styles.subtitle}>Exercise ID: {exerciseId}</Text>
      <Text style={styles.description}>View exercise information, form cues, and video</Text>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Close Sheet</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
