import { describe, expect, it } from 'vitest';
import {
	MATH_DICTIONARY,
	getAllTerms,
	getTermsByTag,
	getTermsByTagAndLevel,
	getTermsForLevel,
	searchTerms,
	type MathTerm
} from './math-dictionary-fr';
import { GRADE_CODES, type GradeCode } from '$lib/types/grades';

// ============================================================================
// DICTIONARY INTEGRITY
// ============================================================================

describe('MATH_DICTIONARY integrity', () => {
	it('contains at least 200 terms', () => {
		expect(MATH_DICTIONARY.length).toBeGreaterThanOrEqual(200);
	});

	it('has no duplicate terms', () => {
		const terms = MATH_DICTIONARY.map((t) => t.term);
		const uniqueTerms = new Set(terms);
		const duplicates = terms.filter((t, i) => terms.indexOf(t) !== i);
		expect(duplicates).toEqual([]);
		expect(uniqueTerms.size).toBe(terms.length);
	});

	it('every term has all required fields', () => {
		for (const term of MATH_DICTIONARY) {
			expect(term.term, `term missing for ${JSON.stringify(term)}`).toBeTruthy();
			expect(term.tags.length, `${term.term} has no tags`).toBeGreaterThan(0);
			expect(term.definition, `${term.term} has no definition`).toBeTruthy();
			expect(term.level, `${term.term} has no level`).toBeTruthy();
		}
	});

	it('every level is a valid GradeCode', () => {
		const validCodes = new Set<string>(GRADE_CODES);
		const invalidTerms: { term: string; level: string }[] = [];
		for (const t of MATH_DICTIONARY) {
			if (!validCodes.has(t.level)) {
				invalidTerms.push({ term: t.term, level: t.level });
			}
		}
		expect(invalidTerms).toEqual([]);
	});

	it('every tag is a non-empty lowercase string', () => {
		for (const term of MATH_DICTIONARY) {
			for (const tag of term.tags) {
				expect(tag, `invalid tag for ${term.term}`).toMatch(/^[a-z][a-z0-9-]*$/);
			}
		}
	});
});

// ============================================================================
// getTermsForLevel
// ============================================================================

describe('getTermsForLevel', () => {
	it('returns terms for CP (earliest level)', () => {
		const terms = getTermsForLevel('CP');
		expect(terms.length).toBeGreaterThan(0);
		// All returned terms must have level CP
		for (const t of terms) {
			expect(t.level).toBe('CP');
		}
	});

	it('returns more terms for higher levels', () => {
		const cp = getTermsForLevel('CP');
		const cm2 = getTermsForLevel('CM2');
		const quatrieme = getTermsForLevel('4');
		expect(cm2.length).toBeGreaterThan(cp.length);
		expect(quatrieme.length).toBeGreaterThan(cm2.length);
	});

	it('returns terms introduced at 4ème or before', () => {
		const terms = getTermsForLevel('4');
		// Should contain terms from CP, CE1, ..., 5, 4
		const expectedLevels: GradeCode[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4'];
		for (const t of terms) {
			expect(expectedLevels, `${t.term} has unexpected level ${t.level}`).toContain(t.level);
		}
		// Spot-check: 'addition' (CP) should be there
		expect(terms.some((t) => t.term === 'addition')).toBe(true);
		// Spot-check: 'équation' (4ème) should be there
		expect(terms.some((t) => t.term === 'équation')).toBe(true);
		// Spot-check: 'Thalès' (3ème) should NOT be there
		expect(terms.some((t) => t.term === 'Thalès')).toBe(false);
	});

	it('returns all terms for T_GEN (latest standard level)', () => {
		const all = getTermsForLevel('T_GEN');
		// Should include all terms that use standard grade codes
		expect(all.length).toBe(MATH_DICTIONARY.length);
	});
});

// ============================================================================
// getTermsByTag
// ============================================================================

describe('getTermsByTag', () => {
	it('returns geometry terms for "geometrie"', () => {
		const terms = getTermsByTag('geometrie');
		expect(terms.length).toBeGreaterThan(10);
		// All returned terms must have the tag
		for (const t of terms) {
			expect(t.tags).toContain('geometrie');
		}
	});

	it('returns fraction terms for "fraction"', () => {
		const terms = getTermsByTag('fraction');
		expect(terms.length).toBeGreaterThan(3);
		expect(terms.some((t) => t.term === 'numérateur')).toBe(true);
		expect(terms.some((t) => t.term === 'dénominateur')).toBe(true);
	});

	it('returns empty array for non-existent tag', () => {
		const terms = getTermsByTag('nonexistent-tag-xyz');
		expect(terms).toEqual([]);
	});
});

// ============================================================================
// getTermsByTagAndLevel
// ============================================================================

describe('getTermsByTagAndLevel', () => {
	it('returns geometry terms for 4ème or earlier', () => {
		const terms = getTermsByTagAndLevel('geometrie', '4');
		expect(terms.length).toBeGreaterThan(5);
		for (const t of terms) {
			expect(t.tags).toContain('geometrie');
		}
		// homothétie is 3ème — should NOT appear
		expect(terms.some((t) => t.term === 'homothétie')).toBe(false);
		// triangle is CP — should appear
		expect(terms.some((t) => t.term === 'triangle')).toBe(true);
	});

	it('returns empty array for tag that has no terms at low level', () => {
		const terms = getTermsByTagAndLevel('trigonometrie', 'CM2');
		expect(terms).toEqual([]);
	});

	it('returns subset of getTermsByTag result', () => {
		const allGeo = getTermsByTag('geometrie');
		const geo4 = getTermsByTagAndLevel('geometrie', '4');
		expect(geo4.length).toBeLessThanOrEqual(allGeo.length);
		for (const t of geo4) {
			expect(allGeo).toContainEqual(t);
		}
	});
});

// ============================================================================
// getAllTerms
// ============================================================================

describe('getAllTerms', () => {
	it('returns a flat array of strings', () => {
		const terms = getAllTerms();
		expect(Array.isArray(terms)).toBe(true);
		expect(terms.length).toBe(MATH_DICTIONARY.length);
		for (const t of terms) {
			expect(typeof t).toBe('string');
		}
	});

	it('contains specific known terms', () => {
		const terms = getAllTerms();
		expect(terms).toContain('addition');
		expect(terms).toContain('Pythagore');
		expect(terms).toContain('cosinus');
	});
});

// ============================================================================
// searchTerms
// ============================================================================

describe('searchTerms', () => {
	it('finds "Pythagore" with prefix "pythagor"', () => {
		const results = searchTerms('pythagor');
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].term).toBe('Pythagore');
	});

	it('is accent-insensitive', () => {
		const results = searchTerms('perimetre');
		expect(results.some((t) => t.term === 'périmètre')).toBe(true);
	});

	it('is case-insensitive', () => {
		const results = searchTerms('TRIANGLE');
		expect(results.some((t) => t.term === 'triangle')).toBe(true);
	});

	it('returns prefix matches before substring matches', () => {
		const results = searchTerms('angle');
		// 'angle' itself should come first (prefix match)
		const angleIndex = results.findIndex((t) => t.term === 'angle');
		// 'triangle' contains 'angle' as substring
		const triangleIndex = results.findIndex((t) => t.term === 'triangle');
		if (triangleIndex !== -1) {
			expect(angleIndex).toBeLessThan(triangleIndex);
		}
	});

	it('returns empty for empty query', () => {
		expect(searchTerms('')).toEqual([]);
	});

	it('returns empty for whitespace-only query', () => {
		expect(searchTerms('   ')).toEqual([]);
	});

	it('finds multi-word terms', () => {
		const results = searchTerms('angle droit');
		expect(results.some((t) => t.term === 'angle droit')).toBe(true);
	});

	it('finds terms by substring', () => {
		const results = searchTerms('latéral');
		expect(results.some((t) => t.term === 'équilatéral')).toBe(true);
	});

	it('respects result limit', () => {
		const results = searchTerms('e', 5);
		expect(results.length).toBeLessThanOrEqual(5);
	});

	it('handles regex special characters safely', () => {
		expect(() => searchTerms('(test')).not.toThrow();
		expect(() => searchTerms('a+b')).not.toThrow();
		expect(() => searchTerms('[_]')).not.toThrow();
	});
});
