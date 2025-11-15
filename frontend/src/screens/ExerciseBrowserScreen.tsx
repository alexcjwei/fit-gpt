import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { debounce } from 'lodash';
import { useExercises } from '../hooks/useExercises';
import type { Exercise } from '../types/workout.types';

export const ExerciseBrowserScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } = useExercises({
    search: debouncedSearchQuery || undefined,
    page,
    limit,
  });

  // Create a debounced function that updates the debounced search query
  const debouncedSetSearch = useMemo(
    () =>
      debounce((text: string) => {
        setDebouncedSearchQuery(text);
      }, 300),
    []
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      setPage(1); // Reset to first page when searching
      debouncedSetSearch(text);
    },
    [debouncedSetSearch]
  );

  const handleLoadMore = () => {
    if (data && page < data.pagination.totalPages) {
      setPage(page + 1);
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <View style={styles.exerciseItem}>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{item.tags.length - 3} more</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!data || page >= data.pagination.totalPages) return null;

    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery ? 'No exercises found' : 'No exercises available'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Results Count */}
      {data && !isLoading && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {data.pagination.total} exercise{data.pagination.total !== 1 ? 's' : ''} found
          </Text>
          {data.pagination.totalPages > 1 && (
            <Text style={styles.pageText}>
              Page {page} of {data.pagination.totalPages}
            </Text>
          )}
        </View>
      )}

      {/* Error State */}
      {isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error?.message || 'Failed to load exercises'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      )}

      {/* Exercise List */}
      {!isLoading && !isError && (
        <FlatList
          data={data?.exercises || []}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
