import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '../types/navigation.types';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, typography } from '../theme';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleNavigateToExerciseBrowser = () => {
    navigation.navigate('ExerciseBrowserScreen');
  };

  const handleNavigateToSettings = () => {
    navigation.navigate('SettingsScreen');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user && <Text style={styles.userName}>{user.name}</Text>}
      <Text style={styles.subtitle}>Manage your account and settings</Text>

      <TouchableOpacity style={styles.button} onPress={handleNavigateToExerciseBrowser}>
        <Text style={styles.buttonText}>Browse Exercises</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleNavigateToSettings}>
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={handleLogout} color="#dc3545" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  userName: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 300,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: spacing.xxxl,
  },
});
