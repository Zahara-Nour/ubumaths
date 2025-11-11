/**
 * Student Dashboard Cache Types
 * ===============================
 *
 * Type definitions for the student dashboard caching system.
 *
 * ARCHITECTURE DECISION: Singleton Pattern
 * Unlike the teacher cache which must handle multiple classes and students,
 * the student cache uses a singleton pattern because:
 * - Students only see their own data
 * - No need for composite keys or multi-user caching
 * - Simpler API and better performance
 *
 * CACHE STRUCTURE:
 * The student cache is divided into 3 independent caches:
 *
 * 1. Profile Cache (StudentProfile)
 *    - TTL: 2 hours
 *    - Contains: Student info + class memberships
 *    - Updates: Infrequent (only when profile changes)
 *
 * 2. Rewards Cache (StudentRewards)
 *    - TTL: 10 minutes
 *    - Contains: Gidouilles balance + VIP cards
 *    - Updates: Frequent (after each reward action)
 *    - Supports: Optimistic updates for instant UI feedback
 *
 * 3. Warnings Cache (StudentWarnings)
 *    - TTL: 10 minutes per period
 *    - Contains: Warning counts + full warning objects
 *    - Keyed by: Academic period ID
 *    - Updates: When teachers add/remove warnings
 *
 * @see {StudentDashboardCache} in src/lib/stores/studentDashboardCache.svelte.ts
 */

import type { StudentVipCards } from './vip-card';
import type { Warning, StudentWarningCounts } from '$lib/server/warnings';

// ============================================================================
// BASIC TYPES (API Response Shapes)
// ============================================================================

/**
 * Student profile data
 *
 * Returned by:
 * - GET /api/student/profile
 * - +layout.server.ts load function
 *
 * Usage:
 * ```typescript
 * const profile = await studentCache.getProfile();
 * console.log(profile.classes); // Array of class memberships
 * ```
 */
export interface StudentProfile {
	/** Student's UUID from profiles table */
	id: string;
	/** Student's email address */
	email: string | null;
	/** Student's first name */
	firstname: string | null;
	/** Student's last name (optional) */
	lastname: string | null;
	/** Computed full name (firstname + lastname) */
	full_name: string | null;
	/** URL to student's avatar image (Supabase Storage or Gravatar) */
	avatar_url: string | null;
	/** Student's gender (for avatar generation) */
	gender: string | null;
	/** Student's grade level (e.g., "6ème", "5ème") */
	grade: string | null;
	/** Whether this is a test account (for development) */
	is_test: boolean;
	/** UUID of the school this student belongs to */
	school_id: string | null;
	/** Array of classes the student is enrolled in */
	classes: ClassMembership[];
}

/**
 * Class membership information
 *
 * Represents a student's enrollment in a class, including:
 * - Class details (name, active status)
 * - Teacher information
 * - Enrollment date
 *
 * Usage:
 * ```typescript
 * profile.classes.forEach(membership => {
 *   console.log(`${membership.class_name} - ${membership.teacher_name}`);
 * });
 * ```
 */
export interface ClassMembership {
	/** UUID of the class */
	class_id: string;
	/** Human-readable class name (e.g., "Mathématiques 6ème A") */
	class_name: string;
	/** Full name of the teacher (computed from profile) */
	teacher_name: string;
	/** UUID of the teacher */
	teacher_id: string;
	/** ISO timestamp of when student joined this class */
	joined_at: string;
	/** Whether the class is currently active */
	is_active: boolean;
}

/**
 * Student rewards data (gidouilles + VIP cards)
 *
 * Returned by:
 * - GET /api/student/rewards
 * - +layout.server.ts load function
 *
 * Usage:
 * ```typescript
 * const rewards = await studentCache.getRewards();
 * console.log(rewards.gidouilles); // Current balance
 * console.log(Object.keys(rewards.vip_cards).length); // Number of VIP cards
 * ```
 */
export interface StudentRewards {
	/** Current gidouilles balance (virtual currency) */
	gidouilles: number;
	/**
	 * VIP cards owned by the student
	 * Key: instanceId (UUID)
	 * Value: { cardId, earnedAt, usedAt }
	 */
	vip_cards: StudentVipCards;
}

/**
 * Student warnings data for a specific academic period
 *
 * Returned by:
 * - GET /api/student/warnings/[periodId]
 *
 * Contains both aggregated counts and full warning details.
 *
 * Usage:
 * ```typescript
 * const warnings = await studentCache.getWarnings(periodId);
 * console.log(warnings.counts); // { C: 2, M: 1, R: 0, T: 0 }
 * console.log(warnings.warnings); // Array of Warning objects
 * ```
 */
export interface StudentWarnings {
	/** Aggregated warning counts by type (C, M, R, T) */
	counts: StudentWarningCounts;
	/** Full array of warning objects with details */
	warnings: Warning[];
}

// ============================================================================
// CACHED DATA TYPES (Internal Cache Storage)
// ============================================================================

/**
 * Cached student profile (Cache 1)
 *
 * STORAGE:
 * Stored as a single object (singleton pattern)
 *
 * TTL: 2 hours (PROFILE_TTL)
 *
 * STRUCTURE:
 * {
 *   profile: StudentProfile,  // The actual data
 *   fetchedAt: 1699564800000  // Unix timestamp (Date.now())
 * }
 *
 * FRESHNESS CHECK:
 * ```typescript
 * const now = Date.now();
 * const isFresh = (now - cached.fetchedAt) < PROFILE_TTL;
 * ```
 */
export interface CachedProfile {
	/** The student profile data */
	profile: StudentProfile;
	/** Unix timestamp (milliseconds) when this data was fetched */
	fetchedAt: number;
}

/**
 * Cached rewards data (Cache 2)
 *
 * STORAGE:
 * Stored as a single object (singleton pattern)
 *
 * TTL: 10 minutes (REWARDS_TTL)
 *
 * OPTIMISTIC UPDATES:
 * This cache supports optimistic updates via:
 * - updateGidouillesOptimistic(delta)
 * - updateVipCardsOptimistic(vipCards)
 *
 * After optimistic updates, call invalidateRewards() + getRewards()
 * to sync with server truth.
 *
 * STRUCTURE:
 * {
 *   rewards: { gidouilles: 150, vip_cards: {...} },
 *   fetchedAt: 1699564800000
 * }
 */
export interface CachedRewards {
	/** The student rewards data (gidouilles + VIP cards) */
	rewards: StudentRewards;
	/** Unix timestamp (milliseconds) when this data was fetched */
	fetchedAt: number;
}

/**
 * Cached warnings data (Cache 3)
 *
 * STORAGE:
 * Stored in a Map<periodId, CachedWarnings>
 * Allows caching warnings for multiple academic periods simultaneously
 *
 * TTL: 10 minutes (WARNINGS_TTL) per period
 *
 * KEY FORMAT:
 * Map key is the academic period UUID (e.g., "abc-123-def-456")
 *
 * EXAMPLE:
 * ```typescript
 * warningsCache = new Map([
 *   ["fall-2024-uuid", { warnings: {...}, fetchedAt: 1699564800000 }],
 *   ["spring-2025-uuid", { warnings: {...}, fetchedAt: 1699565000000 }]
 * ]);
 * ```
 *
 * STRUCTURE:
 * {
 *   warnings: {
 *     counts: { C: 2, M: 1, R: 0, T: 0 },
 *     warnings: [...]
 *   },
 *   fetchedAt: 1699564800000
 * }
 */
export interface CachedWarnings {
	/** The student warnings data (counts + full warning objects) */
	warnings: StudentWarnings;
	/** Unix timestamp (milliseconds) when this data was fetched */
	fetchedAt: number;
}

// ============================================================================
// CACHE STATISTICS (Monitoring & Debugging)
// ============================================================================

/**
 * Cache statistics for monitoring and debugging
 *
 * Returned by: studentCache.getCacheStats()
 *
 * Usage:
 * ```typescript
 * const stats = studentCache.getCacheStats();
 * console.log(`Total entries: ${stats.totalEntries}`);
 * console.log(`Memory: ${stats.memoryEstimate}`);
 * ```
 *
 * For detailed console output, use:
 * ```typescript
 * studentCache.printCacheStats();
 * ```
 */
export interface CacheStats {
	/** Whether profile cache has data (true) or is empty (false) */
	profile: boolean;
	/** Whether rewards cache has data (true) or is empty (false) */
	rewards: boolean;
	/** Number of academic periods cached in warnings cache */
	warnings: number;
	/** Total number of cache entries across all caches */
	totalEntries: number;
	/** Approximate memory usage (e.g., "15 KB", "250 bytes") */
	memoryEstimate: string;
}

// Re-export types for convenience
export type { StudentWarningCounts, Warning, StudentVipCards };
