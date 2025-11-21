/**
 * Types for the Reward Journal feature
 *
 * This module defines types for the unified reward events audit trail system
 * that aggregates all reward movements (gidouilles, bonus, VIP cards,
 * achievements, items) into a single queryable format for student activity
 * tracking and journal display.
 */

import type { Json } from './database';

// ============================================================================
// ENUM TYPES (matching database enums)
// ============================================================================

/**
 * Types of rewards tracked in the system
 */
export type RewardType = 'gidouilles' | 'bonus' | 'vip_card' | 'achievement' | 'item';

/**
 * Types of events that can occur for rewards
 */
export type RewardEventType =
	| 'earned' // Gained through activity
	| 'spent' // Used for purchase
	| 'traded' // Exchanged with another player
	| 'used' // Consumed/activated
	| 'expired' // Time-limited item expired
	| 'unlocked' // Achievement unlocked
	| 'purchased' // Bought from shop
	| 'awarded' // Given by teacher/system
	| 'removed'; // Removed by teacher/system

// ============================================================================
// DATABASE ROW TYPE
// ============================================================================

/**
 * Represents a single reward event from the database
 */
export interface RewardEvent {
	id: string;
	student_id: string;
	reward_type: RewardType;
	event_type: RewardEventType;
	amount: number | null;
	item_name: string | null;
	description: string;
	metadata: Json;
	source_table: string;
	source_id: string | null;
	class_id: string | null;
	created_by: string | null;
	created_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Pagination metadata for paginated responses
 */
export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
}

/**
 * Response from the reward journal endpoints
 */
export interface RewardJournalResponse {
	events: RewardEvent[];
	pagination: PaginationMeta;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Filter options for querying reward events
 */
export interface RewardJournalFilters {
	reward_type?: RewardType;
	event_type?: RewardEventType;
	from?: string; // ISO date string
	to?: string; // ISO date string
}

/**
 * Full query parameters for reward journal
 */
export interface RewardJournalQueryParams extends RewardJournalFilters {
	page: number;
	limit: number;
}
