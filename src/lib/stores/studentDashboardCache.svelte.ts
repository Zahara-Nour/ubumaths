/**
 * Student Dashboard Cache Store
 * ===============================
 *
 * Centralized caching system for student dashboard with 3 separate caches:
 * 1. Student Rewards (10min TTL + optimistic)
 * 2. Student Warnings (10min TTL, per period)
 * 3. Student Buddy (10min TTL + optimistic)
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
 * import { studentCache } from '#lib/stores/studentDashboardCache.svelte.ts';
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
	StudentRewards,
	StudentWarnings,
	CachedRewards,
	CachedWarnings,
	CachedBuddy,
	CacheStats
} from '#lib/types/student-cache.ts';
import type { BuddyState } from '#lib/types/buddy.ts';
import type { StudentVipCards } from '#lib/types/vip-card.ts';
import type { StudentWarningCounts } from '#lib/server/warnings.ts';
import { createLogger } from '#lib/utils/logger.ts';
import { browser } from '$app/env';
import { SvelteMap } from 'svelte/reactivity';

// ============================================================================
// VALEURS VIDES (rendues après un échec de lecture, jamais mises en cache)
// ============================================================================

function emptyRewards(): StudentRewards {
	return { gidouilles: 0, bonus: 0, vip_cards: {} };
}

function emptyWarnings(): StudentWarnings {
	return { counts: { C: 0, M: 0, R: 0, T: 0 }, warnings: [] };
}

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
 * 1. Rewards Cache (10min TTL): Gidouilles + VIP cards
 *    - Short TTL for frequently changing data
 *    - Supports optimistic updates for instant UI feedback
 *
 * 2. Warnings Cache (10min TTL, keyed by periodId): Behavioral warnings
 *    - Separate cache per academic period
 *    - Map-based storage allows multiple periods to be cached
 *
 * 3. Buddy Cache (10min TTL): Palotin state, optimistic XP updates
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Cache hit: <1ms (direct object access)
 * - Cache miss: ~100-200ms (API fetch)
 * - Memory footprint: ~5-10KB per student
 *
 * @example
 * // Auto-fetch pattern
 * const rewards = await studentCache.getRewards();
 *
 * @example
 * // Sync getter for $derived
 * let rewards = $derived(studentCache.getRewardsSync());
 *
 * @example
 * // Optimistic update
 * studentCache.updateGidouillesOptimistic(+5);
 * await updateServerAPI(+5);
 * studentCache.invalidateRewards(); // Sync with server
 */
export class StudentDashboardCache {
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
	private warningsCache = new SvelteMap<string, CachedWarnings>(); // Key: periodId

	/**
	 * Buddy cache (singleton - palotin buddy state)
	 * Supports optimistic XP updates for instant UI feedback
	 * @private
	 */
	private buddyCache: CachedBuddy | null = $state(null);

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
	 * Buddy cache TTL: 10 minutes
	 * @private
	 */
	private readonly BUDDY_TTL = 10 * 60 * 1000; // 10 minutes

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
	 * Relecture à l'échéance (écart L43, comportement suivi par David le 2026-11-28) :
	 * à la fin de sa durée de vie, une entrée déjà lue (récompenses, avertissements
	 * d'une période) est relue toute seule. L'écran garde l'ancienne valeur jusqu'à
	 * l'arrivée de la nouvelle. Un onglet caché ne relit pas : il relit quand
	 * l'élève revient dessus. Navigateur seulement (le singleton existe aussi au
	 * serveur, vide).
	 * Clé : 'rewards' ou 'warnings:<periodId>'.
	 * @private
	 */
	private refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

	/** Relectures en cours (même clé) : une seule à la fois. @private */
	private refreshing = new Set<string>();

	/** Écouteur du retour sur l'onglet, retiré par `destroy()`. @private */
	private readonly onVisibilityChange = () => {
		if (document.visibilityState === 'visible') this.refreshExpired();
	};

	constructor() {
		if (browser) document.addEventListener('visibilitychange', this.onVisibilityChange);
	}

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
	 * Get student rewards (gidouilles + VIP cards) with automatic cache management
	 *
	 * CACHE BEHAVIOR:
	 * - Returns cached data if fresh (< 10min old)
	 * - Auto-fetches from /api/student/rewards if cache miss or expired
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
	 * ERROR HANDLING:
	 * - Un échec n'est JAMAIS mis en cache : la dernière valeur connue (même
	 *   expirée) est rendue si elle existe, sinon des récompenses vides, et
	 *   l'accès suivant refait la lecture
	 *
	 * @returns Promise resolving to student rewards object
	 * @throws Never throws - returns last known (or empty) rewards on error, never cached
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
		if (rewards === null) {
			// Échec : rien n'est stocké, l'accès suivant refera la lecture.
			// On rend la dernière valeur connue, même expirée, sinon des récompenses vides.
			return cached?.rewards ?? emptyRewards();
		}
		this.rewardsCache = { rewards, fetchedAt: now };
		this.armRefresh('rewards', now + this.REWARDS_TTL);

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
	 * @throws Never throws - returns last known (or empty) warnings on error, never cached
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
		if (warnings === null) {
			// Échec : rien n'est stocké (voir getRewards)
			return cached?.warnings ?? emptyWarnings();
		}
		this.warningsCache.set(periodId, { warnings, fetchedAt: now });
		this.armRefresh(`warnings:${periodId}`, now + this.WARNINGS_TTL);

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
	 * Get student rewards synchronously
	 * Rend la dernière valeur connue, même arrivée à échéance (elle est alors en
	 * cours de relecture, écart L43) ; null seulement si rien n'a été lu.
	 * Use in $derived for reactive UI
	 *
	 * @returns Student rewards or null
	 */
	getRewardsSync(): StudentRewards | null {
		return this.rewardsCache?.rewards ?? null;
	}

	/**
	 * Get student warnings synchronously
	 * Dernière valeur connue, même arrivée à échéance (voir getRewardsSync)
	 * Use in $derived for reactive UI
	 *
	 * @param periodId - The academic period ID
	 * @returns Student warnings or null
	 */
	getWarningsSync(periodId: string): StudentWarnings | null {
		return this.warningsCache.get(periodId)?.warnings ?? null;
	}

	/**
	 * Get student buddy synchronously
	 * Returns null if cache is empty, expired, or no buddy chosen
	 * Use in $derived for reactive UI
	 */
	getBuddySync(): BuddyState | null {
		const cached = this.buddyCache;
		const now = Date.now();

		if (cached && now - cached.fetchedAt < this.BUDDY_TTL) {
			return cached.buddy;
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
		const newGidouilles = Math.max(0, Math.round((currentGidouilles + delta) * 100) / 100);

		// Update cache with new gidouilles value. L'échéance repart de maintenant :
		// sinon le gain disparaîtrait à l'échéance de l'ancienne lecture (écart L44).
		this.rewardsCache = {
			rewards: {
				...cached.rewards,
				gidouilles: newGidouilles
			},
			fetchedAt: Date.now()
		};
		this.armRefresh('rewards', Date.now() + this.REWARDS_TTL);

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

		// Update cache with new bonus value (échéance repartie, écart L44)
		this.rewardsCache = {
			rewards: {
				...cached.rewards,
				bonus: newBonus
			},
			fetchedAt: Date.now()
		};
		this.armRefresh('rewards', Date.now() + this.REWARDS_TTL);

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

		// Update cache with new VIP cards (échéance repartie, écart L44)
		this.rewardsCache = {
			rewards: {
				...cached.rewards,
				vip_cards: vipCards
			},
			fetchedAt: Date.now()
		};
		this.armRefresh('rewards', Date.now() + this.REWARDS_TTL);

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

	/**
	 * Update buddy XP optimistically (instant UI feedback)
	 *
	 * @param xpGained - XP gained in this action
	 * @param newLevel - New level if leveled up (optional)
	 * @param newStreak - Constance Royale mise à jour, en semaines (optional)
	 */
	updateBuddyXpOptimistic(xpGained: number, newLevel?: number, newStreak?: number): void {
		if (!this.buddyCache) return;

		const buddy = { ...this.buddyCache.buddy };
		buddy.xp += xpGained;
		buddy.xp_earned_today += xpGained;
		if (newLevel !== undefined) buddy.level = newLevel;
		if (newStreak !== undefined) buddy.current_streak = newStreak;

		this.buddyCache = {
			buddy,
			fetchedAt: this.buddyCache.fetchedAt
		};

		this.log('trace', `[Cache] Optimistic buddy XP update: +${xpGained}`);
	}

	/**
	 * Constance Royale : semaine et jours travaillés comptés par le serveur
	 * (« Cette semaine : x jours sur 3 » à jour sans recharger).
	 */
	updateBuddyConstanceOptimistic(weekStart: string, daysThisWeek: number): void {
		if (!this.buddyCache) return;

		this.buddyCache = {
			buddy: {
				...this.buddyCache.buddy,
				constance_week_start: weekStart,
				constance_days_this_week: daysThisWeek
			},
			fetchedAt: this.buddyCache.fetchedAt
		};
	}

	// ========================================================================
	// HYDRATION (Pre-fill from server load functions)
	// ========================================================================

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
		this.armRefresh('rewards', Date.now() + this.REWARDS_TTL);
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
		this.armRefresh(`warnings:${periodId}`, Date.now() + this.WARNINGS_TTL);
		this.log('trace', `[Cache] Hydrated warnings cache for period ${periodId}`);
	}

	/**
	 * Hydrate buddy cache from server data
	 *
	 * @param buddy - The student buddy state (or null if no buddy yet)
	 */
	hydrateBuddy(buddy: BuddyState | null): void {
		if (!buddy) {
			this.buddyCache = null;
			return;
		}
		this.buddyCache = {
			buddy,
			fetchedAt: Date.now()
		};
		this.log('trace', '[Cache] Hydrated buddy cache');
	}

	// ========================================================================
	// INVALIDATION
	// ========================================================================

	/**
	 * Invalidate rewards cache
	 */
	invalidateRewards(): void {
		this.rewardsCache = null;
		this.disarmRefresh('rewards');
		this.log('trace', 'Cache invalidated: rewards');
	}

	/**
	 * Invalidate warnings cache for a specific period
	 *
	 * @param periodId - The academic period ID
	 */
	invalidateWarnings(periodId: string): void {
		this.warningsCache.delete(periodId);
		this.disarmRefresh(`warnings:${periodId}`);
		this.log('trace', 'Cache invalidated: warnings for period:', periodId);
	}

	/**
	 * Invalidate all warnings (all periods)
	 */
	invalidateAllWarnings(): void {
		this.warningsCache.clear();
		for (const key of [...this.refreshTimers.keys()]) {
			if (key.startsWith('warnings:')) this.disarmRefresh(key);
		}
		this.log('trace', 'Cache invalidated: all warnings');
	}

	/**
	 * Invalidate buddy cache
	 */
	invalidateBuddy(): void {
		this.buddyCache = null;
		this.log('trace', 'Cache invalidated: buddy');
	}

	/**
	 * Clear all caches
	 */
	invalidateAll(): void {
		this.rewardsCache = null;
		this.buddyCache = null;
		this.warningsCache.clear();
		for (const key of [...this.refreshTimers.keys()]) this.disarmRefresh(key);
		this.log('trace', 'Cache: All caches cleared');
	}

	/**
	 * Arrête les relectures programmées et l'écoute de l'onglet (tests, instance jetée)
	 */
	destroy(): void {
		for (const key of [...this.refreshTimers.keys()]) this.disarmRefresh(key);
		if (browser) document.removeEventListener('visibilitychange', this.onVisibilityChange);
	}

	// ========================================================================
	// RELECTURE À L'ÉCHÉANCE (écart L43)
	// ========================================================================

	/**
	 * Programme la relecture d'une entrée à son échéance (remplace la précédente)
	 * @private
	 */
	private armRefresh(key: string, expiresAt: number): void {
		if (!browser) return;
		this.disarmRefresh(key);
		const delay = Math.max(0, expiresAt - Date.now());
		this.refreshTimers.set(
			key,
			setTimeout(() => {
				this.refreshTimers.delete(key);
				// Onglet caché : la relecture attend le retour sur l'onglet
				if (document.visibilityState === 'hidden') return;
				void this.refresh(key);
			}, delay)
		);
	}

	/** @private */
	private disarmRefresh(key: string): void {
		const timer = this.refreshTimers.get(key);
		if (timer !== undefined) clearTimeout(timer);
		this.refreshTimers.delete(key);
	}

	/**
	 * Retour sur l'onglet : relit les entrées arrivées à échéance pendant l'absence
	 * @private
	 */
	private refreshExpired(): void {
		const now = Date.now();
		if (this.rewardsCache && now - this.rewardsCache.fetchedAt >= this.REWARDS_TTL) {
			void this.refresh('rewards');
		}
		for (const [periodId, cached] of this.warningsCache) {
			if (now - cached.fetchedAt >= this.WARNINGS_TTL) void this.refresh(`warnings:${periodId}`);
		}
	}

	/**
	 * Relit une entrée. Un échec ne touche pas au cache : l'écran garde l'ancienne
	 * valeur, et la lecture suivante (retour sur l'onglet, lecture asynchrone) réessaie.
	 * @private
	 */
	private async refresh(key: string): Promise<void> {
		if (this.refreshing.has(key)) return;
		this.refreshing.add(key);
		try {
			if (key === 'rewards') {
				if (!this.rewardsCache) return; // invalidé entre-temps
				const rewards = await this.fetchRewards();
				if (rewards === null || !this.rewardsCache) return;
				const now = Date.now();
				this.rewardsCache = { rewards, fetchedAt: now };
				this.armRefresh('rewards', now + this.REWARDS_TTL);
			} else {
				const periodId = key.slice('warnings:'.length);
				if (!this.warningsCache.has(periodId)) return;
				const warnings = await this.fetchWarnings(periodId);
				if (warnings === null || !this.warningsCache.has(periodId)) return;
				const now = Date.now();
				this.warningsCache.set(periodId, { warnings, fetchedAt: now });
				this.armRefresh(key, now + this.WARNINGS_TTL);
			}
			this.log('trace', `[Cache] Relu à l'échéance : ${key}`);
		} finally {
			this.refreshing.delete(key);
		}
	}

	// ========================================================================
	// API FETCH METHODS
	// ========================================================================

	/**
	 * Fetch student rewards from API (null en cas d'échec)
	 * @private
	 */
	private async fetchRewards(): Promise<StudentRewards | null> {
		try {
			const response = await fetch('/api/student/rewards');
			if (!response.ok) {
				throw new Error(`Impossible de charger les récompenses : ${response.statusText}`);
			}
			const data = await response.json();
			return data.rewards;
		} catch (error) {
			console.error('[Cache] Error fetching student rewards:', error);
			return null;
		}
	}

	/**
	 * Fetch student warnings from API (null en cas d'échec)
	 * @private
	 */
	private async fetchWarnings(periodId: string): Promise<StudentWarnings | null> {
		try {
			const response = await fetch(`/api/student/warnings/${periodId}`);
			if (!response.ok) {
				throw new Error(`Impossible de charger les avertissements : ${response.statusText}`);
			}
			const data = await response.json();
			return data.warnings;
		} catch (error) {
			console.error('[Cache] Error fetching student warnings:', error);
			return null;
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
		const rewardsExists = this.rewardsCache !== null;
		const warningsCount = this.warningsCache.size;
		const totalEntries = (rewardsExists ? 1 : 0) + warningsCount;

		// Rough memory estimate (very approximate)
		let memoryBytes = 0;
		if (rewardsExists) memoryBytes += JSON.stringify(this.rewardsCache).length;
		this.warningsCache.forEach((cached) => {
			memoryBytes += JSON.stringify(cached).length;
		});

		const memoryKB = (memoryBytes / 1024).toFixed(2);
		const memoryEstimate = memoryBytes < 1024 ? `${memoryBytes} bytes` : `${memoryKB} KB`;

		return {
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
