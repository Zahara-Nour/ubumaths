/**
 * Database Helper Types
 * =====================
 *
 * This file contains convenience type aliases derived from the auto-generated database.ts.
 * These types are NOT auto-generated and will persist across database type regenerations.
 *
 * IMPORTANT: Do NOT add these types to database.ts as that file is auto-generated
 * by `pnpm db:types` (supabase gen types typescript) and will be overwritten.
 *
 * ## Why This File Exists
 *
 * `database.ts` is auto-generated from the PostgreSQL schema. Any manual additions
 * are lost on regeneration. This file provides a stable location for:
 *
 * 1. **Convenience aliases** - Shorter, more readable type names
 * 2. **Composite types** - Structures combining data from multiple sources
 * 3. **Union types** - Constrained string values for type safety
 *
 * ## Types of Definitions
 *
 * | Type                          | Origin              | Where to define        |
 * |-------------------------------|---------------------|------------------------|
 * | `Database`, `Tables<>`, `Json`| Auto-generated      | database.ts (don't touch) |
 * | `type X = Tables<'table'>`    | Derived (alias)     | HERE (database-helpers.ts) |
 * | `interface X { ... }`         | Composite/custom    | HERE (database-helpers.ts) |
 * | `type X = 'a' \| 'b'`         | Union (constrained) | HERE (database-helpers.ts) |
 *
 * ## Examples
 *
 * ### 1. Convenience Alias (reduces verbosity)
 * ```typescript
 * // BEFORE (verbose)
 * const user: Database['public']['Tables']['profiles']['Row'] = ...
 *
 * // AFTER (readable)
 * export type Profile = Tables<'profiles'>;
 * const user: Profile = ...
 * ```
 *
 * ### 2. Composite Type (data enriched in code, not from DB directly)
 * ```typescript
 * // Combines friendship row + joined profile + presence data
 * export interface FriendshipWithProfile {
 *   id: string;
 *   status: FriendshipStatus;
 *   friend_profile: FriendProfile;  // Manually joined data
 * }
 * ```
 *
 * ### 3. Union Type (constrains string values)
 * ```typescript
 * // In DB it's just "string", but we know the valid values
 * export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';
 * ```
 *
 * ## When to Add Types Here
 *
 * Add a type here if:
 * - You need a shorter alias for `Tables<'table_name'>`
 * - You're building a composite structure from multiple DB queries
 * - You want type-safe constraints on string enum values
 * - The type would otherwise be lost on `pnpm db:types` regeneration
 */

import type { Tables } from './database';
import type { QuestionTemplate } from '$lib/questions/types';

// ============================================================================
// Table Row Type Aliases
// ============================================================================

/** Class table row type alias */
export type Class = Tables<'classes'>;

/** Migration edit row type alias */
export type MigrationEdit = Tables<'migration_edits'>;

/** Class schedule table row type alias */
export type ClassSchedule = Tables<'class_schedules'>;

/** Profile table row type alias */
export type Profile = Tables<'profiles'>;

/** Student buddy table row type alias */
export type StudentBuddy = Tables<'student_buddies'>;

/** Buddy skin table row type alias */
export type BuddySkin = Tables<'buddy_skins'>;

/** Parody evaluation table row type alias */
export type ParodyEvaluation = Tables<'parody_evaluations'>;

// ============================================================================
// VIP Card Types
// ============================================================================

/** Activation context for self-activatable VIP cards */
export type ActivationContext = 'any' | 'minesweeper';

// ============================================================================
// Friendship Types
// ============================================================================

/** Friendship status: pending, accepted, or rejected */
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

/** Friendship relation type: friend, classmate, etc. */
export type FriendshipRelationType = 'friend' | 'classmate' | 'study_buddy';

/** Friend profile information for display */
export interface FriendProfile {
	id: string;
	full_name: string | null;
	firstname: string | null;
	lastname: string | null;
	avatar_url: string | null;
	role: 'student' | 'teacher' | 'admin';
	presence?: {
		is_online: boolean;
		last_seen: string;
	};
}

/** Friendship with enriched friend profile data */
export interface FriendshipWithProfile {
	id: string;
	status: FriendshipStatus;
	friendship_type: FriendshipRelationType;
	created_at: string;
	updated_at: string;
	requester_id: string;
	addressee_id: string;
	friend_profile: FriendProfile;
}

// ============================================================================
// Migration Edit Types
// ============================================================================

/**
 * Migration edit with properly typed edited_json field.
 *
 * The database stores edited_json as JSONB, but we know it's a QuestionTemplate.
 */
export interface MigrationEditWithTemplate {
	id: string;
	migration_tracking_id: string;
	old_question_hash: string;
	edited_json: Partial<QuestionTemplate>;
	editor_id: string;
	edit_notes: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Input type for creating/updating a migration edit
 */
export interface MigrationEditInput {
	editedTransformed: Partial<QuestionTemplate>;
	notes?: string;
}

// ============================================================================
// Kanban Types
// ============================================================================
//
// Row aliases come from the auto-generated database.ts; the Insert/Update
// helpers + composite types live here per CLAUDE.md rule 6.
// ============================================================================

/** Kanban board row. class_id NULL = personal board; NOT NULL = class board. */
export type KanbanBoard = Tables<'kanban_boards'>;

/** Kanban column row (lives inside a board). */
export type KanbanColumn = Tables<'kanban_columns'>;

/** Kanban card row (lives inside a column). */
export type KanbanCard = Tables<'kanban_cards'>;

/** Insert payload for kanban_boards (id + timestamps optional, defaulted by DB). */
export type KanbanBoardInsert = Omit<KanbanBoard, 'id' | 'created_at' | 'updated_at'> & {
	id?: string;
	created_at?: string;
	updated_at?: string;
};

/**
 * Update payload for kanban_boards. `class_id` is intentionally immutable
 * post-creation: changing it would silently grant/revoke board access to class
 * members, which is a confusing UX. Convert via a dedicated endpoint if needed.
 */
export type KanbanBoardUpdate = Partial<
	Omit<KanbanBoard, 'id' | 'owner_id' | 'class_id' | 'created_at'>
>;

/** Insert payload for kanban_columns. */
export type KanbanColumnInsert = Omit<KanbanColumn, 'id' | 'created_at'> & {
	id?: string;
	created_at?: string;
};

/** Update payload for kanban_columns. */
export type KanbanColumnUpdate = Partial<Omit<KanbanColumn, 'id' | 'board_id' | 'created_at'>>;

/** Insert payload for kanban_cards. */
export type KanbanCardInsert = Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'> & {
	id?: string;
	created_at?: string;
	updated_at?: string;
};

/** Update payload for kanban_cards. */
export type KanbanCardUpdate = Partial<Omit<KanbanCard, 'id' | 'column_id' | 'created_at'>>;

/**
 * Composite type used by the board list endpoint: a board enriched with the
 * number of columns and cards it contains (counted server-side). NOT a DB row.
 */
export interface KanbanBoardWithCounts extends KanbanBoard {
	column_count: number;
	card_count: number;
}
