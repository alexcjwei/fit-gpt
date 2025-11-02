import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WorkoutIndicatorProps {
  count: number;
}

/**
 * Small dot/badge shown on calendar dates with workouts
 * Displays a colored dot with a count if there are multiple workouts
 */
export const WorkoutIndicator: React.FC<WorkoutIndicatorProps> = ({ count }) => {
  if (count === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      {count > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  badge: {
    marginLeft: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
});
