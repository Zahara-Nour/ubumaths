/**
 * Teacher Dashboard Cache Types
 * ===============================
 *
 * Type definitions for the teacher dashboard caching system.
 *
 * ARCHITECTURE:
 * - 5 separate caches with different TTLs
 * - Optimized for teacher dashboard performance
 * - Supports optimistic UI updates with SvelteMap reactivity
 */

import type { StudentVipCards } from './vip-card';
import type { Warning, StudentWarningCounts } from '$lib/server/warnings';
import type { Database } from './database';
import type { SvelteMap } from 'svelte/reactivity';

// ============================================================================
// BASIC TYPES
// ============================================================================

/**
 * Minimal student data (for lists, basic info)
 */
export interface BasicStudent {
	id: string;
	firstname: string;
	lastname: string | null;
	full_name: string | null;
	avatar_url: string | null;
	role: string | null;
	is_test: boolean;
}

/**
 * Student rewards data (gidouilles + bonus + VIP cards)
 */
export interface StudentRewards {
	gidouilles: number;
	bonus: number;
	vip_cards: StudentVipCards;
}

/**
 * Class schedule entry
 */
export interface ClassSchedule {
	id: string;
	class_id: string;
	teacher_id: string;
	day_of_week: number;
	period_number: number | null;
	start_time: string;
	end_time: string;
	subject: string | null;
	room: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Class information with metadata
 */
export interface ClassInfo {
	id: string;
	teacher_id: string;
	name: string;
	description: string | null;
	join_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	student_count: number;
	schedules: ClassSchedule[];
}

/**
 * Academic period type
 */
export type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

/**
 * School type
 */
export type School = Database['public']['Tables']['schools']['Row'];

/**
 * School information with periods
 */
export interface SchoolInfo {
	school: School;
	current_period: AcademicPeriod | null;
	all_periods: AcademicPeriod[];
}

// ============================================================================
// CACHED DATA TYPES
// ============================================================================

/**
 * Cached student list (Cache 1)
 */
export interface CachedStudents {
	students: BasicStudent[];
	fetchedAt: number;
}

/**
 * Cached rewards data (Cache 2A)
 * Uses SvelteMap for reactive optimistic updates
 */
export interface CachedRewards {
	rewards: SvelteMap<string, StudentRewards>;
	fetchedAt: number;
}

/**
 * Cached warnings data (Cache 2B)
 * Key format: `${classId}:${periodId}`
 * Uses SvelteMap for reactive optimistic updates
 *
 * Stores only counts per type - total/score calculated on-the-fly
 */
export interface CachedWarnings {
	warnings: SvelteMap<string, StudentWarningCounts>;
	fetchedAt: number;
}

/**
 * Cached class information (Cache 3)
 */
export interface CachedClass {
	classInfo: ClassInfo;
	fetchedAt: number;
}

/**
 * Cached school information (Cache 4)
 */
export interface CachedSchool {
	schoolInfo: SchoolInfo;
	fetchedAt: number;
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
	students: number;
	rewards: number;
	warnings: number;
	classes: number;
	school: number;
	periods: number;
	totalEntries: number;
	memoryEstimate: string;
}

// Re-export types for convenience
export type { StudentWarningCounts, Warning };
