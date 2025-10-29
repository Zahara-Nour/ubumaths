/**
 * Gidouilles Cache Store (Client Store - Tier 3)
 *
 * Browser-based cache for gidouilles/VIP cards data.
 * Logs use format: [gidouillesCache.get][Client Store][Tier-3]
 *
 * Features:
 * - Instant cache hits (0ms)
 * - Optimistic updates for responsive UI
 * - Synchronization via server-side polling (5-30 second intervals)
 *
 * ARCHITECTURE NOTE (Post-Refactoring):
 * - NO constructor needed - cache uses direct API polling for sync
 * - Removed BroadcastChannel/CacheEventBus completely
 * - Simpler, more reliable cross-device sync via polling
 * - Pages handle their own polling intervals (rewards page: 5s)
 *
 * ======================
 *
 * Client-side cache for student gidouilles and VIP cards per class.
 * Uses Svelte 5 runes for reactive state management.
 *
 * FEATURES:
 * ---------
 * - Progressive Loading: Fetch only when needed (lazy loading)
 * - Deduplication: Multiple requests for same class = single API call
 * - Optimistic Updates: Instant UI feedback with server sync
 * - Smart Invalidation: Polling-based cache clearing on mutations
 * - Loading States: Track in-flight requests per class
 * - Cache invalidation handled automatically by polling mechanism
 *
 * USAGE:
 * ------
 * ```typescript
 * import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';
 *
 * // Get gidouilles data for a class
 * const gidouilles = await gidouillesCache.get(classId);
 *
 * // Apply optimistic update (instant UI, server sync happens later)
 * gidouillesCache.updateOptimistic(classId, studentId, +5);  // Add 5 gidouilles
 * gidouillesCache.updateOptimistic(classId, studentId, -2);  // Subtract 2 gidouilles
 *
 * // Rollback optimistic update (on error)
 * gidouillesCache.rollbackOptimistic(classId, studentId);
 *
 * // Invalidate specific class after mutation
 * gidouillesCache.invalidate(classId);
 * ```
 *
 * CACHE INVALIDATION TRIGGERS:
 * -----------------------------
 * - Gidouilles awarded/removed
 * - VIP cards awarded/removed
 * - Server-side polling detects changes
 * - Manual invalidation via invalidate() or clear()
 *
 * OPTIMISTIC UPDATES:
 * -------------------
 * - Component calls updateOptimistic() → instant UI update
 * - Component handles server sync (with debouncing)
 * - On success: optimistic delta is cleared
 * - On error: component calls rollbackOptimistic() to revert UI
 *
 * NOTE:
 * -----
 * This cache stores ONLY gidouilles/vip_cards data.
 * For basic student info, use teacherStudentsCache.
 * For warnings data, use warningsCache.
 */

import { dev } from '$app/environment';
import type { StudentVipCards } from '$lib/types/vip-card';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Gidouilles data for a single student
 */
export interface StudentGidouillesData {
	gidouilles: number;
	vip_cards: StudentVipCards;
}

/**
 * Cache entry for a single class
 * Maps student ID to their gidouilles/vip_cards
 */
interface GidouillesCacheEntry {
	data: Map<string, StudentGidouillesData>; // studentId → gidouilles data
	timestamp: number;
	loading: boolean;
	optimistic: Map<string, number>; // studentId → gidouilles delta (for optimistic updates)
}

/**
 * Cache storage (classId → GidouillesCacheEntry)
 */
type GidouillesCacheStorage = Map<string, GidouillesCacheEntry>;

// ============================================================================
// CACHE STORE (SVELTE 5 RUNES)
// ============================================================================

class GidouillesCacheStore {
	// ========================================================================
	// PRIVATE STATE
	// ========================================================================

	/**
	 * Reactive cache storage using Svelte 5 $state rune
	 *
	 * Structure: Map<classId, GidouillesCacheEntry>
	 */
	private cache = $state<GidouillesCacheStorage>(new Map());

	// ========================================================================
	// PUBLIC QUERY METHODS (Synchronous)
	// ========================================================================

	/**
	 * Check if a class is cached
	 *
	 * @param classId - The class ID to check
	 * @returns true if class exists in cache, false otherwise
	 */
	has(classId: string): boolean {
		return this.cache.has(classId);
	}

	/**
	 * Check if a class is currently loading
	 *
	 * @param classId - The class ID to check
	 * @returns true if class is currently being fetched, false otherwise
	 */
	isLoading(classId: string): boolean {
		return this.cache.get(classId)?.loading ?? false;
	}

	/**
	 * Get cached gidouilles data synchronously (with optimistic updates applied)
	 *
	 * Returns undefined if class is not cached or currently loading.
	 * Returned values include optimistic updates (instant UI feedback).
	 *
	 * @param classId - The class ID
	 * @returns Map of student IDs to gidouilles data, or undefined
	 *
	 * @example
	 * const cached = gidouillesCache.getCached(classId);
	 * if (cached) {
	 *   const studentData = cached.get(studentId);
	 *   console.log(`Gidouilles: ${studentData?.gidouilles}`);
	 * }
	 */
	getCached(classId: string): Map<string, StudentGidouillesData> | undefined {
		const entry = this.cache.get(classId);
		if (!entry || entry.loading) return undefined;

		// Apply optimistic updates to cached data
		if (entry.optimistic.size === 0) {
			// No optimistic updates - return cached data directly
			return entry.data;
		}

		// Clone data and apply optimistic deltas
		const dataWithOptimistic = new Map(entry.data);
		entry.optimistic.forEach((delta, studentId) => {
			const current = dataWithOptimistic.get(studentId);
			if (current) {
				dataWithOptimistic.set(studentId, {
					...current,
					gidouilles: Math.max(0, current.gidouilles + delta) // Never go negative
				});
			}
		});

		return dataWithOptimistic;
	}

	// ========================================================================
	// PUBLIC ASYNC METHODS (Data Fetching)
	// ========================================================================

	/**
	 * Get gidouilles data for a class (async - fetches if not cached)
	 *
	 * Returns cached data with optimistic updates applied.
	 * Fetches from API if not cached or currently loading.
	 *
	 * @param classId - The class ID
	 * @returns Promise resolving to Map of student IDs to gidouilles data
	 *
	 * @example
	 * const gidouilles = await gidouillesCache.get(classId);
	 * const studentData = gidouilles.get(studentId);
	 */
	async get(classId: string): Promise<Map<string, StudentGidouillesData>> {
		const entry = this.cache.get(classId);

		// CASE 1: CACHE HIT - Return cached data with optimistic updates
		if (entry && !entry.loading) {
			if (dev)
				console.log(
					`[gidouillesCache.get][Client Store][Tier-3] 🎯 HIT (0ms) gidouilles:class:${classId}`
				);
			return this.getCached(classId) || new Map();
		}

		// CASE 2: CURRENTLY LOADING - Wait for in-flight request
		if (entry?.loading) {
			if (dev)
				console.log(
					`[gidouillesCache.get][Client Store][Tier-3] 🔄 LOADING gidouilles:class:${classId} (dedup)`
				);
			return this.waitForLoad(classId);
		}

		// CASE 3: CACHE MISS - Fetch from API
		if (dev)
			console.log(
				`[gidouillesCache.get][Client Store][Tier-3] ❌ MISS → fetching via API gidouilles:class:${classId}`
			);
		return this.fetch(classId);
	}

	// ========================================================================
	// OPTIMISTIC UPDATES
	// ========================================================================

	/**
	 * Apply optimistic update to gidouilles count
	 *
	 * Updates UI instantly without waiting for server.
	 * Component is responsible for:
	 * 1. Calling this method for instant UI feedback
	 * 2. Syncing with server (with debouncing)
	 * 3. Calling rollbackOptimistic() on error
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 * @param delta - Change in gidouilles (+5 to add, -2 to subtract)
	 *
	 * @example
	 * // Component handles optimistic update + server sync
	 * let debounceTimer: ReturnType<typeof setTimeout>;
	 *
	 * function handleGidouillesChange(studentId: string, delta: number) {
	 *   // 1. Apply optimistic update (instant UI)
	 *   gidouillesCache.updateOptimistic(classId, studentId, delta);
	 *
	 *   // 2. Debounce server sync
	 *   clearTimeout(debounceTimer);
	 *   debounceTimer = setTimeout(async () => {
	 *     try {
	 *       await fetch('/api/gidouilles', {
	 *         method: 'POST',
	 *         body: JSON.stringify({ studentId, delta })
	 *       });
	 *       // Success - clear optimistic state
	 *       gidouillesCache.clearOptimistic(classId, studentId);
	 *     } catch (error) {
	 *       // Error - rollback optimistic update
	 *       gidouillesCache.rollbackOptimistic(classId, studentId);
	 *       toaster.error('Failed to update gidouilles');
	 *     }
	 *   }, 500);
	 * }
	 */
	updateOptimistic(classId: string, studentId: string, delta: number): void {
		const entry = this.cache.get(classId);
		if (!entry) return;

		// Update optimistic delta
		const currentDelta = entry.optimistic.get(studentId) || 0;
		entry.optimistic.set(studentId, currentDelta + delta);
	}

	/**
	 * Clear optimistic update for a student (after successful server sync)
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 */
	clearOptimistic(classId: string, studentId: string): void {
		const entry = this.cache.get(classId);
		if (entry) {
			entry.optimistic.delete(studentId);
		}
	}

	/**
	 * Rollback optimistic update for a student (on error)
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 */
	rollbackOptimistic(classId: string, studentId: string): void {
		this.clearOptimistic(classId, studentId);
	}

	// ========================================================================
	// PRIVATE METHODS (Internal Implementation)
	// ========================================================================

	/**
	 * Fetch gidouilles data from API and update cache
	 *
	 * @param classId - The class ID
	 * @returns Promise resolving to Map of student IDs to gidouilles data
	 * @private
	 */
	private async fetch(classId: string): Promise<Map<string, StudentGidouillesData>> {
		// Set loading state
		this.cache.set(classId, {
			data: new Map(),
			timestamp: Date.now(),
			loading: true,
			optimistic: new Map()
		});

		try {
			// Fetch from API
			const url = `/api/classes/${classId}/gidouilles`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Failed to fetch gidouilles: ${response.statusText}`);
			}

			const result = await response.json();
			const students = result.students || [];

			// Convert array to Map
			const dataMap = new Map<string, StudentGidouillesData>();
			students.forEach(
				(student: { id: string; gidouilles: number; vip_cards: StudentVipCards }) => {
					dataMap.set(student.id, {
						gidouilles: student.gidouilles,
						vip_cards: student.vip_cards || {}
					});
				}
			);

			// Update cache
			this.cache.set(classId, {
				data: dataMap,
				timestamp: Date.now(),
				loading: false,
				optimistic: new Map()
			});

			return dataMap;
		} catch (error) {
			console.error('[GidouillesCache] Error fetching gidouilles:', error);
			this.cache.delete(classId);
			throw error;
		}
	}

	/**
	 * Wait for an in-flight request to complete
	 *
	 * @param classId - The class ID to wait for
	 * @returns Promise resolving to gidouilles data when loading completes
	 * @private
	 */
	private async waitForLoad(classId: string): Promise<Map<string, StudentGidouillesData>> {
		return new Promise((resolve, reject) => {
			const checkInterval = setInterval(() => {
				const entry = this.cache.get(classId);

				if (!entry) {
					clearInterval(checkInterval);
					reject(new Error('Failed to load gidouilles'));
					return;
				}

				if (!entry.loading) {
					clearInterval(checkInterval);
					resolve(this.getCached(classId) || new Map());
				}
			}, 100);

			setTimeout(() => {
				clearInterval(checkInterval);
				reject(new Error('Timeout waiting for gidouilles to load'));
			}, 10000);
		});
	}

	// ========================================================================
	// CACHE INVALIDATION
	// ========================================================================

	/**
	 * Invalidate cache for a specific class
	 *
	 * Removes cached data for a single class, forcing the next get()
	 * call to fetch fresh data from the API.
	 *
	 * @param classId - The class ID to invalidate
	 *
	 * @example
	 * // After server update completes
	 * await updateGidouilles(studentId, amount);
	 * gidouillesCache.invalidate(classId);
	 */
	invalidate(classId: string): void {
		this.cache.delete(classId);
	}

	/**
	 * Clear entire cache
	 *
	 * Removes all cached data for all classes.
	 *
	 * @example
	 * // On logout
	 * gidouillesCache.clear();
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics (for debugging)
	 *
	 * @returns Object with cache statistics
	 */
	getStats() {
		return {
			cachedClasses: this.cache.size,
			loadingClasses: Array.from(this.cache.values()).filter((e) => e.loading).length,
			totalStudents: Array.from(this.cache.values()).reduce((sum, e) => sum + e.data.size, 0),
			optimisticUpdates: Array.from(this.cache.values()).reduce(
				(sum, e) => sum + e.optimistic.size,
				0
			)
		};
	}
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Module-level singleton cache instance
 *
 * This is the recommended way to access the cache.
 *
 * @example
 * import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';
 *
 * const gidouilles = await gidouillesCache.get(classId);
 */
export const gidouillesCache = new GidouillesCacheStore();
