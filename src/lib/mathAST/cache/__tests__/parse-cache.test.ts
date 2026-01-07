/**
 * Parse Cache Tests
 *
 * Tests for LRU cache for parsed MathAST expressions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParseCache, createParseCache } from '../parse-cache';
import { MathAST } from '../../factory';

describe('ParseCache', () => {
	let cache: ParseCache;

	beforeEach(() => {
		cache = new ParseCache(3); // Small cache for testing LRU
	});

	// =========================================================================
	// Basic Operations
	// =========================================================================

	describe('basic operations', () => {
		it('should store and retrieve AST', () => {
			const input = 'x + 1';
			const ast = MathAST.add(MathAST.variable('x'), MathAST.number('1'));

			cache.set(input, ast);
			const retrieved = cache.get(input);

			expect(retrieved).toEqual(ast);
		});

		it('should return null for missing entries', () => {
			const result = cache.get('nonexistent');

			expect(result).toBeNull();
		});

		it('should check existence with has()', () => {
			const input = 'x + 1';
			const ast = MathAST.add(MathAST.variable('x'), MathAST.number('1'));

			expect(cache.has(input)).toBe(false);
			cache.set(input, ast);
			expect(cache.has(input)).toBe(true);
		});

		it('should update existing entry', () => {
			const input = 'x + 1';
			const ast1 = MathAST.add(MathAST.variable('x'), MathAST.number('1'));
			const ast2 = MathAST.add(MathAST.variable('y'), MathAST.number('2'));

			cache.set(input, ast1);
			cache.set(input, ast2);

			expect(cache.get(input)).toEqual(ast2);
			expect(cache.getStats().size).toBe(1);
		});

		it('should clear all entries', () => {
			cache.set('a', MathAST.variable('a'));
			cache.set('b', MathAST.variable('b'));

			cache.clear();

			expect(cache.get('a')).toBeNull();
			expect(cache.get('b')).toBeNull();
			expect(cache.getStats().size).toBe(0);
		});
	});

	// =========================================================================
	// LRU Eviction
	// =========================================================================

	describe('LRU eviction', () => {
		it('should evict oldest entry when full', () => {
			cache.set('a', MathAST.variable('a'));
			cache.set('b', MathAST.variable('b'));
			cache.set('c', MathAST.variable('c'));
			// Cache is now full (maxSize=3)

			cache.set('d', MathAST.variable('d'));
			// Should evict 'a' (oldest)

			expect(cache.get('a')).toBeNull();
			expect(cache.get('b')).not.toBeNull();
			expect(cache.get('c')).not.toBeNull();
			expect(cache.get('d')).not.toBeNull();
		});

		it('should update LRU order on get()', () => {
			cache.set('a', MathAST.variable('a'));
			cache.set('b', MathAST.variable('b'));
			cache.set('c', MathAST.variable('c'));

			// Access 'a' to make it most recent
			cache.get('a');

			// Add new entry, should evict 'b' (now oldest)
			cache.set('d', MathAST.variable('d'));

			expect(cache.get('a')).not.toBeNull();
			expect(cache.get('b')).toBeNull(); // Evicted
			expect(cache.get('c')).not.toBeNull();
			expect(cache.get('d')).not.toBeNull();
		});

		it('should track evictions in stats', () => {
			cache.set('a', MathAST.variable('a'));
			cache.set('b', MathAST.variable('b'));
			cache.set('c', MathAST.variable('c'));
			cache.set('d', MathAST.variable('d')); // Evicts 'a'
			cache.set('e', MathAST.variable('e')); // Evicts 'b'

			expect(cache.getStats().evictions).toBe(2);
		});
	});

	// =========================================================================
	// Statistics
	// =========================================================================

	describe('statistics', () => {
		it('should track size', () => {
			expect(cache.getStats().size).toBe(0);

			cache.set('a', MathAST.variable('a'));
			expect(cache.getStats().size).toBe(1);

			cache.set('b', MathAST.variable('b'));
			expect(cache.getStats().size).toBe(2);
		});

		it('should track hits', () => {
			cache.set('a', MathAST.variable('a'));

			cache.get('a'); // Hit
			cache.get('a'); // Hit
			cache.get('a'); // Hit

			expect(cache.getStats().hits).toBe(3);
		});

		it('should track misses', () => {
			cache.get('nonexistent1'); // Miss
			cache.get('nonexistent2'); // Miss

			expect(cache.getStats().misses).toBe(2);
		});

		it('should reset stats on clear', () => {
			cache.set('a', MathAST.variable('a'));
			cache.get('a');
			cache.get('nonexistent');

			cache.clear();

			const stats = cache.getStats();
			expect(stats.size).toBe(0);
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.evictions).toBe(0);
		});
	});

	// =========================================================================
	// Factory Function
	// =========================================================================

	describe('createParseCache', () => {
		it('should create cache with default size', () => {
			const cache = createParseCache();
			expect(cache).toBeInstanceOf(ParseCache);
		});

		it('should create cache with custom size', () => {
			const cache = createParseCache(10);

			// Fill to capacity
			for (let i = 0; i < 10; i++) {
				cache.set(`input${i}`, MathAST.variable(`x${i}`));
			}

			expect(cache.getStats().size).toBe(10);
			expect(cache.getStats().evictions).toBe(0);

			// Add one more to trigger eviction
			cache.set('input10', MathAST.variable('x10'));
			expect(cache.getStats().evictions).toBe(1);
		});
	});

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('should handle empty string as key', () => {
			const ast = MathAST.number('0');
			cache.set('', ast);

			expect(cache.get('')).toEqual(ast);
		});

		it('should handle very long keys', () => {
			const longInput = 'x+'.repeat(1000) + 'x';
			const ast = MathAST.variable('x');

			cache.set(longInput, ast);

			expect(cache.get(longInput)).toEqual(ast);
		});

		it('should handle cache size of 1', () => {
			const tinyCache = new ParseCache(1);

			tinyCache.set('a', MathAST.variable('a'));
			expect(tinyCache.get('a')).not.toBeNull();

			tinyCache.set('b', MathAST.variable('b'));
			expect(tinyCache.get('a')).toBeNull(); // Evicted
			expect(tinyCache.get('b')).not.toBeNull();
		});
	});
});
