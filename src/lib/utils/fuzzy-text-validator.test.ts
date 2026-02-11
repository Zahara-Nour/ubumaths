/**
 * Tests for Fuzzy Text Validator
 *
 * Validates:
 * 1. normalizeText: accent stripping, lowercase, trim
 * 2. levenshteinDistance: edit distance computation
 * 3. fuzzyTextMatch: tolerance rules (exact for 1-2 chars, Levenshtein ≤ 1 for 3+)
 * 4. Edge cases: empty strings, identical strings, completely different strings
 */

import { describe, it, expect } from 'vitest';
import { normalizeText, levenshteinDistance, fuzzyTextMatch } from './fuzzy-text-validator';

// ============================================================================
// normalizeText
// ============================================================================

describe('normalizeText', () => {
	it('should lowercase text', () => {
		expect(normalizeText('HELLO')).toBe('hello');
		expect(normalizeText('Hello World')).toBe('hello world');
	});

	it('should strip accents (NFD decomposition)', () => {
		expect(normalizeText('entière')).toBe('entiere');
		expect(normalizeText('parallèle')).toBe('parallele');
		expect(normalizeText('décimale')).toBe('decimale');
		expect(normalizeText('médiane')).toBe('mediane');
		expect(normalizeText('côté')).toBe('cote');
		expect(normalizeText('numéro')).toBe('numero');
	});

	it('should strip accents AND lowercase together', () => {
		expect(normalizeText('Entière')).toBe('entiere');
		expect(normalizeText('DÉCIMALE')).toBe('decimale');
	});

	it('should trim whitespace', () => {
		expect(normalizeText('  hello  ')).toBe('hello');
		expect(normalizeText('\ttriangle\n')).toBe('triangle');
	});

	it('should collapse multiple internal spaces', () => {
		expect(normalizeText('nombre  entier')).toBe('nombre entier');
		expect(normalizeText('a   b   c')).toBe('a b c');
	});

	it('should handle empty string', () => {
		expect(normalizeText('')).toBe('');
	});

	it('should handle text without accents', () => {
		expect(normalizeText('triangle')).toBe('triangle');
	});
});

// ============================================================================
// levenshteinDistance
// ============================================================================

describe('levenshteinDistance', () => {
	it('should return 0 for identical strings', () => {
		expect(levenshteinDistance('abc', 'abc')).toBe(0);
	});

	it('should return length of non-empty string when other is empty', () => {
		expect(levenshteinDistance('', 'abc')).toBe(3);
		expect(levenshteinDistance('abc', '')).toBe(3);
	});

	it('should return 0 for two empty strings', () => {
		expect(levenshteinDistance('', '')).toBe(0);
	});

	it('should compute single character substitution', () => {
		expect(levenshteinDistance('cat', 'car')).toBe(1);
	});

	it('should compute single character insertion', () => {
		expect(levenshteinDistance('cat', 'cats')).toBe(1);
	});

	it('should compute single character deletion', () => {
		expect(levenshteinDistance('cats', 'cat')).toBe(1);
	});

	it('should compute distance for completely different strings', () => {
		expect(levenshteinDistance('abc', 'xyz')).toBe(3);
	});

	it('should handle "entier" vs "entiere" (distance 1)', () => {
		expect(levenshteinDistance('entier', 'entiere')).toBe(1);
	});

	it('should handle "parallele" vs "perpendiculaire" (large distance)', () => {
		expect(levenshteinDistance('parallele', 'perpendiculaire')).toBeGreaterThan(1);
	});
});

// ============================================================================
// fuzzyTextMatch
// ============================================================================

describe('fuzzyTextMatch', () => {
	// --- Exact match ---
	it('should accept exact match', () => {
		expect(fuzzyTextMatch('triangle', 'triangle')).toBe(true);
	});

	// --- Case insensitive ---
	it('should accept case differences', () => {
		expect(fuzzyTextMatch('Triangle', 'triangle')).toBe(true);
		expect(fuzzyTextMatch('RECTANGLE', 'rectangle')).toBe(true);
	});

	// --- Accent insensitive ---
	it('should accept accent differences: "entiere" vs "entière"', () => {
		expect(fuzzyTextMatch('entiere', 'entière')).toBe(true);
	});

	it('should accept accent + case: "Entière" vs "entiere"', () => {
		expect(fuzzyTextMatch('Entière', 'entiere')).toBe(true);
	});

	it('should accept "decimale" vs "décimale"', () => {
		expect(fuzzyTextMatch('decimale', 'décimale')).toBe(true);
	});

	// --- Levenshtein ≤ 1 for words with 3+ chars ---
	it('should accept Levenshtein 1 for 3+ char words: "entier" vs "entiere"', () => {
		expect(fuzzyTextMatch('entier', 'entiere')).toBe(true);
	});

	it('should accept Levenshtein 1 typo: "triangl" vs "triangle"', () => {
		expect(fuzzyTextMatch('triangl', 'triangle')).toBe(true);
	});

	it('should reject Levenshtein > 1: "parallele" vs "perpendiculaire"', () => {
		expect(fuzzyTextMatch('parallele', 'perpendiculaire')).toBe(false);
	});

	it('should reject Levenshtein 2: "triang" vs "triangle"', () => {
		// triang → triangle: insert 'l' + insert 'e' = distance 2
		expect(fuzzyTextMatch('triang', 'triangle')).toBe(false);
	});

	// --- Exact match for 1-2 char words ---
	it('should require exact match for 1-char words', () => {
		expect(fuzzyTextMatch('a', 'a')).toBe(true);
		expect(fuzzyTextMatch('a', 'b')).toBe(false);
	});

	it('should require exact match for 2-char words (after normalization)', () => {
		expect(fuzzyTextMatch('pi', 'pi')).toBe(true);
		expect(fuzzyTextMatch('pi', 'pa')).toBe(false);
	});

	it('should allow case differences even for short words', () => {
		expect(fuzzyTextMatch('Pi', 'pi')).toBe(true);
	});

	// --- Empty strings ---
	it('should accept two empty strings', () => {
		expect(fuzzyTextMatch('', '')).toBe(true);
	});

	it('should reject empty vs non-empty', () => {
		expect(fuzzyTextMatch('', 'abc')).toBe(false);
		expect(fuzzyTextMatch('abc', '')).toBe(false);
	});

	// --- Whitespace ---
	it('should trim and compare', () => {
		expect(fuzzyTextMatch('  triangle  ', 'triangle')).toBe(true);
	});

	// --- Multi-word text ---
	it('should handle multi-word text exact match', () => {
		expect(fuzzyTextMatch('nombre entier', 'nombre entier')).toBe(true);
	});

	it('should handle multi-word text with case differences', () => {
		expect(fuzzyTextMatch('Nombre Entier', 'nombre entier')).toBe(true);
	});

	it('should handle multi-word text with accent differences', () => {
		expect(fuzzyTextMatch('nombre entière', 'nombre entiere')).toBe(true);
	});

	it('should collapse multiple spaces', () => {
		expect(fuzzyTextMatch('nombre  entier', 'nombre entier')).toBe(true);
	});
});
