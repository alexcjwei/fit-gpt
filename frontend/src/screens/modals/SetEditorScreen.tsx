import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';

type SetEditorRouteProp = RouteProp<RootStackParamList, 'SetEditor'>;
type SetEditorNavigationProp = StackNavigationProp<RootStackParamList, 'SetEditor'>;

export const SetEditorScreen: React.FC = () => {
  const navigation = useNavigation<SetEditorNavigationProp>();
  const route = useRoute<SetEditorRouteProp>();

  const { setId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Editor</Text>
      <Text style={styles.subtitle}>Editing Set: {setId}</Text>
      <Text style={styles.description}>Quick edit set weight, reps, and RPE</Text>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Save & Close</Text>
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
