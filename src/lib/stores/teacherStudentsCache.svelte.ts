/**
 * Teacher Students Cache Store
 * =============================
 *
 * Client-side cache for teacher's class students with progressive loading.
 * Uses Svelte 5 runes for reactive state management.
 *
 * FEATURES:
 * ---------
 * - Progressive Loading: Fetch only when needed (lazy loading)
 * - Deduplication: Multiple requests for same class = single API call
 * - Smart Invalidation: Event-based cache clearing on mutations
 * - Loading States: Track in-flight requests per class
 * - Flexible API: Support minimal or full student data
 *
 * USAGE:
 * ------
 * ```typescript
 * import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
 *
 * // Get students (auto-fetches if not cached)
 * const students = await teacherStudentsCache.getStudents(classId);
 *
 * // Get students with full data (gidouilles, vip_cards, etc.)
 * const studentsWithRewards = await teacherStudentsCache.getStudents(classId, true);
 *
 * // Check if class is cached
 * if (teacherStudentsCache.has(classId)) { ... }
 *
 * // Invalidate specific class after mutation
 * teacherStudentsCache.invalidate(classId);
 *
 * // Clear entire cache
 * teacherStudentsCache.clear();
 * ```
 *
 * CACHE INVALIDATION TRIGGERS:
 * -----------------------------
 * - Student import (new students added)
 * - Rewards changed (gidouilles/VIP cards modified)
 * - Class membership changed (students added/removed)
 * - Manual invalidation via invalidate() or clear()
 *
 * PERFORMANCE:
 * ------------
 * - Reduces redundant API calls across dashboard
 * - Dashboard modal uses cache (no reload on reopen)
 * - Pages can share cached data
 * - Memory efficient (cache only fetched classes)
 */

import { getContext, setContext } from 'svelte';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal student data (for Wheel component)
 */
export interface CachedStudent {
	id: string;
	firstname: string;
	lastname?: string;
	avatar_url?: string;
}

/**
 * Full student data (for Rewards page)
 */
export interface CachedStudentFull extends CachedStudent {
	full_name?: string;
	gidouilles: number;
	vip_cards: any; // StudentVipCards type
	role?: string;
	gender?: string;
}

/**
 * Cache entry for a single class
 */
interface CacheEntry {
	students: CachedStudent[] | CachedStudentFull[];
	lastFetched: Date;
	isLoading: boolean;
	isFull: boolean; // Whether this cache has full data
}

/**
 * Cache storage (classId -> CacheEntry)
 */
type CacheStorage = Map<string, CacheEntry>;

// ============================================================================
// CACHE STORE (SVELTE 5 RUNES)
// ============================================================================

class TeacherStudentsCacheStore {
	// ========================================================================
	// PRIVATE STATE
	// ========================================================================

	/**
	 * Reactive cache storage using Svelte 5 $state rune
	 *
	 * Structure: Map<classId, CacheEntry>
	 *
	 * Why Map instead of object:
	 * - Faster lookups for large number of classes
	 * - Maintains insertion order
	 * - Better memory efficiency
	 * - Native has(), delete(), clear() methods
	 *
	 * Why $state:
	 * - Svelte 5 rune for reactive state management
	 * - Automatically tracks changes within the Map
	 * - Triggers re-renders in components that access the cache
	 */
	private cache = $state<CacheStorage>(new Map());

	// ========================================================================
	// PUBLIC QUERY METHODS (Synchronous)
	// ========================================================================

	/**
	 * Check if a class is cached
	 *
	 * Returns true if the class has been fetched (even if currently loading).
	 * Use getCached() to check if data is actually available.
	 *
	 * @param classId - The class ID to check
	 * @returns true if class exists in cache, false otherwise
	 *
	 * @example
	 * if (cache.has('class-123')) {
	 *   console.log('Class is in cache');
	 * }
	 */
	has(classId: string): boolean {
		return this.cache.has(classId);
	}

	/**
	 * Check if a class is currently loading
	 *
	 * Useful for showing loading spinners in UI.
	 * Returns false for classes not in cache or already loaded.
	 *
	 * @param classId - The class ID to check
	 * @returns true if class is currently being fetched, false otherwise
	 *
	 * @example
	 * if (cache.isLoading('class-123')) {
	 *   return <Spinner />;
	 * }
	 */
	isLoading(classId: string): boolean {
		return this.cache.get(classId)?.isLoading ?? false;
	}

	/**
	 * Get cached students synchronously
	 *
	 * Returns undefined if:
	 * - Class is not cached
	 * - Class is currently loading
	 *
	 * Use this for instant access without async/await.
	 * Follow up with getStudents() to trigger fetch if needed.
	 *
	 * @param classId - The class ID
	 * @returns Student array or undefined
	 *
	 * @example
	 * const cached = cache.getCached('class-123');
	 * if (cached) {
	 *   // Display immediately
	 *   renderStudents(cached);
	 * } else {
	 *   // Fetch in background
	 *   cache.getStudents('class-123');
	 * }
	 */
	getCached(classId: string): CachedStudent[] | CachedStudentFull[] | undefined {
		const entry = this.cache.get(classId);
		// Don't return data if still loading
		if (!entry || entry.isLoading) return undefined;
		return entry.students;
	}

	// ========================================================================
	// PUBLIC ASYNC METHODS (Data Fetching)
	// ========================================================================

	/**
	 * Get students for a class (async - fetches if not cached)
	 *
	 * This is the main method for retrieving student data.
	 * It implements smart caching logic with three scenarios:
	 *
	 * **Scenario 1: Cache Hit**
	 * - Returns cached data immediately
	 * - If full data is cached, always returns it (even for minimal requests)
	 * - If minimal data is cached but full is requested, re-fetches
	 *
	 * **Scenario 2: Currently Loading (Deduplication)**
	 * - Waits for in-flight request to complete
	 * - Prevents duplicate API calls for simultaneous requests
	 * - All waiters receive the same data
	 *
	 * **Scenario 3: Cache Miss**
	 * - Fetches from API
	 * - Stores result in cache
	 * - Returns fresh data
	 *
	 * @param classId - The class ID
	 * @param full - Whether to fetch full student data (default: false)
	 *               - false: Returns id, firstname, lastname, avatar_url
	 *               - true: Returns all fields + gidouilles, vip_cards, role, gender
	 * @returns Promise resolving to student array
	 *
	 * @example
	 * // Minimal data (for Wheel component)
	 * const students = await cache.getStudents('class-123');
	 *
	 * @example
	 * // Full data (for Rewards page)
	 * const students = await cache.getStudents('class-123', true);
	 */
	async getStudents(
		classId: string,
		full: boolean = false
	): Promise<CachedStudent[] | CachedStudentFull[]> {
		const entry = this.cache.get(classId);

		// ====================================================================
		// CASE 1: CACHE HIT - Return cached data if available
		// ====================================================================
		if (entry && !entry.isLoading) {
			// Sub-case 1a: Full data is cached
			// Always return full data (satisfies both minimal and full requests)
			if (entry.isFull) {
				return entry.students;
			}

			// Sub-case 1b: Minimal data is cached, but full data is requested
			// Need to upgrade cache by re-fetching
			if (!entry.isFull && full) {
				return this.fetchStudents(classId, full);
			}

			// Sub-case 1c: Minimal data is cached, minimal data is requested
			// Perfect match - return cached data
			return entry.students;
		}

		// ====================================================================
		// CASE 2: CURRENTLY LOADING - Wait for in-flight request
		// ====================================================================
		// Deduplication: If another component already triggered a fetch,
		// wait for it to complete instead of making a duplicate request
		if (entry?.isLoading) {
			return this.waitForLoad(classId);
		}

		// ====================================================================
		// CASE 3: CACHE MISS - Fetch from API
		// ====================================================================
		return this.fetchStudents(classId, full);
	}

	// ========================================================================
	// PRIVATE METHODS (Internal Implementation)
	// ========================================================================

	/**
	 * Fetch students from API and update cache
	 *
	 * This method handles the actual HTTP request to the backend API.
	 *
	 * **Flow:**
	 * 1. Set loading state immediately (prevents duplicate requests)
	 * 2. Fetch from `/api/classes/{classId}/students[?full=true]`
	 * 3. On success: Update cache with data, mark as loaded
	 * 4. On error: Remove cache entry, throw error (allows retry)
	 *
	 * **Error Handling:**
	 * - Network errors: Thrown and propagated to caller
	 * - HTTP errors (404, 500, etc.): Thrown with status text
	 * - Invalid JSON: Thrown by response.json()
	 * - Cache is deleted on error (allows subsequent retry)
	 *
	 * @param classId - The class ID
	 * @param full - Whether to request full student data
	 * @returns Promise resolving to student array
	 * @throws Error if fetch fails for any reason
	 * @private
	 */
	private async fetchStudents(
		classId: string,
		full: boolean
	): Promise<CachedStudent[] | CachedStudentFull[]> {
		// ====================================================================
		// STEP 1: Set loading state
		// ====================================================================
		// This prevents duplicate fetches (deduplication)
		// Other concurrent requests will wait via waitForLoad()
		this.cache.set(classId, {
			students: [],
			lastFetched: new Date(),
			isLoading: true,
			isFull: full
		});

		try {
			// ================================================================
			// STEP 2: Build API URL
			// ================================================================
			// Minimal: /api/classes/{classId}/students
			// Full:    /api/classes/{classId}/students?full=true
			const url = `/api/classes/${classId}/students${full ? '?full=true' : ''}`;

			// ================================================================
			// STEP 3: Fetch from API
			// ================================================================
			const response = await fetch(url);

			// Check HTTP status
			if (!response.ok) {
				throw new Error(`Failed to fetch students: ${response.statusText}`);
			}

			// Parse JSON response
			const data = await response.json();
			const students = data.students || []; // Default to empty array if missing

			// ================================================================
			// STEP 4: Update cache with successful result
			// ================================================================
			this.cache.set(classId, {
				students,
				lastFetched: new Date(),
				isLoading: false, // Mark as loaded
				isFull: full
			});

			return students;
		} catch (error) {
			// ================================================================
			// ERROR HANDLING
			// ================================================================
			// Log error for debugging
			console.error('Error fetching students:', error);

			// Remove cache entry to allow retry
			// Important: Don't leave stale loading state
			this.cache.delete(classId);

			// Re-throw error for caller to handle
			throw error;
		}
	}

	/**
	 * Wait for an in-flight request to complete
	 *
	 * This method implements request deduplication by allowing multiple
	 * concurrent requests for the same class to wait for a single API call
	 * to complete, rather than triggering duplicate fetches.
	 *
	 * **Polling Mechanism:**
	 * - Checks cache every 100ms for completion
	 * - Resolves when isLoading becomes false
	 * - Rejects if cache entry is deleted (error occurred)
	 * - Times out after 10 seconds to prevent infinite waiting
	 *
	 * **Why Polling Instead of Events:**
	 * - Svelte 5 runes don't provide direct subscription mechanisms
	 * - Simpler implementation than custom event emitters
	 * - 100ms intervals provide responsive UX without performance issues
	 *
	 * **Example Scenario:**
	 * 1. Component A calls getStudents('class-1')
	 * 2. Component B calls getStudents('class-1') 50ms later
	 * 3. Component B enters waitForLoad (Component A is still fetching)
	 * 4. Both components receive the same data when fetch completes
	 * 5. Result: 1 API call instead of 2
	 *
	 * @param classId - The class ID to wait for
	 * @returns Promise resolving to student array when loading completes
	 * @throws Error if entry is deleted (fetch failed) or timeout occurs
	 * @private
	 */
	private async waitForLoad(classId: string): Promise<CachedStudent[] | CachedStudentFull[]> {
		return new Promise((resolve, reject) => {
			// ================================================================
			// POLLING LOOP - Check every 100ms
			// ================================================================
			const checkInterval = setInterval(() => {
				const entry = this.cache.get(classId);

				// Case 1: Entry removed (error occurred during fetch)
				if (!entry) {
					clearInterval(checkInterval);
					reject(new Error('Failed to load students'));
					return;
				}

				// Case 2: Loading complete (success)
				if (!entry.isLoading) {
					clearInterval(checkInterval);
					resolve(entry.students);
				}

				// Case 3: Still loading - continue polling
			}, 100);

			// ================================================================
			// TIMEOUT PROTECTION - Prevent infinite waiting
			// ================================================================
			setTimeout(() => {
				clearInterval(checkInterval);
				reject(new Error('Timeout waiting for students to load'));
			}, 10000);
		});
	}

	/**
	 * Invalidate cache for a specific class
	 *
	 * Removes cached data for a single class, forcing the next getStudents()
	 * call to fetch fresh data from the API.
	 *
	 * **When to Call:**
	 * - After awarding gidouilles to students
	 * - After awarding/removing VIP cards
	 * - After updating student data
	 * - After any mutation that affects student list or data
	 *
	 * **What Happens:**
	 * - Deletes cache entry from Map
	 * - Next getStudents() call will hit "Case 3: Cache Miss"
	 * - Fresh data will be fetched and re-cached
	 *
	 * **Performance Impact:**
	 * - Minimal (single Map.delete operation)
	 * - Surgical invalidation (only affects one class)
	 * - Preserves cache for unaffected classes
	 *
	 * @param classId - The class ID to invalidate
	 *
	 * @example
	 * // After awarding gidouilles
	 * await awardGidouilles(studentId, amount);
	 * teacherStudentsCache.invalidate(classId);
	 *
	 * @example
	 * // After updating student in Rewards page
	 * const response = await fetch('?/updateRewards', { ... });
	 * if (response.ok) {
	 *   teacherStudentsCache.invalidate(classId);
	 * }
	 */
	invalidate(classId: string): void {
		this.cache.delete(classId);
	}

	/**
	 * Invalidate cache for multiple classes
	 *
	 * Batch invalidation for multiple classes at once.
	 * More efficient than calling invalidate() multiple times.
	 *
	 * **Use Cases:**
	 * - Bulk operations affecting multiple classes
	 * - Admin operations (e.g., school-wide updates)
	 * - Cross-class mutations
	 *
	 * @param classIds - Array of class IDs to invalidate
	 *
	 * @example
	 * // After bulk import affecting multiple classes
	 * const affectedClassIds = ['class-1', 'class-2', 'class-3'];
	 * teacherStudentsCache.invalidateMany(affectedClassIds);
	 */
	invalidateMany(classIds: string[]): void {
		classIds.forEach((id) => this.cache.delete(id));
	}

	/**
	 * Clear entire cache
	 *
	 * Removes all cached data for all classes. This is the nuclear option.
	 *
	 * **When to Call:**
	 * - On user logout (prevent data leaking to next user)
	 * - When admin switches impersonation target
	 * - After bulk student import (affects all classes)
	 * - When teacher context changes fundamentally
	 *
	 * **Performance Impact:**
	 * - Fast (single Map.clear operation)
	 * - Forces all classes to re-fetch on next access
	 * - Use sparingly (prefer invalidate() for targeted updates)
	 *
	 * **Example Scenario:**
	 * 1. Teacher has 5 classes cached
	 * 2. Admin imports 100 new students
	 * 3. clear() ensures all classes get fresh data
	 * 4. Next dashboard visit re-populates cache
	 *
	 * @example
	 * // On logout
	 * async function handleLogout() {
	 *   teacherStudentsCache.clear();
	 *   await supabase.auth.signOut();
	 *   goto('/login');
	 * }
	 *
	 * @example
	 * // After bulk import
	 * const result = await importStudents(csvData);
	 * if (result.success) {
	 *   teacherStudentsCache.clear();
	 *   toaster.success('Import complete');
	 * }
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Preload students for a class (fire-and-forget)
	 *
	 * Triggers background loading of student data without blocking.
	 * Useful for optimistic data loading to improve perceived performance.
	 *
	 * **Fire-and-Forget Pattern:**
	 * - Returns immediately (void)
	 * - Fetch happens in background
	 * - Errors are logged to console, not thrown
	 * - Caller doesn't wait for completion
	 *
	 * **Smart Preloading:**
	 * - Skips if data is already cached
	 * - Only re-fetches if upgrading from minimal to full data
	 * - Prevents unnecessary network requests
	 *
	 * **Use Cases:**
	 * - Preload when user selects a class (before opening wheel)
	 * - Preload on page mount for default class
	 * - Preload on hover (anticipatory loading)
	 * - Preload adjacent items in pagination
	 *
	 * **Performance Benefits:**
	 * - Instant UI response (no await needed)
	 * - Data ready when user needs it
	 * - Reduces perceived latency
	 * - Non-blocking UX
	 *
	 * @param classId - The class ID to preload
	 * @param full - Whether to preload full student data (default: false)
	 *
	 * @example
	 * // Preload when class is selected
	 * $effect(() => {
	 *   if (selectedClassId) {
	 *     teacherStudentsCache.preload(selectedClassId);
	 *   }
	 * });
	 *
	 * @example
	 * // Preload on mount
	 * onMount(() => {
	 *   const defaultClassId = classes[0]?.id;
	 *   if (defaultClassId) {
	 *     teacherStudentsCache.preload(defaultClassId);
	 *   }
	 * });
	 *
	 * @example
	 * // Preload on hover (anticipatory)
	 * function handleMouseEnter(classId: string) {
	 *   teacherStudentsCache.preload(classId);
	 * }
	 */
	preload(classId: string, full: boolean = false): void {
		// ====================================================================
		// SKIP CONDITIONS - Don't preload if data is sufficient
		// ====================================================================
		const entry = this.cache.get(classId);

		// Already has full data - always sufficient
		if (entry?.isFull) {
			return;
		}

		// Already has minimal data and we only need minimal
		if (entry && !full) {
			return;
		}

		// ====================================================================
		// FIRE-AND-FORGET FETCH
		// ====================================================================
		// Intentionally not awaiting - this is background loading
		this.getStudents(classId, full).catch((error) => {
			// Log but don't throw - preload failures are non-critical
			console.warn('Preload failed for class:', classId, error);
		});
	}

	/**
	 * Get cache statistics (for debugging)
	 *
	 * Returns aggregate statistics about the current cache state.
	 * Useful for monitoring, debugging, and performance analysis.
	 *
	 * **Returned Statistics:**
	 * - `cachedClasses`: Total number of classes in cache
	 * - `loadingClasses`: Number of classes currently being fetched
	 * - `totalStudents`: Total number of students across all cached classes
	 *
	 * **Use Cases:**
	 * - Debug logging during development
	 * - Performance monitoring dashboards
	 * - Verifying cache is working correctly
	 * - Unit test assertions
	 * - Admin debug pages
	 *
	 * **Performance:**
	 * - O(n) complexity where n = number of cached classes
	 * - Iterates through all cache entries
	 * - Safe to call frequently (no side effects)
	 *
	 * @returns Object with cache statistics
	 *
	 * @example
	 * // Log cache state
	 * const stats = teacherStudentsCache.getStats();
	 * console.log('Cache stats:', stats);
	 * // Output: { cachedClasses: 5, loadingClasses: 1, totalStudents: 127 }
	 *
	 * @example
	 * // Test cache population
	 * await teacherStudentsCache.getStudents('class-1');
	 * const stats = teacherStudentsCache.getStats();
	 * expect(stats.cachedClasses).toBe(1);
	 * expect(stats.loadingClasses).toBe(0);
	 *
	 * @example
	 * // Debug page display
	 * const stats = teacherStudentsCache.getStats();
	 * return (
	 *   <div>
	 *     <p>Classes cached: {stats.cachedClasses}</p>
	 *     <p>Currently loading: {stats.loadingClasses}</p>
	 *     <p>Total students: {stats.totalStudents}</p>
	 *   </div>
	 * );
	 */
	getStats() {
		return {
			// Total number of classes in cache (loading + loaded)
			cachedClasses: this.cache.size,

			// Number of classes with in-flight API requests
			loadingClasses: Array.from(this.cache.values()).filter((e) => e.isLoading).length,

			// Total students across all cached classes
			totalStudents: Array.from(this.cache.values()).reduce(
				(sum, e) => sum + e.students.length,
				0
			)
		};
	}
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Symbol key for Svelte context API
 *
 * Using a Symbol (instead of string) prevents naming collisions across
 * different parts of the application. Symbols are guaranteed unique.
 *
 * @private
 */
const CACHE_KEY = Symbol('teacherStudentsCache');

/**
 * Get or create the cache instance from Svelte context
 *
 * This function provides component-tree scoped cache instances using
 * Svelte's context API. However, for most use cases, the module-level
 * singleton (teacherStudentsCache) is simpler and recommended.
 *
 * **When to Use This:**
 * - When you need different cache instances per component tree
 * - In advanced testing scenarios with multiple isolated trees
 * - When building reusable library components
 *
 * **When NOT to Use This:**
 * - In normal application code (use teacherStudentsCache instead)
 * - When you want a shared cache across entire application
 * - In server-side code (context is client-only)
 *
 * **Context Lifecycle:**
 * - Must be called during component initialization
 * - Cache is shared within component tree
 * - Different trees get different instances
 *
 * **Important Notes:**
 * - This must be called during component setup (not in callbacks/effects)
 * - getContext() only works on client side
 * - For server-side code, use the module-level singleton
 *
 * @returns Cache instance from context or newly created instance
 * @throws Error if called outside component initialization
 *
 * @example
 * // In a Svelte component (component initialization)
 * <script>
 *   import { getTeacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
 *
 *   const cache = getTeacherStudentsCache();
 *
 *   async function loadStudents() {
 *     const students = await cache.getStudents(classId);
 *   }
 * </script>
 *
 * @example
 * // WRONG: Don't call in callbacks
 * <script>
 *   function handleClick() {
 *     const cache = getTeacherStudentsCache(); // ❌ Error!
 *   }
 * </script>
 *
 * @see teacherStudentsCache - Recommended for most use cases
 */
export function getTeacherStudentsCache(): TeacherStudentsCacheStore {
	// Try to get existing instance from component context
	let cache = getContext<TeacherStudentsCacheStore>(CACHE_KEY);

	if (!cache) {
		// No instance in context - create and store new one
		cache = new TeacherStudentsCacheStore();
		setContext(CACHE_KEY, cache);
	}

	return cache;
}

/**
 * Module-level singleton cache instance
 *
 * This is the recommended way to access the cache in most scenarios.
 * It provides a single shared cache across the entire application.
 *
 * **Why Singleton:**
 * - One cache shared across all components
 * - Consistent data across application
 * - Simpler API (direct import, no context needed)
 * - Works in both client and server contexts
 * - Easier to test (can access from anywhere)
 *
 * **Usage Patterns:**
 * - Import and use directly in components
 * - Import in SvelteKit load functions
 * - Import in API endpoints
 * - Import in utility functions
 *
 * **Performance:**
 * - No overhead of context lookups
 * - Single memory allocation
 * - Efficient cross-component sharing
 *
 * **Lifecycle:**
 * - Created once when module first imports
 * - Persists for entire application lifetime
 * - Cache survives navigation between pages
 * - Manually call clear() on logout to reset
 *
 * @example
 * // In a Svelte component
 * <script>
 *   import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
 *
 *   let students = $state<Student[]>([]);
 *
 *   async function loadStudents() {
 *     students = await teacherStudentsCache.getStudents(classId);
 *   }
 * </script>
 *
 * @example
 * // In a SvelteKit load function
 * import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
 *
 * export async function load({ params }) {
 *   const students = await teacherStudentsCache.getStudents(params.classId);
 *   return { students };
 * }
 *
 * @example
 * // In a utility function
 * import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
 *
 * export async function getStudentById(classId: string, studentId: string) {
 *   const students = await teacherStudentsCache.getStudents(classId);
 *   return students.find(s => s.id === studentId);
 * }
 *
 * @example
 * // In an API endpoint
 * import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
 *
 * export async function POST({ request }) {
 *   const { classId } = await request.json();
 *   // Invalidate cache after mutation
 *   teacherStudentsCache.invalidate(classId);
 *   return json({ success: true });
 * }
 */
export const teacherStudentsCache = new TeacherStudentsCacheStore();
