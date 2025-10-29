/**
 * Warnings Cache Store
 * ====================
 *
 * Client-side cache for student warnings per class and academic period.
 * Uses Svelte 5 runes for reactive state management.
 *
 * FEATURES:
 * ---------
 * - Progressive Loading: Fetch only when needed (lazy loading)
 * - Deduplication: Multiple requests for same class+period = single API call
 * - Optimistic Updates: Instant UI feedback with server sync
 * - Asymmetric Debouncing: ADD is debounced (500ms), REMOVE is immediate
 * - Smart Invalidation: Event-based cache clearing on mutations
 * - Loading States: Track in-flight requests per class+period
 * - Event Bus Integration: Automatic invalidation via cacheEventBus
 *
 * USAGE:
 * ------
 * ```typescript
 * import { warningsCache } from '$lib/stores/warningsCache.svelte';
 *
 * // Get warnings data for a class and period
 * const warnings = await warningsCache.get(classId, periodId);
 *
 * // Apply optimistic add (debounced server sync - 500ms)
 * warningsCache.addOptimistic(classId, periodId, studentId, 'C', tempWarningId);
 *
 * // Apply optimistic remove (IMMEDIATE server sync - no debounce)
 * warningsCache.removeOptimistic(classId, periodId, studentId, 'C');
 *
 * // Rollback optimistic update (on error)
 * warningsCache.rollbackOptimistic(classId, periodId, studentId);
 *
 * // Invalidate specific class+period after mutation
 * warningsCache.invalidate(classId, periodId);
 * ```
 *
 * CACHE INVALIDATION TRIGGERS:
 * -----------------------------
 * - Warning created/deleted
 * - Event Bus 'warnings' or 'all' events
 * - Manual invalidation via invalidate() or clear()
 *
 * OPTIMISTIC UPDATES (ASYMMETRIC):
 * ---------------------------------
 * **ADD (Debounced 500ms):**
 * - Component calls addOptimistic() → instant UI update
 * - Component waits 500ms before server sync
 * - Allows batching multiple adds into single request
 * - On success: optimistic state is cleared
 * - On error: component calls rollbackOptimistic()
 *
 * **REMOVE (Immediate):**
 * - Component calls removeOptimistic() → instant UI update
 * - Server sync happens IMMEDIATELY (no debounce)
 * - User expects instant feedback when removing warnings
 * - On success: optimistic state is cleared
 * - On error: component calls rollbackOptimistic()
 *
 * NOTE:
 * -----
 * This cache stores ONLY warnings data.
 * For basic student info, use teacherStudentsCache.
 * For gidouilles/vip_cards, use gidouillesCache.
 */

import { cacheEventBus } from './cacheEventBus.svelte';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Warning type enum (from database)
 */
export type WarningType = 'C' | 'M' | 'R' | 'T';

/**
 * Warning record (from database)
 */
export interface Warning {
	id: string;
	student_id: string;
	warning_type: WarningType;
	created_at: string;
	created_by: string;
	class_id: string;
	academic_period_id: string;
}

/**
 * Aggregated warning counts and score for a student
 */
export interface StudentWarningCounts {
	C: number; // Contrôle
	M: number; // Matériel
	R: number; // Retard
	T: number; // Travail
	total: number; // Sum of all warnings
	score: number; // 20 - total
	warnings: Warning[]; // Full warning records (for deletion)
}

/**
 * Optimistic update operation
 */
interface OptimisticUpdate {
	type: WarningType;
	delta: number; // +1 for add, -1 for remove
	warningId?: string; // Temporary ID for optimistic add
}

/**
 * Cache entry for a single class+period combination
 */
interface WarningsCacheEntry {
	data: Map<string, StudentWarningCounts>; // studentId → counts
	timestamp: number;
	loading: boolean;
	optimistic: Map<string, OptimisticUpdate>; // studentId → optimistic update
}

/**
 * Cache storage (cacheKey → WarningsCacheEntry)
 * Cache key format: `${classId}:${periodId}`
 */
type WarningsCacheStorage = Map<string, WarningsCacheEntry>;

// ============================================================================
// CACHE STORE (SVELTE 5 RUNES)
// ============================================================================

class WarningsCacheStore {
	// ========================================================================
	// PRIVATE STATE
	// ========================================================================

	/**
	 * Reactive cache storage using Svelte 5 $state rune
	 *
	 * Structure: Map<cacheKey, WarningsCacheEntry>
	 * Cache key: `${classId}:${periodId}`
	 */
	private cache = $state<WarningsCacheStorage>(new Map());

	// ========================================================================
	// CONSTRUCTOR - Event Bus Integration
	// ========================================================================

	constructor() {
		// Subscribe to cache invalidation events from Event Bus
		if (typeof window !== 'undefined') {
			// Client-side only
			cacheEventBus.subscribe((event) => {
				// Invalidate on 'warnings' or 'all' events
				if (event.type === 'warnings' || event.type === 'all') {
					if (event.scope.classId && event.scope.periodId) {
						// Invalidate specific class+period
						this.invalidate(event.scope.classId, event.scope.periodId);
					} else if (event.scope.classId) {
						// Invalidate all periods for this class
						this.invalidateClass(event.scope.classId);
					} else if (event.scope.teacherId) {
						// Invalidate all classes for teacher
						this.clear();
					}
				}
			});
		}
	}

	// ========================================================================
	// PRIVATE HELPERS
	// ========================================================================

	/**
	 * Generate cache key from classId and periodId
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Cache key string
	 * @private
	 */
	private getCacheKey(classId: string, periodId: string): string {
		return `${classId}:${periodId}`;
	}

	/**
	 * Calculate warning counts from warning array
	 *
	 * @param warnings - Array of warnings for a student
	 * @returns Aggregated counts
	 * @private
	 */
	private calculateCounts(warnings: Warning[]): StudentWarningCounts {
		const counts = {
			C: 0,
			M: 0,
			R: 0,
			T: 0,
			total: 0,
			score: 20,
			warnings
		};

		warnings.forEach((warning) => {
			counts[warning.warning_type]++;
			counts.total++;
		});

		counts.score = 20 - counts.total;

		return counts;
	}

	/**
	 * Apply optimistic update to cached counts
	 *
	 * @param counts - Base counts
	 * @param update - Optimistic update to apply
	 * @returns Updated counts
	 * @private
	 */
	private applyOptimisticUpdate(
		counts: StudentWarningCounts,
		update: OptimisticUpdate
	): StudentWarningCounts {
		const updated = { ...counts };

		// Apply delta to specific warning type
		updated[update.type] = Math.max(0, updated[update.type] + update.delta);

		// Recalculate total and score
		updated.total = updated.C + updated.M + updated.R + updated.T;
		updated.score = 20 - updated.total;

		// If adding optimistically, create a temporary warning record
		if (update.delta > 0 && update.warningId) {
			updated.warnings = [
				...updated.warnings,
				{
					id: update.warningId,
					student_id: '', // Will be filled on server
					warning_type: update.type,
					created_at: new Date().toISOString(),
					created_by: '', // Will be filled on server
					class_id: '',
					academic_period_id: ''
				}
			];
		}

		// If removing optimistically, filter out the warning
		if (update.delta < 0) {
			// Remove the most recent warning of this type
			// Find last index manually (ES2023 findLastIndex not available)
			let indexToRemove = -1;
			for (let i = updated.warnings.length - 1; i >= 0; i--) {
				if (updated.warnings[i].warning_type === update.type) {
					indexToRemove = i;
					break;
				}
			}

			if (indexToRemove !== -1) {
				updated.warnings = [
					...updated.warnings.slice(0, indexToRemove),
					...updated.warnings.slice(indexToRemove + 1)
				];
			}
		}

		return updated;
	}

	// ========================================================================
	// PUBLIC QUERY METHODS (Synchronous)
	// ========================================================================

	/**
	 * Check if a class+period is cached
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns true if cached, false otherwise
	 */
	has(classId: string, periodId: string): boolean {
		return this.cache.has(this.getCacheKey(classId, periodId));
	}

	/**
	 * Check if a class+period is currently loading
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns true if loading, false otherwise
	 */
	isLoading(classId: string, periodId: string): boolean {
		return this.cache.get(this.getCacheKey(classId, periodId))?.loading ?? false;
	}

	/**
	 * Get cached warnings data synchronously (with optimistic updates applied)
	 *
	 * Returns undefined if not cached or currently loading.
	 * Returned values include optimistic updates (instant UI feedback).
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Map of student IDs to warning counts, or undefined
	 *
	 * @example
	 * const cached = warningsCache.getCached(classId, periodId);
	 * if (cached) {
	 *   const studentCounts = cached.get(studentId);
	 *   console.log(`Warnings: ${studentCounts?.total}, Score: ${studentCounts?.score}`);
	 * }
	 */
	getCached(classId: string, periodId: string): Map<string, StudentWarningCounts> | undefined {
		const entry = this.cache.get(this.getCacheKey(classId, periodId));
		if (!entry || entry.loading) return undefined;

		// Apply optimistic updates to cached data
		if (entry.optimistic.size === 0) {
			// No optimistic updates - return cached data directly
			return entry.data;
		}

		// Clone data and apply optimistic updates
		const dataWithOptimistic = new Map(entry.data);
		entry.optimistic.forEach((update, studentId) => {
			const current = dataWithOptimistic.get(studentId);
			if (current) {
				dataWithOptimistic.set(studentId, this.applyOptimisticUpdate(current, update));
			}
		});

		return dataWithOptimistic;
	}

	// ========================================================================
	// PUBLIC ASYNC METHODS (Data Fetching)
	// ========================================================================

	/**
	 * Get warnings data for a class and period (async - fetches if not cached)
	 *
	 * Returns cached data with optimistic updates applied.
	 * Fetches from API if not cached or currently loading.
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Promise resolving to Map of student IDs to warning counts
	 *
	 * @example
	 * const warnings = await warningsCache.get(classId, periodId);
	 * const studentCounts = warnings.get(studentId);
	 */
	async get(classId: string, periodId: string): Promise<Map<string, StudentWarningCounts>> {
		const key = this.getCacheKey(classId, periodId);
		const entry = this.cache.get(key);

		// CASE 1: CACHE HIT - Return cached data with optimistic updates
		if (entry && !entry.loading) {
			return this.getCached(classId, periodId) || new Map();
		}

		// CASE 2: CURRENTLY LOADING - Wait for in-flight request
		if (entry?.loading) {
			return this.waitForLoad(classId, periodId);
		}

		// CASE 3: CACHE MISS - Fetch from API
		return this.fetch(classId, periodId);
	}

	// ========================================================================
	// OPTIMISTIC UPDATES (ASYMMETRIC DEBOUNCING)
	// ========================================================================

	/**
	 * Apply optimistic ADD for a warning (DEBOUNCED server sync - 500ms)
	 *
	 * Updates UI instantly. Component is responsible for:
	 * 1. Calling this method for instant UI feedback
	 * 2. Waiting 500ms (debouncing)
	 * 3. Syncing with server
	 * 4. Calling clearOptimistic() on success or rollbackOptimistic() on error
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @param studentId - The student ID
	 * @param type - The warning type
	 * @param warningId - Temporary warning ID (optional, for UI tracking)
	 *
	 * @example
	 * // Component handles optimistic add + debounced server sync
	 * let debounceTimer: ReturnType<typeof setTimeout>;
	 *
	 * function handleAddWarning(studentId: string, type: WarningType) {
	 *   const tempId = crypto.randomUUID();
	 *
	 *   // 1. Apply optimistic update (instant UI)
	 *   warningsCache.addOptimistic(classId, periodId, studentId, type, tempId);
	 *
	 *   // 2. Debounce server sync (500ms)
	 *   clearTimeout(debounceTimer);
	 *   debounceTimer = setTimeout(async () => {
	 *     try {
	 *       await fetch('/api/warnings', {
	 *         method: 'POST',
	 *         body: JSON.stringify({ studentId, type, classId, periodId })
	 *       });
	 *       // Success - clear optimistic state
	 *       warningsCache.clearOptimistic(classId, periodId, studentId);
	 *     } catch (error) {
	 *       // Error - rollback optimistic update
	 *       warningsCache.rollbackOptimistic(classId, periodId, studentId);
	 *       toaster.error('Failed to add warning');
	 *     }
	 *   }, 500);
	 * }
	 */
	addOptimistic(
		classId: string,
		periodId: string,
		studentId: string,
		type: WarningType,
		warningId?: string
	): void {
		const key = this.getCacheKey(classId, periodId);
		const entry = this.cache.get(key);
		if (!entry) return;

		// Set optimistic add (+1)
		entry.optimistic.set(studentId, {
			type,
			delta: +1,
			warningId
		});
	}

	/**
	 * Apply optimistic REMOVE for a warning (IMMEDIATE server sync - no debounce)
	 *
	 * Updates UI instantly. Component is responsible for:
	 * 1. Calling this method for instant UI feedback
	 * 2. Syncing with server IMMEDIATELY (no debounce)
	 * 3. Calling clearOptimistic() on success or rollbackOptimistic() on error
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @param studentId - The student ID
	 * @param type - The warning type
	 *
	 * @example
	 * // Component handles optimistic remove + IMMEDIATE server sync
	 * async function handleRemoveWarning(studentId: string, type: WarningType) {
	 *   // 1. Apply optimistic update (instant UI)
	 *   warningsCache.removeOptimistic(classId, periodId, studentId, type);
	 *
	 *   // 2. Sync with server IMMEDIATELY (no debounce)
	 *   try {
	 *     await fetch(`/api/warnings/${warningId}`, {
	 *       method: 'DELETE'
	 *     });
	 *     // Success - clear optimistic state
	 *     warningsCache.clearOptimistic(classId, periodId, studentId);
	 *   } catch (error) {
	 *     // Error - rollback optimistic update
	 *     warningsCache.rollbackOptimistic(classId, periodId, studentId);
	 *     toaster.error('Failed to remove warning');
	 *   }
	 * }
	 */
	removeOptimistic(classId: string, periodId: string, studentId: string, type: WarningType): void {
		const key = this.getCacheKey(classId, periodId);
		const entry = this.cache.get(key);
		if (!entry) return;

		// Set optimistic remove (-1)
		entry.optimistic.set(studentId, {
			type,
			delta: -1
		});
	}

	/**
	 * Clear optimistic update for a student (after successful server sync)
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @param studentId - The student ID
	 */
	clearOptimistic(classId: string, periodId: string, studentId: string): void {
		const entry = this.cache.get(this.getCacheKey(classId, periodId));
		if (entry) {
			entry.optimistic.delete(studentId);
		}
	}

	/**
	 * Rollback optimistic update for a student (on error)
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @param studentId - The student ID
	 */
	rollbackOptimistic(classId: string, periodId: string, studentId: string): void {
		this.clearOptimistic(classId, periodId, studentId);
	}

	// ========================================================================
	// PRIVATE METHODS (Internal Implementation)
	// ========================================================================

	/**
	 * Fetch warnings data from API and update cache
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Promise resolving to Map of student IDs to warning counts
	 * @private
	 */
	private async fetch(
		classId: string,
		periodId: string
	): Promise<Map<string, StudentWarningCounts>> {
		const key = this.getCacheKey(classId, periodId);

		// Set loading state
		this.cache.set(key, {
			data: new Map(),
			timestamp: Date.now(),
			loading: true,
			optimistic: new Map()
		});

		try {
			// Fetch from API
			const url = `/api/classes/${classId}/warnings?period_id=${periodId}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Failed to fetch warnings: ${response.statusText}`);
			}

			const result = await response.json();

			// The API returns an object with student IDs as keys and counts as values
			// Format: { studentId: { C: 0, M: 1, R: 0, T: 0, total: 1, score: 19, warnings: [...] } }
			const dataMap = new Map<string, StudentWarningCounts>();

			if (result && typeof result === 'object') {
				Object.entries(result).forEach(([studentId, counts]) => {
					dataMap.set(studentId, counts as StudentWarningCounts);
				});
			}

			// Update cache
			this.cache.set(key, {
				data: dataMap,
				timestamp: Date.now(),
				loading: false,
				optimistic: new Map()
			});

			return dataMap;
		} catch (error) {
			console.error('[WarningsCache] Error fetching warnings:', error);
			this.cache.delete(key);
			throw error;
		}
	}

	/**
	 * Wait for an in-flight request to complete
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Promise resolving to warnings data when loading completes
	 * @private
	 */
	private async waitForLoad(
		classId: string,
		periodId: string
	): Promise<Map<string, StudentWarningCounts>> {
		const key = this.getCacheKey(classId, periodId);

		return new Promise((resolve, reject) => {
			const checkInterval = setInterval(() => {
				const entry = this.cache.get(key);

				if (!entry) {
					clearInterval(checkInterval);
					reject(new Error('Failed to load warnings'));
					return;
				}

				if (!entry.loading) {
					clearInterval(checkInterval);
					resolve(this.getCached(classId, periodId) || new Map());
				}
			}, 100);

			setTimeout(() => {
				clearInterval(checkInterval);
				reject(new Error('Timeout waiting for warnings to load'));
			}, 10000);
		});
	}

	// ========================================================================
	// CACHE INVALIDATION
	// ========================================================================

	/**
	 * Invalidate cache for a specific class and period
	 *
	 * Removes cached data for a single class+period combination.
	 *
	 * @param classId - The class ID to invalidate
	 * @param periodId - The academic period ID to invalidate
	 *
	 * @example
	 * // After server update completes
	 * await createWarning(studentId, type);
	 * warningsCache.invalidate(classId, periodId);
	 */
	invalidate(classId: string, periodId: string): void {
		this.cache.delete(this.getCacheKey(classId, periodId));
	}

	/**
	 * Invalidate all periods for a specific class
	 *
	 * Removes cached data for all periods of a single class.
	 *
	 * @param classId - The class ID to invalidate
	 *
	 * @example
	 * // After class-wide operation
	 * warningsCache.invalidateClass(classId);
	 */
	invalidateClass(classId: string): void {
		// Find and delete all cache entries for this class
		const keysToDelete: string[] = [];
		this.cache.forEach((_, key) => {
			if (key.startsWith(`${classId}:`)) {
				keysToDelete.push(key);
			}
		});
		keysToDelete.forEach((key) => this.cache.delete(key));
	}

	/**
	 * Clear entire cache
	 *
	 * Removes all cached data for all classes and periods.
	 *
	 * @example
	 * // On logout
	 * warningsCache.clear();
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
			cachedEntries: this.cache.size,
			loadingEntries: Array.from(this.cache.values()).filter((e) => e.loading).length,
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
 * import { warningsCache } from '$lib/stores/warningsCache.svelte';
 *
 * const warnings = await warningsCache.get(classId, periodId);
 */
export const warningsCache = new WarningsCacheStore();
