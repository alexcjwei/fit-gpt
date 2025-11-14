import { Kysely, sql } from 'kysely';
import { Database } from '../db/types';
import { Workout, WorkoutBlock, ExerciseInstance, SetInstance } from '../types';

/**
 * Convert database rows to nested Workout structure
 * This function handles the denormalization of JOINed data
 */
/**
 * Convert Date to ISO date string (YYYY-MM-DD)
 */
function toISODateString(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

/**
 * Convert Date to ISO timestamp string (full ISO 8601)
 */
function toISOTimestamp(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Convert null to undefined for optional fields
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert numeric string to number
 */
function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  if (typeof value === 'number') return value;
  return parseFloat(value);
}

function rowsToWorkout(rows: any[]): Workout | null {
  if (rows.length === 0) {
    return null;
  }

  // Group rows by workout -> block -> exercise -> set
  const workout: Workout = {
    id: rows[0].workout_id.toString(),
    name: rows[0].workout_name,
    date: toISODateString(rows[0].workout_date),
    lastModifiedTime: rows[0].workout_last_modified_time,
    notes: rows[0].workout_notes,
    blocks: [],
  };

  const blocksMap = new Map<string, WorkoutBlock>();
  const exercisesMap = new Map<string, ExerciseInstance>();

  for (const row of rows) {
    // Process block
    if (row.block_id) {
      const blockId = row.block_id.toString();
      if (!blocksMap.has(blockId)) {
        const block: WorkoutBlock = {
          id: blockId,
          label: row.block_label,
          exercises: [],
          notes: row.block_notes,
        };
        blocksMap.set(blockId, block);
        workout.blocks.push(block);
      }

      // Process exercise instance
      if (row.exercise_instance_id) {
        const exerciseInstanceId = row.exercise_instance_id.toString();
        if (!exercisesMap.has(exerciseInstanceId)) {
          const exercise: ExerciseInstance = {
            id: exerciseInstanceId,
            exerciseId: row.exercise_id.toString(),
            orderInBlock: row.order_in_block,
            sets: [],
            prescription: row.prescription,
            notes: row.exercise_notes,
          };
          exercisesMap.set(exerciseInstanceId, exercise);
          blocksMap.get(blockId)!.exercises.push(exercise);
        }

        // Process set instance
        if (row.set_id) {
          const set: SetInstance = {
            id: row.set_id.toString(),
            setNumber: row.set_number,
            reps: row.reps,
            weight: toNumber(row.weight),
            weightUnit: row.weight_unit,
            duration: row.duration,
            rpe: row.rpe,
            notes: row.set_notes,
          };
          exercisesMap.get(exerciseInstanceId)!.sets.push(set);
        }
      }
    }
  }

  return workout;
}

export interface CreateWorkoutData {
  userId: string;
  name: string;
  date: string;
  lastModifiedTime: string;
  notes?: string;
  blocks?: CreateWorkoutBlockData[];
}

export interface CreateWorkoutBlockData {
  label?: string;
  notes?: string;
  exercises?: CreateExerciseInstanceData[];
}

export interface CreateExerciseInstanceData {
  exerciseId: string;
  orderInBlock: number;
  prescription?: string;
  notes?: string;
  sets?: CreateSetInstanceData[];
}

export interface CreateSetInstanceData {
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  weightUnit: 'lbs' | 'kg';
  duration?: number | null;
  rpe?: number | null;
  notes?: string | null;
}

export interface UpdateWorkoutData {
  name?: string;
  date?: string;
  lastModifiedTime?: string;
  notes?: string;
}

export interface UpdateWorkoutBlockData {
  label?: string;
  notes?: string;
}

export interface UpdateExerciseInstanceData {
  exerciseId?: string;
  orderInBlock?: number;
  prescription?: string;
  notes?: string;
}

export interface UpdateSetInstanceData {
  setNumber?: number;
  reps?: number | null;
  weight?: number | null;
  weightUnit?: 'lbs' | 'kg';
  duration?: number | null;
  rpe?: number | null;
  notes?: string | null;
}

export class WorkoutRepository {
  constructor(private db: Kysely<Database>) {}

  /**
   * Create a workout with nested blocks, exercises, and sets
   */
  async create(data: CreateWorkoutData): Promise<Workout> {
    return await this.db.transaction().execute(async (trx) => {
      // Create workout
      const workout = await trx
        .insertInto('workouts')
        .values({
          user_id: BigInt(data.userId),
          name: data.name,
          date: data.date,
          last_modified_time: data.lastModifiedTime,
          notes: data.notes,
        })
        .returning(['id', 'name', 'date', 'last_modified_time', 'notes'])
        .executeTakeFirstOrThrow();

      const workoutObj: Workout = {
        id: workout.id.toString(),
        name: workout.name,
        date: toISODateString(workout.date),
        lastModifiedTime: toISOTimestamp(workout.last_modified_time),
        notes: nullToUndefined(workout.notes),
        blocks: [],
      };

      // Create blocks if provided
      if (data.blocks && data.blocks.length > 0) {
        for (let blockIndex = 0; blockIndex < data.blocks.length; blockIndex++) {
          const blockData = data.blocks[blockIndex];

          const block = await trx
            .insertInto('workout_blocks')
            .values({
              workout_id: workout.id,
              order_in_workout: blockIndex,
              label: blockData.label,
              notes: blockData.notes,
            })
            .returning(['id', 'label', 'notes'])
            .executeTakeFirstOrThrow();

          const blockObj: WorkoutBlock = {
            id: block.id.toString(),
            label: nullToUndefined(block.label),
            exercises: [],
            notes: nullToUndefined(block.notes),
          };

          // Create exercises if provided
          if (blockData.exercises && blockData.exercises.length > 0) {
            for (const exerciseData of blockData.exercises) {
              const exercise = await trx
                .insertInto('exercise_instances')
                .values({
                  workout_block_id: block.id,
                  exercise_id: BigInt(exerciseData.exerciseId),
                  order_in_block: exerciseData.orderInBlock,
                  prescription: exerciseData.prescription,
                  notes: exerciseData.notes,
                })
                .returning(['id', 'exercise_id', 'order_in_block', 'prescription', 'notes'])
                .executeTakeFirstOrThrow();

              const exerciseObj: ExerciseInstance = {
                id: exercise.id.toString(),
                exerciseId: exercise.exercise_id.toString(),
                orderInBlock: exercise.order_in_block,
                sets: [],
                prescription: nullToUndefined(exercise.prescription),
                notes: nullToUndefined(exercise.notes),
              };

              // Create sets if provided
              if (exerciseData.sets && exerciseData.sets.length > 0) {
                for (const setData of exerciseData.sets) {
                  const set = await trx
                    .insertInto('set_instances')
                    .values({
                      exercise_instance_id: exercise.id,
                      set_number: setData.setNumber,
                      reps: setData.reps,
                      weight: setData.weight,
                      weight_unit: setData.weightUnit,
                      duration: setData.duration,
                      rpe: setData.rpe,
                      notes: setData.notes,
                    })
                    .returning(['id', 'set_number', 'reps', 'weight', 'weight_unit', 'duration', 'rpe', 'notes'])
                    .executeTakeFirstOrThrow();

                  const setObj: SetInstance = {
                    id: set.id.toString(),
                    setNumber: set.set_number,
                    reps: set.reps,
                    weight: toNumber(set.weight),
                    weightUnit: set.weight_unit,
                    duration: set.duration,
                    rpe: set.rpe,
                    notes: set.notes,
                  };

                  exerciseObj.sets.push(setObj);
                }
              }

              blockObj.exercises.push(exerciseObj);
            }
          }

          workoutObj.blocks.push(blockObj);
        }
      }

      return workoutObj;
    });
  }

  /**
   * Find workout by ID with all nested data
   */
  async findById(id: string): Promise<Workout | null> {
    const rows = await this.db
      .selectFrom('workouts as w')
      .leftJoin('workout_blocks as wb', 'wb.workout_id', 'w.id')
      .leftJoin('exercise_instances as ei', 'ei.workout_block_id', 'wb.id')
      .leftJoin('set_instances as si', 'si.exercise_instance_id', 'ei.id')
      .select([
        'w.id as workout_id',
        'w.name as workout_name',
        'w.date as workout_date',
        'w.last_modified_time as workout_last_modified_time',
        'w.notes as workout_notes',
        'wb.id as block_id',
        'wb.label as block_label',
        'wb.order_in_workout as block_order',
        'wb.notes as block_notes',
        'ei.id as exercise_instance_id',
        'ei.exercise_id',
        'ei.order_in_block',
        'ei.prescription',
        'ei.notes as exercise_notes',
        'si.id as set_id',
        'si.set_number',
        'si.reps',
        'si.weight',
        'si.weight_unit',
        'si.duration',
        'si.rpe',
        'si.notes as set_notes',
      ])
      .where('w.id', '=', BigInt(id))
      .orderBy('wb.order_in_workout', 'asc')
      .orderBy('ei.order_in_block', 'asc')
      .orderBy('si.set_number', 'asc')
      .execute();

    return rowsToWorkout(rows);
  }

  /**
   * Find all workouts for a user
   */
  async findByUserId(userId: string): Promise<Workout[]> {
    // First get all workout IDs for the user
    const workoutRows = await this.db
      .selectFrom('workouts')
      .select('id')
      .where('user_id', '=', BigInt(userId))
      .orderBy('date', 'desc')
      .execute();

    const workouts: Workout[] = [];
    for (const workoutRow of workoutRows) {
      const workout = await this.findById(workoutRow.id.toString());
      if (workout) {
        workouts.push(workout);
      }
    }

    return workouts;
  }

  /**
   * Update workout basic fields (not nested data)
   */
  async update(id: string, updates: UpdateWorkoutData): Promise<Workout | null> {
    const updateData: any = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.date !== undefined) {
      updateData.date = updates.date;
    }
    if (updates.lastModifiedTime !== undefined) {
      updateData.last_modified_time = updates.lastModifiedTime;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes ?? null;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await this.db
      .updateTable('workouts')
      .set(updateData)
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete workout by ID (CASCADE deletes all nested data)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('workouts')
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Add a block to a workout
   */
  async addBlock(workoutId: string, block: CreateWorkoutBlockData): Promise<WorkoutBlock> {
    return await this.db.transaction().execute(async (trx) => {
      // Get current max order
      const result = await trx
        .selectFrom('workout_blocks')
        .select(sql<number>`COALESCE(MAX(order_in_workout), -1)`.as('max_order'))
        .where('workout_id', '=', BigInt(workoutId))
        .executeTakeFirst();

      const newOrder = (result?.max_order ?? -1) + 1;

      // Create block
      const newBlock = await trx
        .insertInto('workout_blocks')
        .values({
          workout_id: BigInt(workoutId),
          order_in_workout: newOrder,
          label: block.label,
          notes: block.notes,
        })
        .returning(['id', 'label', 'notes'])
        .executeTakeFirstOrThrow();

      return {
        id: newBlock.id.toString(),
        label: nullToUndefined(newBlock.label),
        exercises: [],
        notes: nullToUndefined(newBlock.notes),
      };
    });
  }

  /**
   * Update a workout block
   */
  async updateBlock(blockId: string, updates: UpdateWorkoutBlockData): Promise<WorkoutBlock | null> {
    const updateData: any = {};

    if (updates.label !== undefined) {
      updateData.label = updates.label ?? null;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes ?? null;
    }

    const result = await this.db
      .updateTable('workout_blocks')
      .set(updateData)
      .where('id', '=', BigInt(blockId))
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    // Get exercises for this block
    const exercises = await this.db
      .selectFrom('exercise_instances as ei')
      .leftJoin('set_instances as si', 'si.exercise_instance_id', 'ei.id')
      .select([
        'ei.id as exercise_id',
        'ei.exercise_id as exercise_ref_id',
        'ei.order_in_block',
        'ei.prescription',
        'ei.notes as exercise_notes',
        'si.id as set_id',
        'si.set_number',
        'si.reps',
        'si.weight',
        'si.weight_unit',
        'si.duration',
        'si.rpe',
        'si.notes as set_notes',
      ])
      .where('ei.workout_block_id', '=', result.id)
      .orderBy('ei.order_in_block', 'asc')
      .orderBy('si.set_number', 'asc')
      .execute();

    // Build exercise instances with sets
    const exerciseMap = new Map<string, ExerciseInstance>();
    for (const row of exercises) {
      const exerciseId = row.exercise_id.toString();
      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          id: exerciseId,
          exerciseId: row.exercise_ref_id.toString(),
          orderInBlock: row.order_in_block,
          sets: [],
          prescription: nullToUndefined(row.prescription),
          notes: nullToUndefined(row.exercise_notes),
        });
      }

      if (row.set_id) {
        exerciseMap.get(exerciseId)!.sets.push({
          id: row.set_id.toString(),
          setNumber: row.set_number!,
          reps: row.reps ?? undefined,
          weight: toNumber(row.weight) ?? undefined,
          weightUnit: row.weight_unit!,
          duration: row.duration ?? undefined,
          rpe: row.rpe ?? undefined,
          notes: nullToUndefined(row.set_notes),
        });
      }
    }

    return {
      id: result.id.toString(),
      label: nullToUndefined(result.label),
      exercises: Array.from(exerciseMap.values()),
      notes: nullToUndefined(result.notes),
    };
  }

  /**
   * Delete a workout block
   */
  async deleteBlock(blockId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('workout_blocks')
      .where('id', '=', BigInt(blockId))
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Add an exercise instance to a block
   */
  async addExerciseToBlock(blockId: string, exercise: CreateExerciseInstanceData): Promise<ExerciseInstance> {
    const result = await this.db
      .insertInto('exercise_instances')
      .values({
        workout_block_id: BigInt(blockId),
        exercise_id: BigInt(exercise.exerciseId),
        order_in_block: exercise.orderInBlock,
        prescription: exercise.prescription,
        notes: exercise.notes,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id.toString(),
      exerciseId: result.exercise_id.toString(),
      orderInBlock: result.order_in_block,
      sets: [],
      prescription: nullToUndefined(result.prescription),
      notes: nullToUndefined(result.notes),
    };
  }

  /**
   * Update an exercise instance
   */
  async updateExerciseInstance(
    exerciseInstanceId: string,
    updates: UpdateExerciseInstanceData
  ): Promise<ExerciseInstance | null> {
    const updateData: any = {};

    if (updates.exerciseId !== undefined) {
      updateData.exercise_id = BigInt(updates.exerciseId);
    }
    if (updates.orderInBlock !== undefined) {
      updateData.order_in_block = updates.orderInBlock;
    }
    if (updates.prescription !== undefined) {
      updateData.prescription = updates.prescription ?? null;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes ?? null;
    }

    const result = await this.db
      .updateTable('exercise_instances')
      .set(updateData)
      .where('id', '=', BigInt(exerciseInstanceId))
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    // Get sets for this exercise instance
    const sets = await this.db
      .selectFrom('set_instances')
      .selectAll()
      .where('exercise_instance_id', '=', result.id)
      .orderBy('set_number', 'asc')
      .execute();

    return {
      id: result.id.toString(),
      exerciseId: result.exercise_id.toString(),
      orderInBlock: result.order_in_block,
      sets: sets.map((s) => ({
        id: s.id.toString(),
        setNumber: s.set_number,
        reps: s.reps ?? undefined,
        weight: toNumber(s.weight) ?? undefined,
        weightUnit: s.weight_unit,
        duration: s.duration ?? undefined,
        rpe: s.rpe ?? undefined,
        notes: nullToUndefined(s.notes),
      })),
      prescription: nullToUndefined(result.prescription),
      notes: nullToUndefined(result.notes),
    };
  }

  /**
   * Delete an exercise instance
   */
  async deleteExerciseInstance(exerciseInstanceId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('exercise_instances')
      .where('id', '=', BigInt(exerciseInstanceId))
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Add a set to an exercise instance
   */
  async addSet(exerciseInstanceId: string, set: CreateSetInstanceData): Promise<SetInstance> {
    const result = await this.db
      .insertInto('set_instances')
      .values({
        exercise_instance_id: BigInt(exerciseInstanceId),
        set_number: set.setNumber,
        reps: set.reps ?? null,
        weight: set.weight ?? null,
        weight_unit: set.weightUnit,
        duration: set.duration ?? null,
        rpe: set.rpe ?? null,
        notes: set.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id.toString(),
      setNumber: result.set_number,
      reps: result.reps ?? undefined,
      weight: toNumber(result.weight) ?? undefined,
      weightUnit: result.weight_unit,
      duration: result.duration ?? undefined,
      rpe: result.rpe ?? undefined,
      notes: nullToUndefined(result.notes),
    };
  }

  /**
   * Update a set instance
   */
  async updateSet(setId: string, updates: UpdateSetInstanceData): Promise<SetInstance | null> {
    const updateData: any = {};

    if (updates.setNumber !== undefined) {
      updateData.set_number = updates.setNumber;
    }
    if (updates.reps !== undefined) {
      updateData.reps = updates.reps ?? null;
    }
    if (updates.weight !== undefined) {
      updateData.weight = updates.weight ?? null;
    }
    if (updates.weightUnit !== undefined) {
      updateData.weight_unit = updates.weightUnit;
    }
    if (updates.duration !== undefined) {
      updateData.duration = updates.duration ?? null;
    }
    if (updates.rpe !== undefined) {
      updateData.rpe = updates.rpe ?? null;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes ?? null;
    }

    const result = await this.db
      .updateTable('set_instances')
      .set(updateData)
      .where('id', '=', BigInt(setId))
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return {
      id: result.id.toString(),
      setNumber: result.set_number,
      reps: result.reps ?? undefined,
      weight: toNumber(result.weight) ?? undefined,
      weightUnit: result.weight_unit,
      duration: result.duration ?? undefined,
      rpe: result.rpe ?? undefined,
      notes: nullToUndefined(result.notes),
    };
  }

  /**
   * Delete a set instance
   */
  async deleteSet(setId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('set_instances')
      .where('id', '=', BigInt(setId))
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find workout ID by block ID
   */
  async findWorkoutIdByBlockId(blockId: string): Promise<string | null> {
    const result = await this.db
      .selectFrom('workout_blocks')
      .select('workout_id')
      .where('id', '=', BigInt(blockId))
      .executeTakeFirst();

    return result ? result.workout_id.toString() : null;
  }

  /**
   * Find workout ID by exercise instance ID
   */
  async findWorkoutIdByExerciseId(exerciseId: string): Promise<string | null> {
    const result = await this.db
      .selectFrom('exercise_instances as ei')
      .innerJoin('workout_blocks as wb', 'wb.id', 'ei.workout_block_id')
      .select('wb.workout_id')
      .where('ei.id', '=', BigInt(exerciseId))
      .executeTakeFirst();

    return result ? result.workout_id.toString() : null;
  }

  /**
   * Find workout ID by set instance ID
   */
  async findWorkoutIdBySetId(setId: string): Promise<string | null> {
    const result = await this.db
      .selectFrom('set_instances as si')
      .innerJoin('exercise_instances as ei', 'ei.id', 'si.exercise_instance_id')
      .innerJoin('workout_blocks as wb', 'wb.id', 'ei.workout_block_id')
      .select('wb.workout_id')
      .where('si.id', '=', BigInt(setId))
      .executeTakeFirst();

    return result ? result.workout_id.toString() : null;
  }
}
