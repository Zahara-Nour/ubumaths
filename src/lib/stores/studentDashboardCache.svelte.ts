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

/**
 * StudentDashboardCache manages client-side caching for student dashboard data.
 *
 * ARCHITECTURE DECISION: Singleton Pattern
 * - Students only see their own data (unlike teachers who see multiple classes)
 * - No need for composite keys or multi-user caching
 * - Simpler API compared to TeacherDashboardCache
 *
 * CACHE STRATEGY:
 * 1. Profile Cache (2h TTL): Student info + class memberships
 *    - Long TTL because profile data rarely changes
 *    - Includes: name, email, avatar, classes enrolled in
 *
 * 2. Rewards Cache (10min TTL): Gidouilles + VIP cards
 *    - Short TTL for frequently changing data
 *    - Supports optimistic updates for instant UI feedback
 *
 * 3. Warnings Cache (10min TTL, keyed by periodId): Behavioral warnings
 *    - Separate cache per academic period
 *    - Map-based storage allows multiple periods to be cached
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Cache hit: <1ms (direct object access)
 * - Cache miss: ~100-200ms (API fetch)
 * - Memory footprint: ~5-10KB per student
 *
 * @example
 * // Auto-fetch pattern
 * const profile = await studentCache.getProfile();
 *
 * @example
 * // Sync getter for $derived
 * let profile = $derived(studentCache.getProfileSync());
 *
 * @example
 * // Optimistic update
 * studentCache.updateGidouillesOptimistic(+5);
 * await updateServerAPI(+5);
 * studentCache.invalidateRewards(); // Sync with server
 */
export class StudentDashboardCache {
	/**
	 * Profile cache (singleton - student sees only their own data)
	 * Uses Svelte 5 $state for automatic reactivity
	 * @private
	 */
	private profileCache: CachedProfile | null = $state(null);

	/**
	 * Rewards cache (singleton - gidouilles + VIP cards)
	 * Supports optimistic updates for instant UI feedback
	 * @private
	 */
	private rewardsCache: CachedRewards | null = $state(null);

	/**
	 * Warnings cache (Map keyed by periodId)
	 * Allows caching warnings for multiple academic periods simultaneously
	 * Example keys: "2024-fall", "2024-spring"
	 * @private
	 */
	private warningsCache = $state(new Map<string, CachedWarnings>()); // Key: periodId

	/**
	 * Profile cache TTL: 2 hours
	 * Reasoning: Profile data (name, email, classes) changes infrequently
	 * @private
	 */
	private readonly PROFILE_TTL = 2 * 60 * 60 * 1000; // 2 hours

	/**
	 * Rewards cache TTL: 10 minutes
	 * Reasoning: Gidouilles and VIP cards can change frequently during active sessions
	 * Balance between freshness and server load
	 * @private
	 */
	private readonly REWARDS_TTL = 10 * 60 * 1000; // 10 minutes

	/**
	 * Warnings cache TTL: 10 minutes
	 * Reasoning: Warnings are period-specific and may be updated by teachers
	 * @private
	 */
	private readonly WARNINGS_TTL = 10 * 60 * 1000; // 10 minutes

	/**
	 * Cache monitoring flag (controlled by VITE_ENABLE_CACHE_MONITORING env variable)
	 * Set to 'true' in .env to enable detailed console logging
	 * @private
	 */
	private readonly monitoringEnabled =
		browser && import.meta.env.VITE_ENABLE_CACHE_MONITORING === 'true';

	/**
	 * Logger instance for cache operations
	 * Only outputs to console when monitoringEnabled is true
	 * @private
	 */
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
	 * Get student profile with automatic cache management
	 *
	 * CACHE BEHAVIOR:
	 * - Returns cached data if fresh (< 2h old)
	 * - Auto-fetches from /api/student/profile if cache miss or expired
	 * - Updates cache timestamp on successful fetch
	 *
	 * USAGE PATTERN:
	 * ```typescript
	 * // In async context (effect, event handler)
	 * const profile = await studentCache.getProfile();
	 * console.log(profile.classes); // Array of class memberships
	 * ```
	 *
	 * PERFORMANCE:
	 * - Cache hit: <1ms
	 * - Cache miss: ~100-200ms (includes API roundtrip)
	 *
	 * ERROR HANDLING:
	 * - Returns empty profile object on API failure (prevents crashes)
	 * - Logs error to console for debugging
	 *
	 * @returns Promise resolving to student profile with class memberships
	 * @throws Never throws - returns fallback profile on error
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
	 * Get student rewards (gidouilles + VIP cards) with automatic cache management
	 *
	 * CACHE BEHAVIOR:
	 * - Returns cached data if fresh (< 10min old)
	 * - Auto-fetches from /api/student/rewards if cache miss or expired
	 * - Shorter TTL than profile due to frequent updates
	 *
	 * USAGE PATTERN:
	 * ```typescript
	 * // In async context
	 * const rewards = await studentCache.getRewards();
	 * console.log(rewards.gidouilles); // Current balance
	 * console.log(rewards.vip_cards); // { instanceId: { cardId, earnedAt, usedAt } }
	 * ```
	 *
	 * OPTIMISTIC UPDATES:
	 * This method works seamlessly with optimistic updates:
	 * ```typescript
	 * // 1. Optimistic UI update (instant feedback)
	 * studentCache.updateGidouillesOptimistic(+5);
	 *
	 * // 2. Server API call
	 * await fetch('/api/rewards/add', { body: { amount: 5 } });
	 *
	 * // 3. Invalidate & refetch (sync with server truth)
	 * studentCache.invalidateRewards();
	 * await studentCache.getRewards(); // Fresh data from server
	 * ```
	 *
	 * PERFORMANCE:
	 * - Cache hit: <1ms
	 * - Cache miss: ~100-200ms
	 *
	 * @returns Promise resolving to student rewards object
	 * @throws Never throws - returns empty rewards on error
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
	 * Get student warnings for a specific academic period with automatic cache management
	 *
	 * CACHE BEHAVIOR:
	 * - Returns cached data if fresh (< 10min old) for this period
	 * - Auto-fetches from /api/student/warnings/[periodId] if cache miss or expired
	 * - Uses Map-based storage to cache multiple periods simultaneously
	 *
	 * PERIOD-SPECIFIC CACHING:
	 * Each academic period has its own cache entry:
	 * - Fall 2024: warningsCache.get("fall-2024-uuid")
	 * - Spring 2025: warningsCache.get("spring-2025-uuid")
	 * This allows students to view warnings from different periods without re-fetching
	 *
	 * USAGE PATTERN:
	 * ```typescript
	 * // Get warnings for current period
	 * const warnings = await studentCache.getWarnings(currentPeriodId);
	 * console.log(warnings.counts); // { C: 2, M: 1, R: 0, T: 0 }
	 * console.log(warnings.warnings); // Array of Warning objects
	 * ```
	 *
	 * PERFORMANCE:
	 * - Cache hit: <1ms
	 * - Cache miss: ~100-200ms
	 *
	 * @param periodId - The UUID of the academic period to fetch warnings for
	 * @returns Promise resolving to warnings with counts and detail array
	 * @throws Never throws - returns empty warnings on error
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
	 * Get student profile synchronously (for use in Svelte 5 $derived)
	 *
	 * WHY SYNC GETTERS:
	 * Svelte 5's $derived cannot handle async operations. Use sync getters
	 * to create reactive values that update when cache changes.
	 *
	 * CACHE BEHAVIOR:
	 * - Returns cached data ONLY if fresh (< 2h old)
	 * - Returns null if cache is empty or expired
	 * - Does NOT auto-fetch (use async getter for that)
	 *
	 * USAGE PATTERN:
	 * ```svelte
	 * <script>
	 *   // Reactive value that updates when cache changes
	 *   let profile = $derived(studentCache.getProfileSync());
	 *
	 *   // Handle cache miss in effect
	 *   $effect(() => {
	 *     if (!profile) {
	 *       studentCache.getProfile(); // Async fetch
	 *     }
	 *   });
	 * </script>
	 *
	 * {#if profile}
	 *   <p>Welcome, {profile.firstname}!</p>
	 * {:else}
	 *   <p>Loading...</p>
	 * {/if}
	 * ```
	 *
	 * REACTIVITY:
	 * Because this.profileCache is $state, any changes trigger re-evaluation
	 * of $derived expressions using this getter.
	 *
	 * @returns Student profile if cached and fresh, null otherwise
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
	 * Update bonus optimistically (instant UI feedback)
	 *
	 * IMPORTANT: Call this BEFORE making the API request for instant UI update.
	 * After API succeeds, call invalidateRewards() + getRewards() to sync.
	 *
	 * @param delta - The change in bonus (positive or negative)
	 */
	updateBonusOptimistic(delta: number): void {
		const cached = this.rewardsCache;
		if (!cached) return;

		const currentBonus = cached.rewards.bonus ?? 0;
		const newBonus = Math.max(0, currentBonus + delta);

		// Update cache with new bonus value
		this.rewardsCache = {
			...cached,
			rewards: {
				...cached.rewards,
				bonus: newBonus
			}
		};

		this.log(
			'trace',
			`[Cache] Optimistic bonus update: ${currentBonus} → ${newBonus} (${delta >= 0 ? '+' : ''}${delta})`
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
	 * Hydrate profile cache from server-loaded data
	 *
	 * HYDRATION STRATEGY:
	 * Instead of fetching data twice (server + client), we reuse data already
	 * loaded by SvelteKit's load functions to populate the cache immediately.
	 *
	 * WORKFLOW:
	 * 1. Server (+layout.server.ts): Fetch profile from database
	 * 2. Server: Return profile in load function data
	 * 3. Client (+layout.svelte): Call hydrateProfile() in $effect
	 * 4. Result: Cache is populated instantly, no API call needed
	 *
	 * USAGE PATTERN:
	 * ```typescript
	 * // +layout.server.ts
	 * export const load: LayoutServerLoad = async ({ locals }) => {
	 *   const profile = await fetchStudentProfile(locals.user.id);
	 *   return { studentProfile: profile };
	 * };
	 *
	 * // +layout.svelte
	 * import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	 * import { onMount } from 'svelte';
	 *
	 * let { data } = $props();
	 *
	 * onMount(() => {
	 *   studentCache.hydrateProfile(data.studentProfile);
	 * });
	 * ```
	 *
	 * BENEFITS:
	 * - Zero API calls on page load (data already fetched server-side)
	 * - Instant cache availability
	 * - Better performance vs. auto-fetch pattern
	 *
	 * @param profile - The student profile object with classes from server
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
				bonus: 0,
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
