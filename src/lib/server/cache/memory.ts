/**
 * In-Memory Cache Module (RAM Server - Tier 2)
 *
 * Ultra-fast in-memory cache using Node.js process memory.
 * Logs use format: [functionName][RAM Server][Tier-2]
 *
 * Tier hierarchy (fastest to slowest):
 * - Tier-3: Client Store (browser)
 * - Tier-2: RAM Server (this module)
 * - Tier-1: Redis (Upstash)
 * - DB: Supabase Postgres (source of truth)
 *
 * Provides a type-safe, TTL-based in-memory cache with automatic cleanup.
 * Designed for per-user, per-request data that doesn't benefit from Redis.
 *
 * ## When to use In-Memory vs Redis:
 *
 * ### Use In-Memory Cache when:
 * - Data is user-specific and short-lived (< 5 minutes)
 * - Data is small and frequently accessed within a single request/session
 * - You need sub-millisecond latency (no network roundtrip)
 * - Data doesn't need to be shared across multiple server instances
 * - Examples: user session data, request-scoped computations, temporary state
 *
 * ### Use Redis Cache when:
 * - Data needs to be shared across multiple server instances
 * - Data should persist beyond process restarts
 * - Implementing rate limiting or distributed locks
 * - Caching large datasets or query results
 * - TTL > 5 minutes
 * - Examples: assessment results, activity counts, authentication tokens
 *
 * ## Memory Leak Prevention:
 * - Automatic cleanup runs every 60 seconds to remove expired entries
 * - All entries have mandatory TTL (no infinite caching)
 * - Call `destroy()` in tests or when shutting down to prevent timer leaks
 * - Use `clear()` to reset cache state
 *
 * @example
 * ```typescript
 * // Simple usage with automatic caching
 * const userData = await getMemoryCached(
 *   `user:${userId}:profile`,
 *   60, // 1 minute TTL
 *   async () => {
 *     return await supabase.from('users').select('*').eq('id', userId).single();
 *   }
 * );
 *
 * // Advanced usage with manual control
 * import { memoryCache } from '$lib/server/cache/memory';
 *
 * // Get with fallback
 * const data = await memoryCache.get('key', 300, async () => expensiveOperation());
 *
 * // Invalidate single key
 * memoryCache.invalidate('user:123:profile');
 *
 * // Invalidate all keys matching pattern
 * memoryCache.invalidatePattern('user:123:');
 *
 * // Get cache statistics
 * const stats = memoryCache.getStats();
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 */

import { dev } from '$app/environment';

/**
 * Cache entry structure with type-safe data and expiration timestamp
 */
interface CacheEntry<T> {
	/** Cached data of generic type T */
	data: T;
	/** Unix timestamp (ms) when this entry expires */
	expires: number;
}

/**
 * Cache statistics for monitoring and debugging
 */
interface CacheStats {
	/** Total number of entries currently in cache */
	size: number;
	/** Number of cache hits since creation */
	hits: number;
	/** Number of cache misses since creation */
	misses: number;
	/** Hit rate as percentage (0-100) */
	hitRate: number;
	/** Number of entries removed during cleanup */
	evictions: number;
}

/**
 * In-Memory Cache implementation with TTL and automatic cleanup
 */
export class MemoryCache {
	/** Internal cache storage using Map for O(1) lookups */
	private cache: Map<string, CacheEntry<unknown>> = new Map();

	/** Cleanup interval timer (stored to allow destroy()) */
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	/** Statistics tracking */
	private stats = {
		hits: 0,
		misses: 0,
		evictions: 0
	};

	constructor() {
		// Start automatic cleanup every 60 seconds
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60_000); // 60 seconds

		// Allow Node.js to exit even if interval is running
		if (this.cleanupInterval.unref) {
			this.cleanupInterval.unref();
		}
	}

	/**
	 * Get cached value or compute it using fallback function
	 *
	 * @param key - Cache key (use namespaced keys like "user:123:profile")
	 * @param ttlSeconds - Time to live in seconds
	 * @param fallback - Async function to compute value on cache miss
	 * @param functionName - Name of calling function for logging (default: 'getMemoryCached')
	 * @returns Cached or computed value
	 *
	 * @example
	 * ```typescript
	 * const profile = await memoryCache.get(
	 *   'user:123:profile',
	 *   60,
	 *   async () => fetchUserProfile(123),
	 *   'getCachedProfile'
	 * );
	 * ```
	 */
	async get<T>(
		key: string,
		ttlSeconds: number,
		fallback: () => Promise<T>,
		functionName: string = 'getMemoryCached'
	): Promise<T> {
		const now = Date.now();
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;

		// Cache hit: return data if not expired
		if (entry && entry.expires > now) {
			this.stats.hits++;
			if (dev) {
				console.log(`[${functionName}][RAM Server][Tier-2] 🎯 HIT (0ms) ${key}`);
			}
			return entry.data;
		}

		// Cache miss: compute and store
		this.stats.misses++;
		if (dev) {
			console.log(`[${functionName}][RAM Server][Tier-2] ❌ MISS (0ms) → fetching from fallback`);
		}

		const data = await fallback();
		this.cache.set(key, {
			data,
			expires: now + ttlSeconds * 1000
		});

		return data;
	}

	/**
	 * Invalidate a specific cache key
	 *
	 * @param key - Cache key to invalidate
	 * @returns true if key existed and was removed, false otherwise
	 *
	 * @example
	 * ```typescript
	 * memoryCache.invalidate('user:123:profile');
	 * ```
	 */
	invalidate(key: string): boolean {
		const deleted = this.cache.delete(key);
		if (deleted && dev) {
			console.log(`[invalidate][RAM Server][Tier-2] 🗑️ INVALIDATE ${key}`);
		}
		return deleted;
	}

	/**
	 * Invalidate all keys matching a prefix pattern
	 *
	 * Useful for invalidating all cache entries for a specific user or entity
	 *
	 * @param prefix - Key prefix to match (e.g., "user:123:")
	 * @returns Number of keys invalidated
	 *
	 * @example
	 * ```typescript
	 * // Invalidate all cache entries for user 123
	 * const count = memoryCache.invalidatePattern('user:123:');
	 * console.log(`Invalidated ${count} entries`);
	 * ```
	 */
	invalidatePattern(prefix: string): number {
		let count = 0;
		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
				count++;
			}
		}
		if (count > 0 && dev) {
			console.log(
				`[invalidatePattern][RAM Server][Tier-2] 🗑️ INVALIDATE PATTERN ${prefix} (${count} entries)`
			);
		}
		return count;
	}

	/**
	 * Clear all cache entries
	 *
	 * Use with caution in production. Primarily for testing.
	 *
	 * @example
	 * ```typescript
	 * memoryCache.clear(); // Remove all entries
	 * ```
	 */
	clear(): void {
		const size = this.cache.size;
		this.cache.clear();
		if (dev && size > 0) {
			console.log(`[clear][RAM Server][Tier-2] 🗑️ CLEAR (${size} entries removed)`);
		}
	}

	/**
	 * Remove expired entries from cache
	 *
	 * Called automatically every 60 seconds. Can be called manually for testing.
	 *
	 * @returns Number of entries evicted
	 */
	cleanup(): number {
		const now = Date.now();
		let evicted = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.expires <= now) {
				this.cache.delete(key);
				evicted++;
			}
		}

		this.stats.evictions += evicted;

		if (evicted > 0 && dev) {
			console.log(`[cleanup][RAM Server][Tier-2] 🧹 CLEANUP (${evicted} entries evicted)`);
		}

		return evicted;
	}

	/**
	 * Get cache statistics for monitoring and debugging
	 *
	 * @returns Cache statistics object
	 *
	 * @example
	 * ```typescript
	 * const stats = memoryCache.getStats();
	 * console.log(`Cache size: ${stats.size}`);
	 * console.log(`Hit rate: ${stats.hitRate}%`);
	 * ```
	 */
	getStats(): CacheStats {
		const { hits, misses, evictions } = this.stats;
		const total = hits + misses;
		const hitRate = total > 0 ? (hits / total) * 100 : 0;

		return {
			size: this.cache.size,
			hits,
			misses,
			hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
			evictions
		};
	}

	/**
	 * Destroy cache and stop cleanup interval
	 *
	 * IMPORTANT: Call this in tests or when shutting down to prevent timer leaks
	 *
	 * @example
	 * ```typescript
	 * // In test teardown
	 * afterAll(() => {
	 *   memoryCache.destroy();
	 * });
	 * ```
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.clear();
		if (dev) {
			console.log('[destroy][RAM Server][Tier-2] 🛑 DESTROY (cleanup interval stopped)');
		}
	}
}

/**
 * Singleton instance of MemoryCache
 *
 * Use this for advanced cache control (invalidation, stats, etc.)
 */
export const memoryCache = new MemoryCache();

/**
 * Convenience function for simple caching with automatic fallback
 *
 * This is the recommended way to use the cache for most use cases.
 *
 * @param key - Cache key (use namespaced keys like "user:123:profile")
 * @param ttlSeconds - Time to live in seconds
 * @param fallback - Async function to compute value on cache miss
 * @param functionName - Name of calling function for logging (default: 'getMemoryCached')
 * @returns Cached or computed value
 *
 * @example
 * ```typescript
 * // Cache user profile for 60 seconds
 * const profile = await getMemoryCached(
 *   `user:${userId}:profile`,
 *   60,
 *   async () => {
 *     const { data } = await supabase
 *       .from('users')
 *       .select('*')
 *       .eq('id', userId)
 *       .single();
 *     return data;
 *   },
 *   'getCachedProfile'
 * );
 * ```
 */
export async function getMemoryCached<T>(
	key: string,
	ttlSeconds: number,
	fallback: () => Promise<T>,
	functionName: string = 'getMemoryCached'
): Promise<T> {
	return memoryCache.get(key, ttlSeconds, fallback, functionName);
}
