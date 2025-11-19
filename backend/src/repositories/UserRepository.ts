import { Kysely } from 'kysely';
import { Database } from '../db/types';
import { User, UserWithPassword } from '../types';

/**
 * Convert database user row to User domain type (excludes password)
 */
function toUser(row: any): User {
  return {
    id: row.id.toString(),
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database user row to UserWithPassword (includes password)
 */
function toUserWithPassword(row: any): UserWithPassword {
  return {
    id: row.id.toString(),
    email: row.email,
    name: row.name,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
}

/**
 * Create a User Repository with injected database dependency
 * Factory function pattern for dependency injection
 */
export function createUserRepository(db: Kysely<Database>) {
  return {
    /**
     * Create a new user
     */
    async create(data: CreateUserData): Promise<User> {
      const result = await db
        .insertInto('users')
        .values({
          email: data.email.toLowerCase().trim(),
          password: data.password,
          name: data.name.trim(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toUser(result);
    },

    /**
     * Find user by ID (excludes password)
     */
    async findById(id: string): Promise<User | null> {
      const result = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', BigInt(id))
        .executeTakeFirst();

      return result ? toUser(result) : null;
    },

    /**
     * Find user by email (excludes password)
     */
    async findByEmail(email: string): Promise<User | null> {
      const result = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email.toLowerCase().trim())
        .executeTakeFirst();

      return result ? toUser(result) : null;
    },

    /**
     * Find user by ID including password (for authentication)
     */
    async findByIdWithPassword(id: string): Promise<UserWithPassword | null> {
      const result = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', BigInt(id))
        .executeTakeFirst();

      return result ? toUserWithPassword(result) : null;
    },

    /**
     * Find user by email including password (for authentication)
     */
    async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
      const result = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email.toLowerCase().trim())
        .executeTakeFirst();

      return result ? toUserWithPassword(result) : null;
    },

    /**
     * Update user by ID
     */
    async update(id: string, updates: UpdateUserData): Promise<User | null> {
      // Build update object with only provided fields
      const updateData: any = {};

      if (updates.email !== undefined) {
        updateData.email = updates.email.toLowerCase().trim();
      }
      if (updates.password !== undefined) {
        updateData.password = updates.password;
      }
      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
      }

      // Always update the updated_at timestamp
      updateData.updated_at = new Date();

      const result = await db
        .updateTable('users')
        .set(updateData)
        .where('id', '=', BigInt(id))
        .returningAll()
        .executeTakeFirst();

      return result ? toUser(result) : null;
    },

    /**
     * Delete user by ID
     */
    async delete(id: string): Promise<boolean> {
      const result = await db
        .deleteFrom('users')
        .where('id', '=', BigInt(id))
        .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
    },

    /**
     * Check if user exists by email
     */
    async existsByEmail(email: string): Promise<boolean> {
      const result = await db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email.toLowerCase().trim())
        .executeTakeFirst();

      return !!result;
    },
  };
}

/**
 * Type definition for UserRepository (inferred from factory return type)
 */
export type UserRepository = ReturnType<typeof createUserRepository>;
