import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ExerciseBrowserScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Browser</Text>
      <Text style={styles.subtitle}>Browse and search exercises</Text>
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
  },
});
