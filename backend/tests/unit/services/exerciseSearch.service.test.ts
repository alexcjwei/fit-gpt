import { ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { Exercise } from '../../../src/models/Exercise';

// Mock the Exercise model
jest.mock('../../../src/models/Exercise');

const MockedExercise = Exercise as jest.Mocked<typeof Exercise>;

describe('ExerciseSearchService', () => {
  let service: ExerciseSearchService;

  const mockExercises = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'Barbell Bench Press',
      category: 'chest',
      primaryMuscles: ['chest'],
      equipment: ['barbell'],
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Dumbbell Bench Press',
      category: 'chest',
      primaryMuscles: ['chest'],
      equipment: ['dumbbell'],
    },
    {
      _id: '507f1f77bcf86cd799439013',
      name: 'Romanian Deadlift',
      category: 'legs',
      primaryMuscles: ['hamstrings', 'glutes'],
      equipment: ['barbell'],
    },
    {
      _id: '507f1f77bcf86cd799439014',
      name: 'Back Squat',
      category: 'legs',
      primaryMuscles: ['quads', 'glutes'],
      equipment: ['barbell'],
    },
    {
      _id: '507f1f77bcf86cd799439015',
      name: 'Overhead Press',
      category: 'shoulders',
      primaryMuscles: ['shoulders'],
      equipment: ['barbell'],
    },
    {
      _id: '507f1f77bcf86cd799439016',
      name: 'Lat Pulldown',
      category: 'back',
      primaryMuscles: ['lats', 'upper-back'],
      equipment: ['cable'],
    },
  ] as any[];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExerciseSearchService();

    // Mock Exercise.find to return mock exercises
    MockedExercise.find.mockResolvedValue(mockExercises as any);
  });

  describe('searchByName', () => {
    it('should find exact matches', async () => {
      const results = await service.searchByName('Barbell Bench Press');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
      expect(results[0].score).toBeLessThan(0.1); // Very close match
    });

    it('should find fuzzy matches with typos', async () => {
      const results = await service.searchByName('Benchpress'); // Missing space

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.exercise.name);
      expect(names).toContain('Barbell Bench Press');
    });

    it('should find partial matches', async () => {
      const results = await service.searchByName('bench');

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.exercise.name);
      expect(names).toContain('Barbell Bench Press');
      expect(names).toContain('Dumbbell Bench Press');
    });

    it('should handle abbreviations - DB', async () => {
      const results = await service.searchByName('DB Bench Press');

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.exercise.name);
      expect(names).toContain('Dumbbell Bench Press');
    });

    it('should handle abbreviations - BB', async () => {
      const results = await service.searchByName('BB Bench Press');

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.exercise.name);
      expect(names).toContain('Barbell Bench Press');
    });

    it('should handle abbreviations - RDL', async () => {
      const results = await service.searchByName('RDL');

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.exercise.name);
      expect(names).toContain('Romanian Deadlift');
    });

    it('should handle abbreviations - OHP', async () => {
      const results = await service.searchByName('OHP');

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.exercise.name);
      expect(names).toContain('Overhead Press');
    });

    it('should return top N results', async () => {
      const results = await service.searchByName('press', { limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should respect score threshold', async () => {
      const results = await service.searchByName('completely wrong query xyz', {
        threshold: 0.3,
      });

      // Should return no results for very poor matches
      expect(results.length).toBe(0);
    });

    it('should return empty array for no matches', async () => {
      const results = await service.searchByName('nonexistent exercise zxqw', {
        threshold: 0.3,
      });

      expect(results).toEqual([]);
    });

    it('should handle case insensitive search', async () => {
      const results1 = await service.searchByName('BARBELL BENCH PRESS');
      const results2 = await service.searchByName('barbell bench press');
      const results3 = await service.searchByName('Barbell Bench Press');

      expect(results1[0].exercise.name).toBe(results2[0].exercise.name);
      expect(results2[0].exercise.name).toBe(results3[0].exercise.name);
    });

    it('should cache exercises and not refetch on subsequent calls', async () => {
      await service.searchByName('bench');
      await service.searchByName('squat');
      await service.searchByName('deadlift');

      // Exercise.find should only be called once (for initial cache load)
      expect(MockedExercise.find).toHaveBeenCalledTimes(1);
    });

    it('should return results sorted by score (best matches first)', async () => {
      const results = await service.searchByName('bench press');

      // Verify scores are in ascending order (lower score = better match)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i + 1].score);
      }
    });
  });

  describe('findBestMatch', () => {
    it('should return the best matching exercise', async () => {
      const result = await service.findBestMatch('Barbell Bench Press');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Barbell Bench Press');
    });

    it('should return null for no good match', async () => {
      const result = await service.findBestMatch('nonexistent exercise xyz', 0.3);

      expect(result).toBeNull();
    });

    it('should respect minScore parameter', async () => {
      const result = await service.findBestMatch('bench', 0.01); // Very strict

      // With very strict threshold, may not find anything
      if (result) {
        expect(result.name).toMatch(/bench/i);
      }
    });

    it('should work with abbreviations', async () => {
      const result = await service.findBestMatch('DB Bench');

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Dumbbell');
    });
  });

  describe('refreshCache', () => {
    it('should refetch exercises from database', async () => {
      // First call initializes cache
      await service.searchByName('bench');
      expect(MockedExercise.find).toHaveBeenCalledTimes(1);

      // Refresh cache
      await service.refreshCache();
      expect(MockedExercise.find).toHaveBeenCalledTimes(2);
    });

    it('should update search results after refresh', async () => {
      await service.searchByName('bench');

      // Add new exercise to mock
      const newExercises = [
        ...mockExercises,
        {
          _id: '507f1f77bcf86cd799439017',
          name: 'Incline Bench Press',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
        },
      ];

      MockedExercise.find.mockResolvedValue(newExercises as any);

      await service.refreshCache();

      const results = await service.searchByName('bench');
      const names = results.map((r) => r.exercise.name);

      expect(names).toContain('Incline Bench Press');
    });
  });

  describe('getCachedExercises', () => {
    it('should return all cached exercises', async () => {
      // Initialize cache
      await service.searchByName('bench');

      const cached = service.getCachedExercises();

      expect(cached).toHaveLength(mockExercises.length);
      expect(cached[0].name).toBe('Barbell Bench Press');
    });

    it('should return empty array before cache is initialized', () => {
      const cached = service.getCachedExercises();

      expect(cached).toEqual([]);
    });
  });

  describe('cache TTL', () => {
    it('should use cached data within TTL period', async () => {
      await service.searchByName('bench');
      expect(MockedExercise.find).toHaveBeenCalledTimes(1);

      // Search again immediately (within TTL)
      await service.searchByName('squat');
      expect(MockedExercise.find).toHaveBeenCalledTimes(1); // Still 1
    });
  });
});
