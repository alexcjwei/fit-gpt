import {
  RegisterSchema,
  LoginSchema,
  SetInstanceSchema,
  CreateSetInstanceSchema,
  UpdateSetInstanceSchema,
  ExerciseInstanceSchema,
  CreateExerciseInstanceSchema,
  WorkoutBlockSchema,
  WorkoutSchema,
  CreateWorkoutSchema,
  UpdateWorkoutSchema,
  ExerciseSchema,
  CreateExerciseSchema,
  UpdateExerciseSchema,
  PaginationOptionsSchema,
  WorkoutFiltersSchema,
  ExerciseFiltersSchema,
} from '../../../src/types/validation';

describe('Validation Schemas', () => {
  describe('Auth Schemas', () => {
    describe('RegisterSchema', () => {
      it('should validate valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        };
        expect(() => RegisterSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'not-an-email',
          password: 'password123',
          name: 'Test User',
        };
        expect(() => RegisterSchema.parse(invalidData)).toThrow();
      });

      it('should reject password shorter than 8 characters', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        };
        expect(() => RegisterSchema.parse(invalidData)).toThrow();
      });

      it('should reject empty name', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'password123',
          name: '',
        };
        expect(() => RegisterSchema.parse(invalidData)).toThrow();
      });

      it('should reject name longer than 100 characters', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'password123',
          name: 'a'.repeat(101),
        };
        expect(() => RegisterSchema.parse(invalidData)).toThrow();
      });
    });

    describe('LoginSchema', () => {
      it('should validate valid login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123',
        };
        expect(() => LoginSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'not-an-email',
          password: 'password123',
        };
        expect(() => LoginSchema.parse(invalidData)).toThrow();
      });

      it('should reject missing password', () => {
        const invalidData = {
          email: 'test@example.com',
        };
        expect(() => LoginSchema.parse(invalidData)).toThrow();
      });
    });
  });

  describe('Set Schemas', () => {
    describe('SetInstanceSchema', () => {
      it('should validate complete set with all fields', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          reps: 10,
          weight: 135.5,
          weightUnit: 'lbs',
          duration: 30,
          rpe: 7,
          notes: 'Felt strong',
        };
        expect(() => SetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should validate set with minimal fields', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          weightUnit: 'kg',
        };
        expect(() => SetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should validate set with null values', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          reps: null,
          weight: null,
          weightUnit: 'lbs',
          duration: null,
          rpe: null,
          notes: null,
        };
        expect(() => SetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid UUID', () => {
        const invalidData = {
          id: 'not-a-uuid',
          setNumber: 1,
          weightUnit: 'lbs',
        };
        expect(() => SetInstanceSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid weightUnit', () => {
        const invalidData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          weightUnit: 'pounds',
        };
        expect(() => SetInstanceSchema.parse(invalidData)).toThrow();
      });

      it('should reject RPE outside 1-10 range', () => {
        const invalidData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          weightUnit: 'lbs',
          rpe: 11,
        };
        expect(() => SetInstanceSchema.parse(invalidData)).toThrow();
      });

      it('should reject negative reps', () => {
        const invalidData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          weightUnit: 'lbs',
          reps: -5,
        };
        expect(() => SetInstanceSchema.parse(invalidData)).toThrow();
      });

      it('should reject negative weight', () => {
        const invalidData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          weightUnit: 'lbs',
          weight: -100,
        };
        expect(() => SetInstanceSchema.parse(invalidData)).toThrow();
      });
    });

    describe('CreateSetInstanceSchema', () => {
      it('should validate set creation without id', () => {
        const validData = {
          setNumber: 1,
          weightUnit: 'lbs',
        };
        expect(() => CreateSetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should reject if id is provided', () => {
        const invalidData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          setNumber: 1,
          weightUnit: 'lbs',
        };
        expect(() => CreateSetInstanceSchema.parse(invalidData)).toThrow();
      });
    });

    describe('UpdateSetInstanceSchema', () => {
      it('should validate partial update', () => {
        const validData = {
          reps: 12,
          weight: 140,
        };
        expect(() => UpdateSetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should validate updating single field', () => {
        const validData = {
          rpe: 8,
        };
        expect(() => UpdateSetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should validate setting fields to null', () => {
        const validData = {
          reps: null,
          weight: null,
          notes: null,
        };
        expect(() => UpdateSetInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid values', () => {
        const invalidData = {
          rpe: 15,
        };
        expect(() => UpdateSetInstanceSchema.parse(invalidData)).toThrow();
      });
    });
  });

  describe('Exercise Instance Schemas', () => {
    describe('ExerciseInstanceSchema', () => {
      it('should validate exercise instance with sets', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          exerciseId: '1',
          orderInBlock: 0,
          sets: [
            {
              id: '223e4567-e89b-12d3-a456-426614174000',
              setNumber: 1,
              weightUnit: 'lbs',
            },
          ],
          prescription: '3 x 8-10',
          notes: 'Focus on form',
        };
        expect(() => ExerciseInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should validate exercise instance with empty sets', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          exerciseId: '1',
          orderInBlock: 0,
          sets: [],
        };
        expect(() => ExerciseInstanceSchema.parse(validData)).not.toThrow();
      });

      it('should reject negative orderInBlock', () => {
        const invalidData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          exerciseId: '1',
          orderInBlock: -1,
          sets: [],
        };
        expect(() => ExerciseInstanceSchema.parse(invalidData)).toThrow();
      });
    });

    describe('CreateExerciseInstanceSchema', () => {
      it('should validate exercise creation with sets', () => {
        const validData = {
          exerciseId: '1',
          orderInBlock: 0,
          sets: [
            {
              setNumber: 1,
              weightUnit: 'lbs',
            },
          ],
        };
        expect(() => CreateExerciseInstanceSchema.parse(validData)).not.toThrow();
      });
    });
  });

  describe('Workout Block Schemas', () => {
    describe('WorkoutBlockSchema', () => {
      it('should validate block with exercises', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          label: 'Warm Up',
          exercises: [],
          notes: 'Dynamic stretching',
        };
        expect(() => WorkoutBlockSchema.parse(validData)).not.toThrow();
      });

      it('should validate block without optional fields', () => {
        const validData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          exercises: [],
        };
        expect(() => WorkoutBlockSchema.parse(validData)).not.toThrow();
      });
    });
  });

  describe('Workout Schemas', () => {
    describe('WorkoutSchema', () => {
      it('should validate complete workout', () => {
        const validData = {
          id: '1',
          name: 'Push Day',
          date: '2025-01-15',
          lastModifiedTime: '2025-01-15T10:30:00Z',
          blocks: [],
          notes: 'Great session',
        };
        expect(() => WorkoutSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid date format', () => {
        const invalidData = {
          id: '1',
          name: 'Push Day',
          date: '01/15/2025',
          lastModifiedTime: '2025-01-15T10:30:00Z',
          blocks: [],
        };
        expect(() => WorkoutSchema.parse(invalidData)).toThrow();
      });

      it('should reject invalid ISO timestamp', () => {
        const invalidData = {
          id: '1',
          name: 'Push Day',
          date: '2025-01-15',
          lastModifiedTime: 'not-iso',
          blocks: [],
        };
        expect(() => WorkoutSchema.parse(invalidData)).toThrow();
      });
    });

    describe('CreateWorkoutSchema', () => {
      it('should validate workout creation', () => {
        const validData = {
          name: 'Push Day',
          date: '2025-01-15',
          blocks: [],
        };
        expect(() => CreateWorkoutSchema.parse(validData)).not.toThrow();
      });

      it('should reject if id is provided', () => {
        const invalidData = {
          id: '1',
          name: 'Push Day',
          date: '2025-01-15',
          blocks: [],
        };
        expect(() => CreateWorkoutSchema.parse(invalidData)).toThrow();
      });
    });

    describe('UpdateWorkoutSchema', () => {
      it('should validate partial workout update', () => {
        const validData = {
          name: 'Updated Push Day',
        };
        expect(() => UpdateWorkoutSchema.parse(validData)).not.toThrow();
      });

      it('should validate updating date', () => {
        const validData = {
          date: '2025-01-16',
        };
        expect(() => UpdateWorkoutSchema.parse(validData)).not.toThrow();
      });
    });
  });

  describe('Exercise Schemas', () => {
    describe('ExerciseSchema', () => {
      it('should validate exercise with all fields', () => {
        const validData = {
          id: '1',
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest', 'push', 'barbell'],
          needsReview: false,
        };
        expect(() => ExerciseSchema.parse(validData)).not.toThrow();
      });

      it('should validate exercise with minimal fields', () => {
        const validData = {
          id: '1',
          slug: 'squat',
          name: 'Squat',
        };
        expect(() => ExerciseSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid slug format', () => {
        const invalidData = {
          id: '1',
          slug: 'Invalid Slug With Spaces',
          name: 'Exercise',
        };
        expect(() => ExerciseSchema.parse(invalidData)).toThrow();
      });
    });

    describe('CreateExerciseSchema', () => {
      it('should validate exercise creation', () => {
        const validData = {
          slug: 'deadlift',
          name: 'Deadlift',
          tags: ['back', 'pull'],
        };
        expect(() => CreateExerciseSchema.parse(validData)).not.toThrow();
      });

      it('should reject if id is provided', () => {
        const invalidData = {
          id: '1',
          slug: 'deadlift',
          name: 'Deadlift',
        };
        expect(() => CreateExerciseSchema.parse(invalidData)).toThrow();
      });
    });

    describe('UpdateExerciseSchema', () => {
      it('should validate partial exercise update', () => {
        const validData = {
          needsReview: false,
        };
        expect(() => UpdateExerciseSchema.parse(validData)).not.toThrow();
      });

      it('should validate updating tags', () => {
        const validData = {
          tags: ['legs', 'compound'],
        };
        expect(() => UpdateExerciseSchema.parse(validData)).not.toThrow();
      });
    });
  });

  describe('Filter and Pagination Schemas', () => {
    describe('PaginationOptionsSchema', () => {
      it('should validate pagination options', () => {
        const validData = {
          page: 1,
          limit: 50,
        };
        expect(() => PaginationOptionsSchema.parse(validData)).not.toThrow();
      });

      it('should reject page less than 1', () => {
        const invalidData = {
          page: 0,
          limit: 50,
        };
        expect(() => PaginationOptionsSchema.parse(invalidData)).toThrow();
      });

      it('should reject limit greater than 100', () => {
        const invalidData = {
          page: 1,
          limit: 200,
        };
        expect(() => PaginationOptionsSchema.parse(invalidData)).toThrow();
      });

      it('should use default values', () => {
        const result = PaginationOptionsSchema.parse({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(50);
      });
    });

    describe('WorkoutFiltersSchema', () => {
      it('should validate workout filters', () => {
        const validData = {
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31',
        };
        expect(() => WorkoutFiltersSchema.parse(validData)).not.toThrow();
      });

      it('should validate empty filters', () => {
        const validData = {};
        expect(() => WorkoutFiltersSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid date format', () => {
        const invalidData = {
          dateFrom: '01/01/2025',
        };
        expect(() => WorkoutFiltersSchema.parse(invalidData)).toThrow();
      });
    });

    describe('ExerciseFiltersSchema', () => {
      it('should validate exercise filters', () => {
        const validData = {
          tag: 'chest',
          search: 'bench',
        };
        expect(() => ExerciseFiltersSchema.parse(validData)).not.toThrow();
      });

      it('should validate empty filters', () => {
        const validData = {};
        expect(() => ExerciseFiltersSchema.parse(validData)).not.toThrow();
      });
    });
  });

  describe('XSS Sanitization', () => {
    describe('RegisterSchema', () => {
      it('should sanitize XSS in user name', () => {
        const maliciousData = {
          email: 'test@example.com',
          password: 'password123',
          name: '<script>alert("XSS")</script>John',
        };
        const result = RegisterSchema.parse(maliciousData);
        expect(result.name).toBe('John');
        expect(result.name).not.toContain('<script>');
      });

      it('should sanitize HTML tags in user name', () => {
        const maliciousData = {
          email: 'test@example.com',
          password: 'password123',
          name: '<img src=x onerror=alert(1)>Jane',
        };
        const result = RegisterSchema.parse(maliciousData);
        expect(result.name).toBe('Jane');
        expect(result.name).not.toContain('<img');
      });
    });

    describe('CreateWorkoutSchema', () => {
      it('should sanitize XSS in workout name', () => {
        const maliciousData = {
          name: '<script>fetch("https://evil.com")</script>Push Day',
          date: '2025-01-15',
          blocks: [],
        };
        const result = CreateWorkoutSchema.parse(maliciousData);
        expect(result.name).toBe('Push Day');
        expect(result.name).not.toContain('<script>');
      });

      it('should sanitize XSS in workout notes', () => {
        const maliciousData = {
          name: 'Push Day',
          date: '2025-01-15',
          blocks: [],
          notes: '<iframe src="evil.com"></iframe>Great workout',
        };
        const result = CreateWorkoutSchema.parse(maliciousData);
        expect(result.notes).toBe('Great workout');
        expect(result.notes).not.toContain('<iframe');
      });
    });

    describe('UpdateWorkoutSchema', () => {
      it('should sanitize XSS in workout updates', () => {
        const maliciousData = {
          notes: '<svg><script>alert(1)</script></svg>Updated notes',
        };
        const result = UpdateWorkoutSchema.parse(maliciousData);
        expect(result.notes).toBe('Updated notes');
        expect(result.notes).not.toContain('<svg>');
      });
    });

    describe('CreateWorkoutBlockSchema', () => {
      it('should sanitize XSS in block label', () => {
        const maliciousData = {
          label: '<script>alert("block")</script>Warm Up',
          exercises: [],
        };
        const result = CreateWorkoutSchema.parse({
          name: 'Workout',
          date: '2025-01-15',
          blocks: [maliciousData],
        });
        expect(result.blocks[0].label).toBe('Warm Up');
        expect(result.blocks[0].label).not.toContain('<script>');
      });

      it('should sanitize XSS in block notes', () => {
        const maliciousData = {
          notes: '<img src=x onerror=alert(1)>Dynamic stretching',
          exercises: [],
        };
        const result = CreateWorkoutSchema.parse({
          name: 'Workout',
          date: '2025-01-15',
          blocks: [maliciousData],
        });
        expect(result.blocks[0].notes).toBe('Dynamic stretching');
        expect(result.blocks[0].notes).not.toContain('<img');
      });
    });

    describe('CreateExerciseInstanceSchema', () => {
      it('should sanitize XSS in exercise prescription', () => {
        const maliciousData = {
          name: 'Workout',
          date: '2025-01-15',
          blocks: [
            {
              exercises: [
                {
                  exerciseId: '1',
                  orderInBlock: 0,
                  prescription: '<script>alert(1)</script>3 x 8-10',
                  sets: [{ setNumber: 1, weightUnit: 'lbs' as const }],
                },
              ],
            },
          ],
        };
        const result = CreateWorkoutSchema.parse(maliciousData);
        expect(result.blocks[0].exercises[0].prescription).toBe('3 x 8-10');
        expect(result.blocks[0].exercises[0].prescription).not.toContain('<script>');
      });

      it('should sanitize XSS in exercise notes', () => {
        const maliciousData = {
          name: 'Workout',
          date: '2025-01-15',
          blocks: [
            {
              exercises: [
                {
                  exerciseId: '1',
                  orderInBlock: 0,
                  notes: '<iframe src="evil.com"></iframe>Focus on form',
                  sets: [{ setNumber: 1, weightUnit: 'lbs' as const }],
                },
              ],
            },
          ],
        };
        const result = CreateWorkoutSchema.parse(maliciousData);
        expect(result.blocks[0].exercises[0].notes).toBe('Focus on form');
        expect(result.blocks[0].exercises[0].notes).not.toContain('<iframe');
      });
    });

    describe('CreateSetInstanceSchema', () => {
      it('should sanitize XSS in set notes', () => {
        const maliciousData = {
          name: 'Workout',
          date: '2025-01-15',
          blocks: [
            {
              exercises: [
                {
                  exerciseId: '1',
                  orderInBlock: 0,
                  sets: [
                    {
                      setNumber: 1,
                      weightUnit: 'lbs' as const,
                      notes: '<script>alert("set")</script>Felt strong',
                    },
                  ],
                },
              ],
            },
          ],
        };
        const result = CreateWorkoutSchema.parse(maliciousData);
        expect(result.blocks[0].exercises[0].sets[0].notes).toBe('Felt strong');
        expect(result.blocks[0].exercises[0].sets[0].notes).not.toContain('<script>');
      });
    });

    describe('UpdateSetInstanceSchema', () => {
      it('should sanitize XSS in set update notes', () => {
        const maliciousData = {
          notes: '<img src=x onerror=alert(1)>Updated notes',
        };
        const result = UpdateSetInstanceSchema.parse(maliciousData);
        expect(result.notes).toBe('Updated notes');
        expect(result.notes).not.toContain('<img');
      });
    });

    describe('CreateExerciseSchema', () => {
      it('should sanitize XSS in exercise name', () => {
        const maliciousData = {
          slug: 'bench-press',
          name: '<script>alert("exercise")</script>Bench Press',
        };
        const result = CreateExerciseSchema.parse(maliciousData);
        expect(result.name).toBe('Bench Press');
        expect(result.name).not.toContain('<script>');
      });
    });

    describe('UpdateExerciseSchema', () => {
      it('should sanitize XSS in exercise name update', () => {
        const maliciousData = {
          name: '<iframe src="evil.com"></iframe>Squat',
        };
        const result = UpdateExerciseSchema.parse(maliciousData);
        expect(result.name).toBe('Squat');
        expect(result.name).not.toContain('<iframe');
      });
    });
  });
});
