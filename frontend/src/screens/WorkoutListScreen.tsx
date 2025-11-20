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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { WorkoutsStackParamList, RootStackParamList } from '../types/navigation.types';
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
import { colors, spacing, radius, typography, shadows } from '../theme';

type WorkoutListScreenNavigationProp = StackNavigationProp<
  WorkoutsStackParamList,
  'WorkoutListScreen'
>;
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

const ITEMS_PER_PAGE = 20;

export const WorkoutListScreen: React.FC = () => {
  const navigation = useNavigation<WorkoutListScreenNavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();

  const [selectedFilter, setSelectedFilter] = useState<DateRangePreset>('week');
  const [offset, setOffset] = useState(0);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [deleteWorkoutId, setDeleteWorkoutId] = useState<string | null>(null);

  const {
    duplicateWorkout,
    deleteWorkout,
    isDuplicating: _isDuplicating,
    isDeleting: _isDeleting,
  } = useWorkoutMutations();

  // Get date range based on filter
  const dateRange = useMemo(() => getDateRangePreset(selectedFilter), [selectedFilter]);

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
    if (data && Array.isArray(data)) {
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
  const sortedWorkouts = useMemo(() => sortWorkoutsByDate(allWorkouts), [allWorkouts]);

  const handleFilterChange = (filter: DateRangePreset) => {
    setSelectedFilter(filter);
    setOffset(0);
    setAllWorkouts([]);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    // Only load more if:
    // 1. Not currently fetching
    // 2. There's more data to load
    // 3. We have some workouts already (prevents triggering on empty list)
    if (!isFetching && hasMore && sortedWorkouts.length > 0) {
      setOffset((prev) => prev + ITEMS_PER_PAGE);
    }
  };

  const handleRefresh = async () => {
    setOffset(0);
    setAllWorkouts([]);
    setHasMore(true);
    await refetch();
  };

  const handleSelectWorkout = (workoutId: string) => {
    navigation.navigate('WorkoutDetailsScreen', { workoutId });
  };

  const handleCreateWorkout = () => {
    const today = new Date().toISOString().split('T')[0];
    rootNavigation.navigate('WorkoutEditor', {
      mode: 'create',
      date: today,
    });
  };

  const handleDuplicate = async (workoutId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await duplicateWorkout({ id: workoutId, newDate: today });
      Alert.alert('Success', 'Workout duplicated successfully');
      void handleRefresh();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to duplicate workout');
    }
  };

  const handleDeleteRequest = (workoutId: string) => {
    setDeleteWorkoutId(workoutId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteWorkoutId) return;

    try {
      await deleteWorkout(deleteWorkoutId);
      setDeleteWorkoutId(null);
      Alert.alert('Success', 'Workout deleted successfully');
      void handleRefresh();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete workout');
    }
  };

  // Render right swipe actions (Delete)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    workoutId: string
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActionContainer, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => handleDeleteRequest(workoutId)}
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
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActionContainer, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.duplicateAction]}
          onPress={() => handleDuplicate(workoutId)}
        >
          <Text style={styles.swipeActionText}>Duplicate</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No workouts found</Text>
      <Text style={styles.emptyStateText}>
        You haven't logged any workouts in this time period yet.
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateWorkout}>
        <Text style={styles.emptyStateButtonText}>Create Workout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isFetching || offset === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading && offset === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading workouts...</Text>
      </View>
    );
  }

  if (error && offset === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Failed to load workouts</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Integrated title */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Workouts</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'week' && styles.filterChipActive]}
          onPress={() => handleFilterChange('week')}
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
          style={[styles.filterChip, selectedFilter === 'month' && styles.filterChipActive]}
          onPress={() => handleFilterChange('month')}
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
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text
            style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}
          >
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Workout List with Swipe Actions */}
      <FlatList
        data={sortedWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
            renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item.id)}
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
        onEndReached={sortedWorkouts.length > 0 ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && offset === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
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
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteWorkoutId(null)}
        destructive={true}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundMuted,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.massive,
  },
  swipeActionContainer: {
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: radius.md,
  },
  duplicateAction: {
    backgroundColor: colors.primary,
    marginLeft: spacing.lg,
  },
  deleteAction: {
    backgroundColor: colors.error,
    marginRight: spacing.lg,
  },
  swipeActionText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  emptyState: {
    paddingVertical: spacing.massive,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.huge,
    marginBottom: spacing.xxl,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  fabText: {
    fontSize: typography.sizes.xxxl,
    color: colors.white,
    fontWeight: typography.weights.light,
  },
});
