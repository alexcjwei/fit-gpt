import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { WorkoutsStackParamList, RootStackParamList } from '../types/navigation.types';
import { getWorkouts } from '../api/workout.api';
import { WorkoutCard } from '../components/workout/WorkoutCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useWorkoutMutations } from '../hooks/useWorkoutMutations';
import {
  getDateRangePreset,
  sortWorkoutsByDate,
  type DateRangePreset,
} from '../utils/workoutFilters';
import type { WorkoutSummary } from '../types/workout.types';

type WorkoutListScreenNavigationProp = StackNavigationProp<
  WorkoutsStackParamList,
  'WorkoutListScreen'
>;
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

const ITEMS_PER_PAGE = 20;

export const WorkoutListScreen: React.FC = () => {
  const navigation = useNavigation<WorkoutListScreenNavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();

  const [selectedFilter, setSelectedFilter] = useState<DateRangePreset>('week');
  const [offset, setOffset] = useState(0);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [deleteWorkoutId, setDeleteWorkoutId] = useState<string | null>(null);

  const { duplicateWorkout, deleteWorkout } =
    useWorkoutMutations();

  // Get date range based on filter
  const dateRange = useMemo(
    () => getDateRangePreset(selectedFilter),
    [selectedFilter]
  );

  // Fetch workouts
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['workouts', 'list', dateRange.startDate, dateRange.endDate, offset],
    queryFn: () =>
      getWorkouts({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: ITEMS_PER_PAGE,
        offset,
      }),
  });

  // Update workouts when data changes
  useEffect(() => {
    if (data !== null && data !== undefined && Array.isArray(data)) {
      setAllWorkouts((prev) => {
        // If offset is 0, replace all workouts
        // Otherwise, append to existing workouts
        return offset === 0 ? data : prev.concat(data);
      });

      // Stop pagination if we received fewer items than requested
      setHasMore(data.length === ITEMS_PER_PAGE);
    }
  }, [data]);

  // Sort workouts by date (newest first)
  const sortedWorkouts = useMemo(
    () => sortWorkoutsByDate(allWorkouts),
    [allWorkouts]
  );

  const handleFilterChange = (filter: DateRangePreset): void => {
    setSelectedFilter(filter);
    setOffset(0);
    setAllWorkouts([]);
    setHasMore(true);
  };

  const handleLoadMore = (): void => {
    // Only load more if:
    // 1. Not currently fetching
    // 2. There's more data to load
    // 3. We have some workouts already (prevents triggering on empty list)
    if (isFetching === false && hasMore && sortedWorkouts.length > 0) {
      setOffset((prev) => prev + ITEMS_PER_PAGE);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setOffset(0);
    setAllWorkouts([]);
    setHasMore(true);
    await refetch();
  };

  const handleSelectWorkout = (workoutId: string): void => {
    navigation.navigate('WorkoutDetailsScreen', { workoutId });
  };

  const handleCreateWorkout = (): void => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    rootNavigation.navigate('WorkoutEditor', {
      mode: 'create',
      date: today,
    });
  };

  const handleDuplicate = async (workoutId: string): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await duplicateWorkout({ id: workoutId, newDate: today });
      Alert.alert('Success', 'Workout duplicated successfully');
      void handleRefresh();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to duplicate workout'
      );
    }
  };

  const handleDeleteRequest = (workoutId: string): void => {
    setDeleteWorkoutId(workoutId);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (deleteWorkoutId === null) return;

    try {
      await deleteWorkout(deleteWorkoutId);
      setDeleteWorkoutId(null);
      Alert.alert('Success', 'Workout deleted successfully');
      void handleRefresh();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete workout'
      );
    }
  };

  // Render right swipe actions (Delete)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    workoutId: string
  ): React.ReactElement => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActionContainer, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={(): void => handleDeleteRequest(workoutId)}
        >
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render left swipe actions (Duplicate)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    workoutId: string
  ): React.ReactElement => {
    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActionContainer, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.duplicateAction]}
          onPress={(): void => { void handleDuplicate(workoutId); }}
        >
          <Text style={styles.swipeActionText}>Duplicate</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = (): React.ReactElement => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No workouts found</Text>
      <Text style={styles.emptyStateText}>
        You haven't logged any workouts in this time period yet.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleCreateWorkout}
      >
        <Text style={styles.emptyStateButtonText}>Create Workout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = (): React.ReactElement | null => {
    if (isFetching === false || offset === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (isLoading && offset === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading workouts...</Text>
      </View>
    );
  }

  if (error !== null && error !== undefined && offset === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Failed to load workouts</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={(): void => { void refetch(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'week' && styles.filterChipActive,
          ]}
          onPress={(): void => handleFilterChange('week')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === 'week' && styles.filterChipTextActive,
            ]}
          >
            7 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'month' && styles.filterChipActive,
          ]}
          onPress={(): void => handleFilterChange('month')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === 'month' && styles.filterChipTextActive,
            ]}
          >
            30 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'all' && styles.filterChipActive,
          ]}
          onPress={(): void => handleFilterChange('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === 'all' && styles.filterChipTextActive,
            ]}
          >
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Workout List with Swipe Actions */}
      <FlatList
        data={sortedWorkouts}
        keyExtractor={(item): string => item.id}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={(progress, dragX) =>
              renderRightActions(progress, dragX, item.id)
            }
            renderLeftActions={(progress, dragX) =>
              renderLeftActions(progress, dragX, item.id)
            }
            overshootRight={false}
            overshootLeft={false}
          >
            <WorkoutCard
              workout={item}
              onPress={handleSelectWorkout}
              showDate={true}
              showTime={true}
            />
          </Swipeable>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={sortedWorkouts.length > 0 ? (): void => { handleLoadMore(); } : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && offset === 0}
            onRefresh={(): void => { void handleRefresh(); }}
            tintColor="#007AFF"
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateWorkout}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteWorkoutId !== null}
        title="Delete Workout?"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={(): void => { void handleConfirmDelete(); }}
        onCancel={(): void => setDeleteWorkoutId(null)}
        destructive={true}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  swipeActionContainer: {
    justifyContent: 'center',
    marginVertical: 6,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
  },
  duplicateAction: {
    backgroundColor: '#007AFF',
    marginLeft: 16,
  },
  deleteAction: {
    backgroundColor: '#ff3b30',
    marginRight: 16,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});
