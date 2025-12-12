/**
 * LRU Cache with TTL for Typst compilation results
 *
 * Caches compiled Typst documents (PDF as Uint8Array, SVG as string) to avoid
 * recompiling identical content. Uses FNV-1a hash for content hashing and
 * Map for storage with LRU eviction based on access order.
 *
 * @module typst/cache/typst-cache
 */

import type { CacheEntry, CacheStats, OutputFormat } from '../types';

/**
 * LRU Cache with TTL for Typst compilation results
 *
 * @example Basic usage
 * ```typescript
 * const cache = new TypstCache(50, 5 * 60 * 1000); // 50 entries, 5 min TTL
 *
 * // Cache a PDF result
 * cache.set(typstSource, 'pdf', pdfBytes);
 *
 * // Retrieve from cache
 * const cached = cache.get(typstSource, 'pdf');
 * if (cached) {
 *   return cached; // Cache hit
 * }
 * ```
 */
export class TypstCache {
	private cache: Map<string, CacheEntry<Uint8Array | string>>;
	private maxSize: number;
	private ttl: number;
	private stats: CacheStats;

	/**
	 * Create a new TypstCache instance
	 *
	 * @param maxSize - Maximum number of entries to store (default: 50)
	 * @param ttl - Time-to-live in milliseconds (default: 5 minutes)
	 */
	constructor(maxSize = 50, ttl = 5 * 60 * 1000) {
		this.cache = new Map();
		this.maxSize = maxSize;
		this.ttl = ttl;
		this.stats = {
			size: 0,
			hits: 0,
			misses: 0,
			evictions: 0
		};
	}

	/**
	 * Get cached entry if exists and not expired
	 * Updates LRU order by moving accessed entry to end
	 *
	 * @param content - The Typst source content
	 * @param format - The output format (pdf, svg, typst)
	 * @returns Cached data or null if not found/expired
	 */
	get(content: string, format: OutputFormat): (Uint8Array | string) | null {
		const key = this.generateKey(content, format);
		const entry = this.cache.get(key);

		if (!entry) {
			this.stats.misses++;
			return null;
		}

		if (this.isExpired(entry)) {
			this.cache.delete(key);
			this.stats.size = this.cache.size;
			this.stats.misses++;
			return null;
		}

		// Move to end (most recently used) by re-inserting
		this.cache.delete(key);
		entry.accessCount++;
		this.cache.set(key, entry);

		this.stats.hits++;
		return entry.data;
	}

	/**
	 * Store compilation result in cache
	 *
	 * @param content - The Typst source content
	 * @param format - The output format (pdf, svg, typst)
	 * @param data - The compiled result (Uint8Array for PDF, string for SVG/Typst)
	 */
	set(content: string, format: OutputFormat, data: Uint8Array | string): void {
		const key = this.generateKey(content, format);
		const contentHash = this.hashContent(content);

		// Check if key already exists (update case)
		const existingEntry = this.cache.get(key);
		if (existingEntry) {
			// Remove existing to update position
			this.cache.delete(key);
		} else {
			// New entry - check capacity
			if (this.cache.size >= this.maxSize) {
				this.evictOldest();
			}
		}

		const entry: CacheEntry<Uint8Array | string> = {
			data,
			createdAt: Date.now(),
			accessCount: 0,
			contentHash
		};

		this.cache.set(key, entry);
		this.stats.size = this.cache.size;
	}

	/**
	 * Check if entry exists (without updating LRU order)
	 *
	 * @param content - The Typst source content
	 * @param format - The output format
	 * @returns True if entry exists and is not expired
	 */
	has(content: string, format: OutputFormat): boolean {
		const key = this.generateKey(content, format);
		const entry = this.cache.get(key);

		if (!entry) {
			return false;
		}

		if (this.isExpired(entry)) {
			this.cache.delete(key);
			this.stats.size = this.cache.size;
			return false;
		}

		return true;
	}

	/**
	 * Clear all entries and reset stats
	 */
	clear(): void {
		this.cache.clear();
		this.stats = {
			size: 0,
			hits: 0,
			misses: 0,
			evictions: 0
		};
	}

	/**
	 * Get cache statistics
	 *
	 * @returns Current cache statistics
	 */
	getStats(): CacheStats {
		return { ...this.stats };
	}

	/**
	 * Generate cache key from content and format
	 * Uses content hash combined with format for uniqueness
	 *
	 * @param content - The Typst source content
	 * @param format - The output format
	 * @returns Unique cache key
	 */
	private generateKey(content: string, format: OutputFormat): string {
		const contentHash = this.hashContent(content);
		return `${format}:${contentHash}`;
	}

	/**
	 * FNV-1a hash function (consistent with markdown-cache.ts)
	 * Fast and produces good distribution for strings
	 *
	 * @param str - String to hash
	 * @returns Hash as base36 string
	 */
	private hashContent(str: string): string {
		let hash = 2166136261;
		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			hash = (hash * 16777619) >>> 0; // Force unsigned 32-bit
		}
		return hash.toString(36);
	}

	/**
	 * Evict oldest entry (for LRU)
	 * The first entry in Map iteration order is the least recently used
	 */
	private evictOldest(): void {
		const firstKey = this.cache.keys().next().value;
		if (firstKey) {
			this.cache.delete(firstKey);
			this.stats.evictions++;
			this.stats.size = this.cache.size;
		}
	}

	/**
	 * Check if entry is expired based on TTL
	 *
	 * @param entry - Cache entry to check
	 * @returns True if entry has exceeded TTL
	 */
	private isExpired(entry: CacheEntry<unknown>): boolean {
		return Date.now() - entry.createdAt > this.ttl;
	}
}

/**
 * Create a new TypstCache instance
 *
 * @param maxSize - Maximum number of entries (default: 50)
 * @param ttl - Time-to-live in milliseconds (default: 5 minutes)
 * @returns New TypstCache instance
 *
 * @example Create with defaults
 * ```typescript
 * const cache = createTypstCache();
 * ```
 *
 * @example Create with custom settings
 * ```typescript
 * const cache = createTypstCache(100, 10 * 60 * 1000); // 100 entries, 10 min TTL
 * ```
 */
export function createTypstCache(maxSize?: number, ttl?: number): TypstCache {
	return new TypstCache(maxSize, ttl);
}
