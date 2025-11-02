import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const MainScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      {user && <Text style={styles.userName}>{user.name}</Text>}
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    marginBottom: 24,
    color: '#666',
  },
});

export default MainScreen;
