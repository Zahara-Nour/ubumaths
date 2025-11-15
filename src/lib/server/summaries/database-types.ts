/**
 * TEMPORARY TYPE DEFINITIONS FOR PHASE 1 MIGRATIONS
 * ==================================================
 *
 * These types are manually defined to match the Phase 1 migration schemas.
 * They will be REPLACED by auto-generated types after running:
 *   1. pnpm db:migrate (apply migrations to production)
 *   2. pnpm db:types (regenerate types from production schema)
 *
 * DO NOT use these types outside of src/lib/server/summaries/
 *
 * These definitions match the exact schemas from migrations:
 *   - 20251113140344_create_gidouilles_history_table.sql
 *   - 20251113140345_create_bonus_history_table.sql
 *   - 20251113140347_modify_student_warnings_soft_delete.sql
 *   - 20251113140346_create_vip_cards_activity_table.sql
 *   - 20251113140348_create_daily_summaries_table.sql
 *   - 20251113140349_create_weekly_rewards_table.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// =============================================================================
// Custom Types
// =============================================================================

/**
 * Week configuration for school schedules
 */
export interface WeekConfig {
	first_day: number; // 0-6 (Sunday-Saturday)
	last_day: number; // 0-6 (Sunday-Saturday)
	school_days: number[]; // Array of day numbers
	weekend_days: number[]; // Array of day numbers
}

// =============================================================================
// Table Row Types (SELECT queries)
// =============================================================================

/**
 * gidouilles_history table row type
 * Migration: 20251113140344_create_gidouilles_history_table.sql
 */
export interface GidouillesHistoryRow {
	id: string;
	student_id: string;
	class_id: string | null;
	delta: number;
	reason: string | null;
	created_by: string | null;
	created_at: string;
}

/**
 * bonus_history table row type
 * Migration: 20251113140345_create_bonus_history_table.sql
 */
export interface BonusHistoryRow {
	id: string;
	student_id: string;
	class_id: string | null;
	delta: number;
	reason: string | null;
	created_by: string | null;
	created_at: string;
}

/**
 * student_warnings with soft delete columns
 * Migration: 20251113140347_modify_student_warnings_soft_delete.sql
 *
 * Note: This extends the existing table with deleted_at and deleted_by columns
 */
export interface StudentWarningWithSoftDelete {
	id: string;
	student_id: string;
	class_id: string;
	reason: string;
	created_by: string | null;
	created_at: string;
	deleted_at: string | null; // NEW: Soft delete timestamp
	deleted_by: string | null; // NEW: Who deleted it
}

/**
 * vip_cards_activity table row type
 * Migration: 20251113140346_create_vip_cards_activity_table.sql
 */
export interface VipCardsActivityRow {
	id: string;
	student_id: string;
	card_instance_id: string;
	card_template_id: string;
	action: 'gained' | 'used' | 'removed';
	metadata: Record<string, unknown> | null;
	created_at: string;
}

/**
 * daily_summaries table row type
 * Migration: 20251113140348_create_daily_summaries_table.sql
 */
export interface DailySummaryRow {
	id: string;
	student_id: string;
	class_id: string;
	summary_date: string; // DATE field (YYYY-MM-DD)
	gidouilles_gained: number;
	gidouilles_lost: number;
	bonus_gained: number;
	bonus_used: number;
	warnings_issued: number;
	warnings_removed: number;
	vip_cards_gained: number;
	vip_cards_used: number;
	sent_at: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * weekly_rewards table row type
 * Migration: 20251113140349_create_weekly_rewards_table.sql
 */
export interface WeeklyRewardRow {
	id: string;
	student_id: string;
	class_id: string;
	week_start: string; // DATE field (YYYY-MM-DD)
	week_end: string; // DATE field (YYYY-MM-DD)
	gidouilles_awarded: number;
	reason: string;
	created_at: string;
}

// =============================================================================
// Table Insert Types (INSERT queries)
// =============================================================================

/**
 * gidouilles_history insert type
 */
export interface GidouillesHistoryInsert {
	student_id: string;
	class_id: string;
	delta: number;
	reason?: string | null;
	created_by?: string | null;
}

/**
 * bonus_history insert type
 */
export interface BonusHistoryInsert {
	student_id: string;
	class_id: string;
	delta: number;
	reason?: string | null;
	created_by?: string | null;
}

/**
 * vip_cards_activity insert type
 */
export interface VipCardsActivityInsert {
	student_id: string;
	card_instance_id: string;
	card_template_id: string;
	action: 'gained' | 'used' | 'removed';
	metadata?: Record<string, unknown> | null;
}

/**
 * daily_summaries insert type
 */
export interface DailySummaryInsert {
	student_id: string;
	class_id: string;
	summary_date: string; // YYYY-MM-DD format
	gidouilles_gained: number;
	gidouilles_lost: number;
	bonus_gained: number;
	bonus_used: number;
	warnings_issued: number;
	warnings_removed: number;
	vip_cards_gained: number;
	vip_cards_used: number;
	sent_at?: string | null;
}

/**
 * weekly_rewards insert type
 */
export interface WeeklyRewardInsert {
	student_id: string;
	class_id: string;
	week_start: string; // YYYY-MM-DD format
	week_end: string; // YYYY-MM-DD format
	gidouilles_awarded: number;
	reason?: string;
}

// =============================================================================
// RPC Function Types
// =============================================================================

/**
 * Parameters for update_student_gidouilles RPC function
 * Migration: 20251113140344_create_gidouilles_history_table.sql (lines 73-152)
 *
 * Signature:
 * CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
 *     p_student_id UUID,
 *     p_class_id UUID,      -- NOW REQUIRED (was optional before)
 *     p_delta INTEGER,
 *     p_reason TEXT DEFAULT NULL,
 *     p_created_by UUID DEFAULT NULL
 * )
 */
export interface UpdateStudentGidouillesParams {
	p_student_id: string;
	p_class_id: string; // CRITICAL: Now required in Phase 1
	p_delta: number;
	p_reason?: string | null;
	p_created_by?: string | null;
}

/**
 * Parameters for update_student_bonus RPC function
 * Migration: 20251113140345_create_bonus_history_table.sql (lines 73-152)
 *
 * Signature:
 * CREATE OR REPLACE FUNCTION public.update_student_bonus(
 *     p_student_id UUID,
 *     p_class_id UUID,      -- NOW REQUIRED (was optional before)
 *     p_delta INTEGER,
 *     p_reason TEXT DEFAULT NULL,
 *     p_created_by UUID DEFAULT NULL
 * )
 */
export interface UpdateStudentBonusParams {
	p_student_id: string;
	p_class_id: string; // CRITICAL: Now required in Phase 1
	p_delta: number;
	p_reason?: string | null;
	p_created_by?: string | null;
}

// =============================================================================
// Type-safe Supabase Client Helpers
// =============================================================================

/**
 * Extended Supabase client type that knows about new tables
 * Use this when you need to call .from() on new tables
 *
 * USAGE:
 * ```typescript
 * const client = supabase as unknown as DbClientWithNewTables;
 * const { data } = await client.from('gidouilles_history').select('*');
 * ```
 */
export type DbClientWithNewTables = SupabaseClient<Database>;

/**
 * Type guard to check if a value is a valid gidouilles_history record
 */
export function isGidouillesHistoryRow(value: unknown): value is GidouillesHistoryRow {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		'student_id' in value &&
		'delta' in value &&
		'created_at' in value
	);
}

/**
 * Type guard to check if a value is a valid VIP cards activity record
 */
export function isVipCardsActivityRow(value: unknown): value is VipCardsActivityRow {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		'student_id' in value &&
		'action' in value &&
		'created_at' in value
	);
}
