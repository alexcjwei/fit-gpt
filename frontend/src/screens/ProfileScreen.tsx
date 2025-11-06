import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../types/navigation.types';
import { useAuth } from '../contexts/AuthContext';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleNavigateToExerciseBrowser = (): void => {
    navigation.navigate('ExerciseBrowserScreen');
  };

  const handleNavigateToSettings = (): void => {
    navigation.navigate('SettingsScreen');
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user !== null && user !== undefined ? <Text style={styles.userName}>{user.name}</Text> : null}
      <Text style={styles.subtitle}>Manage your account and settings</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleNavigateToExerciseBrowser}
      >
        <Text style={styles.buttonText}>Browse Exercises</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleNavigateToSettings}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={(): void => { void handleLogout(); }} color="#dc3545" />
      </View>
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
  userName: {
    fontSize: 20,
    marginBottom: 8,
    color: '#007AFF',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    maxWidth: 300,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: 32,
  },
});
