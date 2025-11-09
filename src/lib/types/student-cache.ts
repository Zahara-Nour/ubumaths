/**
 * Student Dashboard Cache Types
 * ===============================
 *
 * Type definitions for the student dashboard caching system.
 *
 * ARCHITECTURE:
 * - Singleton cache (student only sees their own data)
 * - 3 separate caches with different TTLs
 * - Optimized for student dashboard performance
 * - Supports optimistic UI updates for rewards and VIP cards
 */

import type { StudentVipCards } from './vip-card';
import type { Warning, StudentWarningCounts } from '$lib/server/warnings';

// ============================================================================
// BASIC TYPES
// ============================================================================

/**
 * Student profile data
 */
export interface StudentProfile {
	id: string;
	email: string;
	firstname: string;
	lastname: string | null;
	full_name: string | null;
	avatar_url: string | null;
	gender: string | null;
	grade: string | null;
	is_test: boolean;
	school_id: string | null;
	classes: ClassMembership[];
}

/**
 * Class membership information
 */
export interface ClassMembership {
	class_id: string;
	class_name: string;
	teacher_name: string;
	teacher_id: string;
	joined_at: string;
	is_active: boolean;
}

/**
 * Student rewards data (gidouilles + VIP cards)
 */
export interface StudentRewards {
	gidouilles: number;
	vip_cards: StudentVipCards;
}

/**
 * Student warnings data for a specific period
 */
export interface StudentWarnings {
	counts: StudentWarningCounts;
	warnings: Warning[];
}

// ============================================================================
// CACHED DATA TYPES
// ============================================================================

/**
 * Cached student profile (Cache 1)
 */
export interface CachedProfile {
	profile: StudentProfile;
	fetchedAt: number;
}

/**
 * Cached rewards data (Cache 2)
 * Supports optimistic updates for instant UI feedback
 */
export interface CachedRewards {
	rewards: StudentRewards;
	fetchedAt: number;
}

/**
 * Cached warnings data (Cache 3)
 * Key format: periodId
 * Stores both counts and full warning objects
 */
export interface CachedWarnings {
	warnings: StudentWarnings;
	fetchedAt: number;
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
	profile: boolean;
	rewards: boolean;
	warnings: number; // Count of periods cached
	totalEntries: number;
	memoryEstimate: string;
}

// Re-export types for convenience
export type { StudentWarningCounts, Warning, StudentVipCards };
