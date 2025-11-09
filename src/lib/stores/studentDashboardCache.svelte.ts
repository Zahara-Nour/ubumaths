/**
 * Student Dashboard Cache Store
 * ===============================
 *
 * Centralized caching system for student dashboard with 3 separate caches:
 * 1. Student Profile & Classes (2h TTL)
 * 2. Student Rewards (10min TTL + optimistic)
 * 3. Student Warnings (10min TTL, per period)
 *
 * FEATURES:
 * - Singleton pattern (student sees only their own data)
 * - Automatic TTL-based expiration
 * - Manual invalidation
 * - Optimistic UI updates for rewards
 * - Memory-efficient with auto-cleanup
 *
 * USAGE:
 * ```typescript
 * import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
 *
 * // Get rewards with auto-fetch
 * const rewards = await studentCache.getRewards();
 *
 * // Optimistic update
 * studentCache.updateGidouillesOptimistic(+5);
 *
 * // Manual invalidation
 * studentCache.invalidateRewards();
 * ```
 */

import type {
	StudentProfile,
	StudentRewards,
	StudentWarnings,
	CachedProfile,
	CachedRewards,
	CachedWarnings,
	CacheStats
} from '$lib/types/student-cache';
import type { StudentVipCards } from '$lib/types/vip-card';
import type { StudentWarningCounts } from '$lib/server/warnings';
import { createLogger } from '$lib/utils/logger';
import { browser } from '$app/environment';

// ============================================================================
// CACHE CLASS
// ============================================================================

export class StudentDashboardCache {
	// Cache stores (singleton - no keys needed)
	private profileCache: CachedProfile | null = $state(null);
	private rewardsCache: CachedRewards | null = $state(null);
	private warningsCache = $state(new Map<string, CachedWarnings>()); // Key: periodId

	// TTL configurations (in milliseconds)
	private readonly PROFILE_TTL = 2 * 60 * 60 * 1000; // 2 hours
	private readonly REWARDS_TTL = 10 * 60 * 1000; // 10 minutes
	private readonly WARNINGS_TTL = 10 * 60 * 1000; // 10 minutes

	// Monitoring (controlled by ENABLE_CACHE_MONITORING env variable)
	private readonly monitoringEnabled =
		browser && import.meta.env.VITE_ENABLE_CACHE_MONITORING === 'true';
	private readonly logger = createLogger('studentDashboardCache.svelte.ts', 'trace');

	/**
	 * Conditional logging helper
	 * Only logs if monitoring is enabled
	 * @private
	 */
	private log(level: 'trace' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]) {
		if (!this.monitoringEnabled) return;
		this.logger[level](message, ...args);
	}

	// ========================================================================
	// GETTERS (Async with auto-fetch)
	// ========================================================================

	/**
	 * Get student profile
	 * Auto-fetches if cache expired or missing
	 *
	 * @returns Promise resolving to student profile with classes
	 */
	async getProfile(): Promise<StudentProfile> {
		const startTime = performance.now();
		const cached = this.profileCache;
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.PROFILE_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Student profile (${elapsed}ms)`);
			return cached.profile;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log('info', `Cache MISS: Student profile (${ttlExpired}) - Fetching...`);

		// Fetch from API
		const profile = await this.fetchProfile();
		this.profileCache = { profile, fetchedAt: now };

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log('info', `Fetched student profile: ${profile.classes.length} classes (${elapsed}ms)`);
		return profile;
	}

	/**
	 * Get student rewards
	 * Auto-fetches if cache expired or missing
	 *
	 * @returns Promise resolving to student rewards
	 */
	async getRewards(): Promise<StudentRewards> {
		const startTime = performance.now();
		const cached = this.rewardsCache;
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.REWARDS_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Student rewards (${elapsed}ms)`);
			return cached.rewards;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log('info', `Cache MISS: Student rewards (${ttlExpired}) - Fetching...`);

		// Fetch from API
		const rewards = await this.fetchRewards();
		this.rewardsCache = { rewards, fetchedAt: now };

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log('info', `Fetched student rewards: ${rewards.gidouilles} gidouilles (${elapsed}ms)`);
		return rewards;
	}

	/**
	 * Get student warnings for a specific period
	 * Auto-fetches if cache expired or missing
	 *
	 * @param periodId - The academic period ID
	 * @returns Promise resolving to student warnings
	 */
	async getWarnings(periodId: string): Promise<StudentWarnings> {
		const startTime = performance.now();
		const cached = this.warningsCache.get(periodId);
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.WARNINGS_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Student warnings for period ${periodId} (${elapsed}ms)`);
			return cached.warnings;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log(
			'info',
			`Cache MISS: Student warnings for period ${periodId} (${ttlExpired}) - Fetching...`
		);

		// Fetch from API
		const warnings = await this.fetchWarnings(periodId);
		this.warningsCache.set(periodId, { warnings, fetchedAt: now });

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log(
			'info',
			`Fetched student warnings for period ${periodId}: ${warnings.warnings.length} warnings (${elapsed}ms)`
		);
		return warnings;
	}

	// ========================================================================
	// SYNC GETTERS (For $derived - no auto-fetch)
	// ========================================================================

	/**
	 * Get student profile synchronously
	 * Returns null if cache is empty or expired
	 * Use in $derived for reactive UI
	 *
	 * @returns Student profile or null
	 */
	getProfileSync(): StudentProfile | null {
		const cached = this.profileCache;
		const now = Date.now();

		if (cached && now - cached.fetchedAt < this.PROFILE_TTL) {
			return cached.profile;
		}

		return null;
	}

	/**
	 * Get student rewards synchronously
	 * Returns null if cache is empty or expired
	 * Use in $derived for reactive UI
	 *
	 * @returns Student rewards or null
	 */
	getRewardsSync(): StudentRewards | null {
		const cached = this.rewardsCache;
		const now = Date.now();

		if (cached && now - cached.fetchedAt < this.REWARDS_TTL) {
			return cached.rewards;
		}

		return null;
	}

	/**
	 * Get student warnings synchronously
	 * Returns null if cache is empty or expired
	 * Use in $derived for reactive UI
	 *
	 * @param periodId - The academic period ID
	 * @returns Student warnings or null
	 */
	getWarningsSync(periodId: string): StudentWarnings | null {
		const cached = this.warningsCache.get(periodId);
		const now = Date.now();

		if (cached && now - cached.fetchedAt < this.WARNINGS_TTL) {
			return cached.warnings;
		}

		return null;
	}

	// ========================================================================
	// OPTIMISTIC UPDATES (Instant UI feedback)
	// ========================================================================

	/**
	 * Update gidouilles optimistically (instant UI feedback)
	 *
	 * IMPORTANT: Call this BEFORE making the API request for instant UI update.
	 * After API succeeds, call invalidateRewards() + getRewards() to sync.
	 *
	 * @param delta - The change in gidouilles (positive or negative)
	 */
	updateGidouillesOptimistic(delta: number): void {
		const cached = this.rewardsCache;
		if (!cached) return;

		const currentGidouilles = cached.rewards.gidouilles;
		const newGidouilles = Math.max(0, currentGidouilles + delta);

		// Update cache with new gidouilles value
		this.rewardsCache = {
			...cached,
			rewards: {
				...cached.rewards,
				gidouilles: newGidouilles
			}
		};

		this.log(
			'trace',
			`[Cache] Optimistic gidouilles update: ${currentGidouilles} → ${newGidouilles} (${delta >= 0 ? '+' : ''}${delta})`
		);
	}

	/**
	 * Update VIP cards optimistically (instant UI feedback)
	 *
	 * IMPORTANT: Call this BEFORE making the API request for instant UI update.
	 * After API succeeds, call invalidateRewards() + getRewards() to sync.
	 *
	 * @param vipCards - The new VIP cards object
	 */
	updateVipCardsOptimistic(vipCards: StudentVipCards): void {
		const cached = this.rewardsCache;
		if (!cached) return;

		// Update cache with new VIP cards
		this.rewardsCache = {
			...cached,
			rewards: {
				...cached.rewards,
				vip_cards: vipCards
			}
		};

		this.log('trace', `[Cache] Optimistic VIP cards update`);
	}

	/**
	 * Update warnings optimistically (instant UI feedback)
	 *
	 * IMPORTANT: Call this BEFORE making the API request for instant UI update.
	 * After API succeeds, call invalidateWarnings() + getWarnings() to sync.
	 *
	 * @param periodId - The academic period ID
	 * @param counts - The new warning counts
	 */
	updateWarningsOptimistic(periodId: string, counts: StudentWarningCounts): void {
		const cached = this.warningsCache.get(periodId);
		if (!cached) return;

		// Update cache with new warning counts
		this.warningsCache.set(periodId, {
			...cached,
			warnings: {
				...cached.warnings,
				counts
			}
		});

		const total = counts.C + counts.M + counts.R + counts.T;
		this.log('trace', `[Cache] Optimistic warnings update for period ${periodId}: total ${total}`);
	}

	// ========================================================================
	// HYDRATION (Pre-fill from server load functions)
	// ========================================================================

	/**
	 * Hydrate profile cache from server data
	 * Use in +layout.server.ts to pre-populate cache
	 *
	 * @param profile - The student profile with classes
	 */
	hydrateProfile(profile: StudentProfile): void {
		this.profileCache = {
			profile,
			fetchedAt: Date.now()
		};
		this.log('trace', '[Cache] Hydrated profile cache');
	}

	/**
	 * Hydrate rewards cache from server data
	 * Use in +layout.server.ts to pre-populate cache
	 *
	 * @param rewards - The student rewards
	 */
	hydrateRewards(rewards: StudentRewards): void {
		this.rewardsCache = {
			rewards,
			fetchedAt: Date.now()
		};
		this.log('trace', '[Cache] Hydrated rewards cache');
	}

	/**
	 * Hydrate warnings cache from server data
	 * Use in +layout.server.ts to pre-populate cache
	 *
	 * @param periodId - The academic period ID
	 * @param warnings - The student warnings
	 */
	hydrateWarnings(periodId: string, warnings: StudentWarnings): void {
		this.warningsCache.set(periodId, {
			warnings,
			fetchedAt: Date.now()
		});
		this.log('trace', `[Cache] Hydrated warnings cache for period ${periodId}`);
	}

	// ========================================================================
	// INVALIDATION
	// ========================================================================

	/**
	 * Invalidate profile cache
	 */
	invalidateProfile(): void {
		this.profileCache = null;
		this.log('trace', 'Cache invalidated: profile');
	}

	/**
	 * Invalidate rewards cache
	 */
	invalidateRewards(): void {
		this.rewardsCache = null;
		this.log('trace', 'Cache invalidated: rewards');
	}

	/**
	 * Invalidate warnings cache for a specific period
	 *
	 * @param periodId - The academic period ID
	 */
	invalidateWarnings(periodId: string): void {
		this.warningsCache.delete(periodId);
		this.log('trace', 'Cache invalidated: warnings for period:', periodId);
	}

	/**
	 * Invalidate all warnings (all periods)
	 */
	invalidateAllWarnings(): void {
		this.warningsCache.clear();
		this.log('trace', 'Cache invalidated: all warnings');
	}

	/**
	 * Clear all caches
	 */
	invalidateAll(): void {
		this.profileCache = null;
		this.rewardsCache = null;
		this.warningsCache.clear();
		this.log('trace', 'Cache: All caches cleared');
	}

	// ========================================================================
	// API FETCH METHODS
	// ========================================================================

	/**
	 * Fetch student profile from API
	 * @private
	 */
	private async fetchProfile(): Promise<StudentProfile> {
		try {
			const response = await fetch('/api/student/profile');
			if (!response.ok) {
				throw new Error(`Failed to fetch profile: ${response.statusText}`);
			}
			const data = await response.json();
			return data.profile;
		} catch (error) {
			console.error('[Cache] Error fetching student profile:', error);
			// Return empty profile as fallback
			return {
				id: '',
				email: '',
				firstname: '',
				lastname: null,
				full_name: null,
				avatar_url: null,
				gender: null,
				grade: null,
				is_test: false,
				school_id: null,
				classes: []
			};
		}
	}

	/**
	 * Fetch student rewards from API
	 * @private
	 */
	private async fetchRewards(): Promise<StudentRewards> {
		try {
			const response = await fetch('/api/student/rewards');
			if (!response.ok) {
				throw new Error(`Failed to fetch rewards: ${response.statusText}`);
			}
			const data = await response.json();
			return data.rewards;
		} catch (error) {
			console.error('[Cache] Error fetching student rewards:', error);
			// Return empty rewards as fallback
			return {
				gidouilles: 0,
				vip_cards: {}
			};
		}
	}

	/**
	 * Fetch student warnings from API
	 * @private
	 */
	private async fetchWarnings(periodId: string): Promise<StudentWarnings> {
		try {
			const response = await fetch(`/api/student/warnings/${periodId}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch warnings: ${response.statusText}`);
			}
			const data = await response.json();
			return data.warnings;
		} catch (error) {
			console.error('[Cache] Error fetching student warnings:', error);
			// Return empty warnings as fallback
			return {
				counts: { C: 0, M: 0, R: 0, T: 0 },
				warnings: []
			};
		}
	}

	// ========================================================================
	// STATISTICS & MONITORING
	// ========================================================================

	/**
	 * Get cache statistics
	 * Useful for debugging and monitoring cache usage
	 *
	 * @returns Cache statistics object
	 */
	getCacheStats(): CacheStats {
		const profileExists = this.profileCache !== null;
		const rewardsExists = this.rewardsCache !== null;
		const warningsCount = this.warningsCache.size;
		const totalEntries = (profileExists ? 1 : 0) + (rewardsExists ? 1 : 0) + warningsCount;

		// Rough memory estimate (very approximate)
		let memoryBytes = 0;
		if (profileExists) memoryBytes += JSON.stringify(this.profileCache).length;
		if (rewardsExists) memoryBytes += JSON.stringify(this.rewardsCache).length;
		this.warningsCache.forEach((cached) => {
			memoryBytes += JSON.stringify(cached).length;
		});

		const memoryKB = (memoryBytes / 1024).toFixed(2);
		const memoryEstimate = memoryBytes < 1024 ? `${memoryBytes} bytes` : `${memoryKB} KB`;

		return {
			profile: profileExists,
			rewards: rewardsExists,
			warnings: warningsCount,
			totalEntries,
			memoryEstimate
		};
	}

	/**
	 * Print cache statistics to console
	 * Only works if monitoring is enabled
	 */
	printCacheStats(): void {
		if (!this.monitoringEnabled) {
			console.log('[Cache] Monitoring disabled. Enable with VITE_ENABLE_CACHE_MONITORING=true');
			return;
		}

		const stats = this.getCacheStats();
		console.log('┌─────────────────────────────────────┐');
		console.log('│   Student Dashboard Cache Stats    │');
		console.log('├─────────────────────────────────────┤');
		console.log(`│ Profile:    ${stats.profile ? '✓ cached' : '✗ empty'.padEnd(9)}             │`);
		console.log(`│ Rewards:    ${stats.rewards ? '✓ cached' : '✗ empty'.padEnd(9)}             │`);
		console.log(`│ Warnings:   ${String(stats.warnings).padEnd(9)} periods       │`);
		console.log(`│ Total:      ${String(stats.totalEntries).padEnd(9)} entries       │`);
		console.log(`│ Memory:     ${stats.memoryEstimate.padEnd(20)}│`);
		console.log('└─────────────────────────────────────┘');
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of the student dashboard cache
 * Use this throughout the student dashboard
 */
export const studentCache = new StudentDashboardCache();
