/**
 * Simple LRU cache for parsed markdown ASTs
 * Avoids re-parsing the same content repeatedly
 *
 * @module utils/markdown-cache
 */

import type { DocumentNode, ParseOptions } from '$lib/ubumark';

interface CacheEntry {
	ast: DocumentNode;
}

const MAX_CACHE_SIZE = 100;
const cache = new Map<string, CacheEntry>();

/**
 * Simple hash function (FNV-1a variant)
 * Fast and produces good distribution for strings
 */
function hashContent(str: string): string {
	let hash = 2166136261;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = (hash * 16777619) >>> 0; // Force unsigned 32-bit
	}
	return hash.toString(36);
}

/**
 * Generate a cache key from content and options
 * Uses full content hash to avoid collisions
 */
function generateKey(content: string, options?: ParseOptions): string {
	const contentHash = hashContent(content);
	const optionsStr = options ? JSON.stringify(options, Object.keys(options).sort()) : '';
	return `${contentHash}:${optionsStr}`;
}

/**
 * Get cached AST or null if not found
 * Moves accessed entry to end (most recently used)
 */
export function getCachedAST(content: string, options?: ParseOptions): DocumentNode | null {
	if (!content) return null; // Skip cache for empty content

	const key = generateKey(content, options);
	const entry = cache.get(key);

	if (entry) {
		// Move to end (most recently used) by re-inserting
		cache.delete(key);
		cache.set(key, entry);
		return entry.ast;
	}

	return null;
}

/**
 * Store AST in cache
 * Evicts oldest entry if at capacity
 */
export function setCachedAST(content: string, ast: DocumentNode, options?: ParseOptions): void {
	if (!content) return; // Don't cache empty content

	const key = generateKey(content, options);

	// Evict oldest if at capacity
	if (cache.size >= MAX_CACHE_SIZE) {
		const firstKey = cache.keys().next().value;
		if (firstKey) cache.delete(firstKey);
	}

	cache.set(key, { ast });
}

/**
 * Clear the cache (useful for testing or memory pressure)
 */
export function clearMarkdownCache(): void {
	cache.clear();
}

/**
 * Get current cache size (for debugging/monitoring)
 */
export function getMarkdownCacheSize(): number {
	return cache.size;
}
