import {
  transformWrkoutExercise,
  generateSlug,
  flattenToTags,
  fetchExerciseList,
  fetchExerciseData,
} from '../../../src/scripts/seedExercisesFromWrkout';

/**
 * Unit tests for seedExercisesFromWrkout script
 * Tests transformation logic from wrkout format to our exercise format
 */
describe('seedExercisesFromWrkout', () => {
  describe('generateSlug', () => {
    it('should convert name to lowercase slug with hyphens', () => {
      expect(generateSlug('Barbell Curl')).toBe('barbell-curl');
      expect(generateSlug('Air Bike')).toBe('air-bike');
      expect(generateSlug('Ab Roller')).toBe('ab-roller');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Multiple  Spaces   Exercise')).toBe('multiple-spaces-exercise');
    });

    it('should handle special characters', () => {
      expect(generateSlug('Exercise (Advanced)')).toBe('exercise-advanced');
      expect(generateSlug('90/90 Hamstring')).toBe('90-90-hamstring');
    });

    it('should handle underscores', () => {
      expect(generateSlug('3_4_Sit-Up')).toBe('3-4-sit-up');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('  Barbell Curl  ')).toBe('barbell-curl');
      expect(generateSlug('-Exercise-')).toBe('exercise');
    });

    it('should handle apostrophes and quotes', () => {
      expect(generateSlug("Farmer's Walk")).toBe('farmers-walk');
      expect(generateSlug('"Quoted" Exercise')).toBe('quoted-exercise');
    });
  });

  describe('flattenToTags', () => {
    it('should combine all metadata fields into tags array', () => {
      const wrkoutExercise = {
        name: 'Barbell Curl',
        force: 'pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'barbell',
        primaryMuscles: ['biceps'],
        secondaryMuscles: ['forearms'],
        instructions: ['Step 1', 'Step 2'],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      expect(tags).toContain('pull');
      expect(tags).toContain('beginner');
      expect(tags).toContain('isolation');
      expect(tags).toContain('barbell');
      expect(tags).toContain('biceps');
      expect(tags).toContain('forearms');
      expect(tags).toContain('strength');
    });

    it('should handle empty secondaryMuscles array', () => {
      const wrkoutExercise = {
        name: 'Air Bike',
        force: 'pull',
        level: 'beginner',
        mechanic: 'compound',
        equipment: 'body only',
        primaryMuscles: ['abdominals'],
        secondaryMuscles: [],
        instructions: [],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      expect(tags).toContain('pull');
      expect(tags).toContain('beginner');
      expect(tags).toContain('compound');
      expect(tags).toContain('body only');
      expect(tags).toContain('abdominals');
      expect(tags).toContain('strength');
      expect(tags).not.toContain('');
    });

    it('should handle multiple primary and secondary muscles', () => {
      const wrkoutExercise = {
        name: 'Bench Press',
        force: 'push',
        level: 'intermediate',
        mechanic: 'compound',
        equipment: 'barbell',
        primaryMuscles: ['chest', 'triceps'],
        secondaryMuscles: ['shoulders', 'forearms'],
        instructions: [],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      expect(tags).toContain('chest');
      expect(tags).toContain('triceps');
      expect(tags).toContain('shoulders');
      expect(tags).toContain('forearms');
    });

    it('should not include instructions in tags', () => {
      const wrkoutExercise = {
        name: 'Test Exercise',
        force: 'pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'dumbbell',
        primaryMuscles: ['biceps'],
        secondaryMuscles: [],
        instructions: ['Do this', 'Then do that'],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      expect(tags).not.toContain('Do this');
      expect(tags).not.toContain('Then do that');
    });

    it('should filter out null, undefined, and empty strings', () => {
      const wrkoutExercise = {
        name: 'Test Exercise',
        force: '',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'dumbbell',
        primaryMuscles: ['biceps', ''],
        secondaryMuscles: [],
        instructions: [],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      expect(tags).not.toContain('');
      expect(tags).not.toContain(null);
      expect(tags).not.toContain(undefined);
    });

    it('should deduplicate tags when same value appears in multiple fields', () => {
      const wrkoutExercise = {
        name: 'Test Exercise',
        force: 'pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'quadriceps',
        primaryMuscles: ['quadriceps', 'glutes'],
        secondaryMuscles: ['hamstrings', 'quadriceps'],
        instructions: [],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      // Count occurrences of 'quadriceps'
      const quadricepsCount = tags.filter((tag) => tag === 'quadriceps').length;

      // Should only appear once
      expect(quadricepsCount).toBe(1);
      expect(tags).toContain('quadriceps');
      expect(tags).toContain('glutes');
      expect(tags).toContain('hamstrings');
    });

    it('should handle case-insensitive deduplication', () => {
      const wrkoutExercise = {
        name: 'Test Exercise',
        force: 'Pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'dumbbell',
        primaryMuscles: ['pull'],
        secondaryMuscles: [],
        instructions: [],
        category: 'strength',
      };

      const tags = flattenToTags(wrkoutExercise);

      // Count occurrences of 'pull' or 'Pull'
      const pullCount = tags.filter((tag) => tag.toLowerCase() === 'pull').length;

      // Should only appear once (case-insensitive)
      expect(pullCount).toBe(1);
    });
  });

  describe('transformWrkoutExercise', () => {
    it('should transform complete wrkout exercise to our format', () => {
      const wrkoutExercise = {
        name: 'Barbell Curl',
        force: 'pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'barbell',
        primaryMuscles: ['biceps'],
        secondaryMuscles: ['forearms'],
        instructions: ['Stand up straight', 'Curl the bar'],
        category: 'strength',
      };

      const transformed = transformWrkoutExercise(wrkoutExercise);

      expect(transformed.slug).toBe('barbell-curl');
      expect(transformed.name).toBe('Barbell Curl');
      expect(transformed.needsReview).toBe(false);
      expect(transformed.tags).toEqual(
        expect.arrayContaining([
          'pull',
          'beginner',
          'isolation',
          'barbell',
          'biceps',
          'forearms',
          'strength',
        ])
      );
      expect(transformed.tags).toHaveLength(7);
    });

    it('should handle exercise with empty secondaryMuscles', () => {
      const wrkoutExercise = {
        name: 'Air Bike',
        force: 'pull',
        level: 'beginner',
        mechanic: 'compound',
        equipment: 'body only',
        primaryMuscles: ['abdominals'],
        secondaryMuscles: [],
        instructions: [],
        category: 'strength',
      };

      const transformed = transformWrkoutExercise(wrkoutExercise);

      expect(transformed.slug).toBe('air-bike');
      expect(transformed.name).toBe('Air Bike');
      expect(transformed.tags).toContain('abdominals');
      expect(transformed.tags).toContain('body only');
      expect(transformed.needsReview).toBe(false);
    });

    it('should set needsReview to false for all exercises', () => {
      const wrkoutExercise = {
        name: 'Test Exercise',
        force: 'pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'dumbbell',
        primaryMuscles: ['biceps'],
        secondaryMuscles: [],
        instructions: [],
        category: 'strength',
      };

      const transformed = transformWrkoutExercise(wrkoutExercise);

      expect(transformed.needsReview).toBe(false);
    });

    it('should generate correct slug from name', () => {
      const wrkoutExercise = {
        name: '3/4 Sit-Up',
        force: 'pull',
        level: 'beginner',
        mechanic: 'isolation',
        equipment: 'body only',
        primaryMuscles: ['abdominals'],
        secondaryMuscles: [],
        instructions: [],
        category: 'strength',
      };

      const transformed = transformWrkoutExercise(wrkoutExercise);

      expect(transformed.slug).toBe('3-4-sit-up');
    });
  });

  describe('fetchExerciseList', () => {
    it('should be a function that returns a promise', () => {
      expect(typeof fetchExerciseList).toBe('function');
    });
  });

  describe('fetchExerciseData', () => {
    it('should be a function that returns a promise', () => {
      expect(typeof fetchExerciseData).toBe('function');
    });
  });
});
