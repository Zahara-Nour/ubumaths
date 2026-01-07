/**
 * LRU Cache for Parsed MathAST Expressions
 *
 * Caches parsed AST to avoid re-parsing identical input strings.
 * Uses LRU eviction when cache is full.
 *
 * @module mathAST/cache/parse-cache
 */

import type { MathNode } from '../types';

/**
 * Cache entry storing the AST and metadata.
 */
interface CacheEntry {
	/** The cached AST */
	ast: MathNode;
	/** Number of times this entry was accessed */
	accessCount: number;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
	/** Current number of entries */
	size: number;
	/** Number of cache hits */
	hits: number;
	/** Number of cache misses */
	misses: number;
	/** Number of evicted entries */
	evictions: number;
}

/**
 * LRU Cache for parsed MathAST expressions.
 *
 * @example Basic usage
 * ```typescript
 * const cache = new ParseCache(100);
 *
 * // Check cache before parsing
 * let ast = cache.get(input);
 * if (!ast) {
 *   ast = parseLatex(input);
 *   cache.set(input, ast);
 * }
 * ```
 */
export class ParseCache {
	private cache: Map<string, CacheEntry>;
	private maxSize: number;
	private stats: CacheStats;

	/**
	 * Create a new ParseCache instance.
	 *
	 * @param maxSize - Maximum number of entries (default: 100)
	 */
	constructor(maxSize = 100) {
		this.cache = new Map();
		this.maxSize = Math.max(1, maxSize);
		this.stats = {
			size: 0,
			hits: 0,
			misses: 0,
			evictions: 0
		};
	}

	/**
	 * Get cached AST for an input string.
	 * Updates LRU order by moving accessed entry to end.
	 *
	 * @param input - The input string that was parsed
	 * @returns Cached AST or null if not found
	 */
	get(input: string): MathNode | null {
		const entry = this.cache.get(input);

		if (!entry) {
			this.stats.misses++;
			return null;
		}

		// Move to end (most recently used) by re-inserting
		this.cache.delete(input);
		entry.accessCount++;
		this.cache.set(input, entry);

		this.stats.hits++;
		return entry.ast;
	}

	/**
	 * Store parsed AST in cache.
	 *
	 * @param input - The input string that was parsed
	 * @param ast - The parsed AST
	 */
	set(input: string, ast: MathNode): void {
		// Check if key already exists (update case)
		const existingEntry = this.cache.get(input);
		if (existingEntry) {
			// Remove existing to update position
			this.cache.delete(input);
		} else {
			// New entry - check capacity
			if (this.cache.size >= this.maxSize) {
				this.evictOldest();
			}
		}

		const entry: CacheEntry = {
			ast,
			accessCount: 0
		};

		this.cache.set(input, entry);
		this.stats.size = this.cache.size;
	}

	/**
	 * Check if entry exists (without updating LRU order).
	 *
	 * @param input - The input string
	 * @returns True if entry exists
	 */
	has(input: string): boolean {
		return this.cache.has(input);
	}

	/**
	 * Clear all entries and reset stats.
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
	 * Get cache statistics.
	 *
	 * @returns Current cache statistics
	 */
	getStats(): CacheStats {
		return { ...this.stats };
	}

	/**
	 * Evict oldest entry (LRU).
	 * The first entry in Map iteration order is the least recently used.
	 */
	private evictOldest(): void {
		const firstKey = this.cache.keys().next().value;
		if (firstKey !== undefined) {
			this.cache.delete(firstKey);
			this.stats.evictions++;
			this.stats.size = this.cache.size;
		}
	}
}

/**
 * Create a new ParseCache instance.
 *
 * @param maxSize - Maximum number of entries (default: 100)
 * @returns New ParseCache instance
 *
 * @example Create with defaults
 * ```typescript
 * const cache = createParseCache();
 * ```
 *
 * @example Create with custom size
 * ```typescript
 * const cache = createParseCache(500);
 * ```
 */
export function createParseCache(maxSize?: number): ParseCache {
	return new ParseCache(maxSize);
}
