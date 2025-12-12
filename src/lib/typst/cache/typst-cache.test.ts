/**
 * Tests for TypstCache - LRU Cache with TTL
 *
 * @module typst/cache/typst-cache.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TypstCache, createTypstCache } from './typst-cache';

describe('TypstCache', () => {
	let cache: TypstCache;

	beforeEach(() => {
		vi.useFakeTimers();
		cache = new TypstCache(5, 60000); // maxSize=5, ttl=60s
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// =========================================================================
	// Core functionality
	// =========================================================================

	describe('core functionality', () => {
		it('should return cached entry for same content and format', () => {
			const content = 'Hello Typst';
			const pdfData = new Uint8Array([1, 2, 3, 4]);

			cache.set(content, 'pdf', pdfData);
			const result = cache.get(content, 'pdf');

			expect(result).toEqual(pdfData);
		});

		it('should return null for non-existent key', () => {
			const result = cache.get('nonexistent', 'pdf');
			expect(result).toBeNull();
		});

		it('should differentiate between PDF and SVG formats', () => {
			const content = 'Same content';
			const pdfData = new Uint8Array([1, 2, 3]);
			const svgData = '<svg>test</svg>';

			cache.set(content, 'pdf', pdfData);
			cache.set(content, 'svg', svgData);

			expect(cache.get(content, 'pdf')).toEqual(pdfData);
			expect(cache.get(content, 'svg')).toBe(svgData);
		});

		it('should handle typst format (raw source)', () => {
			const content = 'Source content';
			const typstSource = '#set page(paper: "a4")';

			cache.set(content, 'typst', typstSource);
			expect(cache.get(content, 'typst')).toBe(typstSource);
		});
	});

	// =========================================================================
	// TTL behavior
	// =========================================================================

	describe('TTL behavior', () => {
		it('should return null for expired entries (TTL)', () => {
			const content = 'Test content';
			const data = new Uint8Array([1, 2, 3]);

			cache.set(content, 'pdf', data);

			// Advance time past TTL
			vi.advanceTimersByTime(61000); // 61 seconds > 60s TTL

			const result = cache.get(content, 'pdf');
			expect(result).toBeNull();
		});

		it('should return valid entry before TTL expires', () => {
			const content = 'Test content';
			const data = new Uint8Array([1, 2, 3]);

			cache.set(content, 'pdf', data);

			// Advance time but stay within TTL
			vi.advanceTimersByTime(30000); // 30 seconds < 60s TTL

			const result = cache.get(content, 'pdf');
			expect(result).toEqual(data);
		});

		it('should update accessCount on cache hit', () => {
			const content = 'Test content';
			const data = new Uint8Array([1, 2, 3]);

			cache.set(content, 'pdf', data);

			// Initial stats should show 0 hits
			const statsBefore = cache.getStats();
			expect(statsBefore.hits).toBe(0);

			// Access the cache
			cache.get(content, 'pdf');
			cache.get(content, 'pdf');
			cache.get(content, 'pdf');

			const statsAfter = cache.getStats();
			expect(statsAfter.hits).toBe(3);
		});
	});

	// =========================================================================
	// LRU eviction
	// =========================================================================

	describe('LRU eviction', () => {
		it('should evict LRU entry when at capacity', () => {
			// Fill cache to capacity (5 entries)
			for (let i = 0; i < 5; i++) {
				cache.set(`content-${i}`, 'pdf', new Uint8Array([i]));
			}

			// Verify all entries exist
			for (let i = 0; i < 5; i++) {
				expect(cache.has(`content-${i}`, 'pdf')).toBe(true);
			}

			// Add one more entry - should evict the oldest (content-0)
			cache.set('content-new', 'pdf', new Uint8Array([99]));

			// First entry should be evicted
			expect(cache.has('content-0', 'pdf')).toBe(false);
			// New entry should exist
			expect(cache.has('content-new', 'pdf')).toBe(true);
			// Other entries should still exist
			for (let i = 1; i < 5; i++) {
				expect(cache.has(`content-${i}`, 'pdf')).toBe(true);
			}
		});

		it('should move accessed entry to end (most recent)', () => {
			// Fill cache
			cache.set('content-0', 'pdf', new Uint8Array([0]));
			cache.set('content-1', 'pdf', new Uint8Array([1]));
			cache.set('content-2', 'pdf', new Uint8Array([2]));
			cache.set('content-3', 'pdf', new Uint8Array([3]));
			cache.set('content-4', 'pdf', new Uint8Array([4]));

			// Access content-0 (moves it to most recent)
			cache.get('content-0', 'pdf');

			// Add new entries to trigger eviction
			cache.set('content-new-1', 'pdf', new Uint8Array([10]));

			// content-1 should be evicted (was LRU after content-0 was accessed)
			expect(cache.has('content-1', 'pdf')).toBe(false);
			// content-0 should still exist (was moved to most recent)
			expect(cache.has('content-0', 'pdf')).toBe(true);
		});

		it('should track eviction count', () => {
			// Fill cache to capacity
			for (let i = 0; i < 5; i++) {
				cache.set(`content-${i}`, 'pdf', new Uint8Array([i]));
			}

			expect(cache.getStats().evictions).toBe(0);

			// Add 3 more entries (triggers 3 evictions)
			cache.set('content-new-1', 'pdf', new Uint8Array([10]));
			cache.set('content-new-2', 'pdf', new Uint8Array([11]));
			cache.set('content-new-3', 'pdf', new Uint8Array([12]));

			expect(cache.getStats().evictions).toBe(3);
		});
	});

	// =========================================================================
	// Statistics
	// =========================================================================

	describe('statistics', () => {
		it('should track hit/miss statistics', () => {
			cache.set('exists', 'pdf', new Uint8Array([1]));

			// 2 hits
			cache.get('exists', 'pdf');
			cache.get('exists', 'pdf');

			// 3 misses
			cache.get('nonexistent-1', 'pdf');
			cache.get('nonexistent-2', 'pdf');
			cache.get('nonexistent-3', 'svg');

			const stats = cache.getStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(3);
		});

		it('should track cache size', () => {
			expect(cache.getStats().size).toBe(0);

			cache.set('content-1', 'pdf', new Uint8Array([1]));
			expect(cache.getStats().size).toBe(1);

			cache.set('content-2', 'svg', '<svg></svg>');
			expect(cache.getStats().size).toBe(2);

			// Same key/format should not increase size
			cache.set('content-1', 'pdf', new Uint8Array([2]));
			expect(cache.getStats().size).toBe(2);
		});

		it('should count expired entry access as miss', () => {
			cache.set('content', 'pdf', new Uint8Array([1]));

			// Access before expiry - hit
			cache.get('content', 'pdf');
			expect(cache.getStats().hits).toBe(1);

			// Advance past TTL
			vi.advanceTimersByTime(61000);

			// Access after expiry - miss
			cache.get('content', 'pdf');
			expect(cache.getStats().misses).toBe(1);
		});
	});

	// =========================================================================
	// Hash consistency
	// =========================================================================

	describe('hash consistency', () => {
		it('should generate consistent hash keys for same content', () => {
			const content = 'Identical content for hashing';

			cache.set(content, 'pdf', new Uint8Array([1]));

			// Should retrieve using the same content
			const result = cache.get(content, 'pdf');
			expect(result).not.toBeNull();
		});

		it('should generate different hashes for different content', () => {
			const content1 = 'First content';
			const content2 = 'Second content';

			cache.set(content1, 'pdf', new Uint8Array([1]));
			cache.set(content2, 'pdf', new Uint8Array([2]));

			// Both should be retrievable separately
			expect(cache.get(content1, 'pdf')).toEqual(new Uint8Array([1]));
			expect(cache.get(content2, 'pdf')).toEqual(new Uint8Array([2]));
		});

		it('should include format in key generation', () => {
			const content = 'Same content';

			cache.set(content, 'pdf', new Uint8Array([1]));

			// Different format should not match
			expect(cache.get(content, 'svg')).toBeNull();
		});
	});

	// =========================================================================
	// Clear
	// =========================================================================

	describe('clear', () => {
		it('should clear all entries and reset stats', () => {
			// Add entries
			cache.set('content-1', 'pdf', new Uint8Array([1]));
			cache.set('content-2', 'svg', '<svg></svg>');

			// Generate some stats
			cache.get('content-1', 'pdf'); // hit
			cache.get('nonexistent', 'pdf'); // miss

			// Verify non-empty state
			const statsBefore = cache.getStats();
			expect(statsBefore.size).toBe(2);
			expect(statsBefore.hits).toBe(1);
			expect(statsBefore.misses).toBe(1);

			// Clear
			cache.clear();

			// Verify empty state
			const statsAfter = cache.getStats();
			expect(statsAfter.size).toBe(0);
			expect(statsAfter.hits).toBe(0);
			expect(statsAfter.misses).toBe(0);
			expect(statsAfter.evictions).toBe(0);

			// Entries should be gone
			expect(cache.get('content-1', 'pdf')).toBeNull();
			expect(cache.get('content-2', 'svg')).toBeNull();
		});
	});

	// =========================================================================
	// has() method
	// =========================================================================

	describe('has() method', () => {
		it('should return true for existing entry', () => {
			cache.set('content', 'pdf', new Uint8Array([1]));
			expect(cache.has('content', 'pdf')).toBe(true);
		});

		it('should return false for non-existent entry', () => {
			expect(cache.has('nonexistent', 'pdf')).toBe(false);
		});

		it('should return false for expired entry', () => {
			cache.set('content', 'pdf', new Uint8Array([1]));

			vi.advanceTimersByTime(61000);

			expect(cache.has('content', 'pdf')).toBe(false);
		});

		it('should not update LRU order', () => {
			// Fill cache
			cache.set('content-0', 'pdf', new Uint8Array([0]));
			cache.set('content-1', 'pdf', new Uint8Array([1]));
			cache.set('content-2', 'pdf', new Uint8Array([2]));
			cache.set('content-3', 'pdf', new Uint8Array([3]));
			cache.set('content-4', 'pdf', new Uint8Array([4]));

			// Check content-0 with has() (should NOT update LRU order)
			cache.has('content-0', 'pdf');

			// Add new entry - content-0 should still be evicted (oldest)
			cache.set('content-new', 'pdf', new Uint8Array([99]));

			expect(cache.has('content-0', 'pdf')).toBe(false);
		});
	});

	// =========================================================================
	// createTypstCache factory
	// =========================================================================

	describe('createTypstCache factory', () => {
		it('should create cache with default values', () => {
			const defaultCache = createTypstCache();
			expect(defaultCache).toBeInstanceOf(TypstCache);

			// Should accept entries (default maxSize is 50)
			for (let i = 0; i < 50; i++) {
				defaultCache.set(`content-${i}`, 'pdf', new Uint8Array([i]));
			}
			expect(defaultCache.getStats().size).toBe(50);
		});

		it('should create cache with custom values', () => {
			const customCache = createTypstCache(10, 30000);

			// Fill to custom capacity
			for (let i = 0; i < 10; i++) {
				customCache.set(`content-${i}`, 'pdf', new Uint8Array([i]));
			}
			expect(customCache.getStats().size).toBe(10);

			// Custom TTL should work
			customCache.set('ttl-test', 'pdf', new Uint8Array([1]));
			vi.advanceTimersByTime(31000);
			expect(customCache.get('ttl-test', 'pdf')).toBeNull();
		});
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	describe('edge cases', () => {
		it('should handle empty content', () => {
			cache.set('', 'pdf', new Uint8Array([1]));
			expect(cache.get('', 'pdf')).toEqual(new Uint8Array([1]));
		});

		it('should handle large content', () => {
			const largeContent = 'x'.repeat(100000);
			const data = new Uint8Array([1, 2, 3]);

			cache.set(largeContent, 'pdf', data);
			expect(cache.get(largeContent, 'pdf')).toEqual(data);
		});

		it('should handle unicode content', () => {
			const unicodeContent = 'Mathématiques: ∑∏∫√ 中文 العربية';
			const data = new Uint8Array([1, 2, 3]);

			cache.set(unicodeContent, 'pdf', data);
			expect(cache.get(unicodeContent, 'pdf')).toEqual(data);
		});

		it('should update existing entry with same key', () => {
			const content = 'content';
			const data1 = new Uint8Array([1]);
			const data2 = new Uint8Array([2]);

			cache.set(content, 'pdf', data1);
			cache.set(content, 'pdf', data2);

			expect(cache.get(content, 'pdf')).toEqual(data2);
			expect(cache.getStats().size).toBe(1);
		});
	});
});
