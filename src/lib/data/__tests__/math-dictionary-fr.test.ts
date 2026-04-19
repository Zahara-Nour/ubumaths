import { describe, it, expect } from 'vitest';
import MATH_DICTIONARY, {
	getAllTerms,
	getTermsByTag,
	getTermsByTagAndLevel,
	getTermsForLevel,
	type MathTerm
} from '../math-dictionary-fr';
import { GRADE_CODES } from '$lib/types/grades';

describe('math-dictionary-fr', () => {
	// -----------------------------------------------------------------------
	// Data integrity
	// -----------------------------------------------------------------------

	it('should have at least 200 terms', () => {
		expect(MATH_DICTIONARY.length).toBeGreaterThanOrEqual(200);
	});

	it('should have no duplicate terms', () => {
		const terms = MATH_DICTIONARY.map((t) => t.term);
		const unique = new Set(terms);
		const duplicates = terms.filter((t, i) => terms.indexOf(t) !== i);
		expect(duplicates).toEqual([]);
		expect(unique.size).toBe(terms.length);
	});

	it('should have valid GradeCode for every term', () => {
		const validCodes = new Set<string>(GRADE_CODES);
		for (const term of MATH_DICTIONARY) {
			expect(validCodes.has(term.level), `"${term.term}" has invalid level "${term.level}"`).toBe(
				true
			);
		}
	});

	it('should have at least 1 tag for every term', () => {
		for (const term of MATH_DICTIONARY) {
			expect(
				term.tags.length,
				`"${term.term}" has no tags`
			).toBeGreaterThanOrEqual(1);
		}
	});

	it('should have non-empty definitions for principal terms', () => {
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom) continue; // Derived terms don't need definitions
			expect(
				term.definition?.trim().length,
				`"${term.term}" has empty definition`
			).toBeGreaterThan(0);
		}
	});

	it('should have valid derivedFrom references', () => {
		const termNames = new Set(MATH_DICTIONARY.map((t) => t.term));
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom) {
				expect(
					termNames.has(term.derivedFrom),
					`"${term.term}" derives from "${term.derivedFrom}" which does not exist`
				).toBe(true);
			}
		}
	});

	it('should have lowercase tags without accents', () => {
		const accentRegex = /[àâäéèêëïîôùûüÿçæœ]/;
		for (const term of MATH_DICTIONARY) {
			for (const tag of term.tags) {
				expect(tag, `tag "${tag}" on "${term.term}" is not lowercase`).toBe(tag.toLowerCase());
				expect(
					accentRegex.test(tag),
					`tag "${tag}" on "${term.term}" contains accents`
				).toBe(false);
			}
		}
	});

	// -----------------------------------------------------------------------
	// Theme coverage
	// -----------------------------------------------------------------------

	it('should cover all 12+ themes', () => {
		const allTags = new Set(MATH_DICTIONARY.flatMap((t) => t.tags));
		const expectedThemes = [
			'entiers',
			'decimaux',
			'calcul-litteral',
			'fractions',
			'grandeurs',
			'fonctions',
			'relatifs',
			'proportionnalite',
			'puissances',
			'suites',
			'racines-carrees',
			'probabilites'
		];
		for (const theme of expectedThemes) {
			expect(allTags.has(theme), `missing theme: ${theme}`).toBe(true);
		}
	});

	// -----------------------------------------------------------------------
	// getTermsForLevel
	// -----------------------------------------------------------------------

	describe('getTermsForLevel', () => {
		it('should return CP terms for level CP', () => {
			const terms = getTermsForLevel('CP');
			expect(terms.length).toBeGreaterThan(0);
			for (const t of terms) {
				expect(t.level).toBe('CP');
			}
		});

		it('should return CP through 6e terms for level 6', () => {
			const terms = getTermsForLevel('6');
			// Should include CP terms
			expect(terms.some((t) => t.level === 'CP')).toBe(true);
			// Should include 6e terms
			expect(terms.some((t) => t.level === '6')).toBe(true);
			// Should NOT include 5e+ terms
			expect(terms.some((t) => t.level === '5')).toBe(false);
			expect(terms.some((t) => t.level === '4')).toBe(false);
		});

		it('should include more terms at higher levels', () => {
			const cpTerms = getTermsForLevel('CP');
			const cm2Terms = getTermsForLevel('CM2');
			const sixTerms = getTermsForLevel('6');
			const troisTerms = getTermsForLevel('3');
			expect(cm2Terms.length).toBeGreaterThan(cpTerms.length);
			expect(sixTerms.length).toBeGreaterThan(cm2Terms.length);
			expect(troisTerms.length).toBeGreaterThan(sixTerms.length);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsByTag
	// -----------------------------------------------------------------------

	describe('getTermsByTag', () => {
		it('should return terms for "arithmetique"', () => {
			const terms = getTermsByTag('arithmetique');
			expect(terms.length).toBeGreaterThan(0);
			for (const t of terms) {
				expect(t.tags).toContain('arithmetique');
			}
		});

		it('should return terms for "geometrie"', () => {
			const terms = getTermsByTag('geometrie');
			expect(terms.length).toBeGreaterThan(0);
		});

		it('should return empty array for unknown tag', () => {
			const terms = getTermsByTag('nonexistent-tag-xyz');
			expect(terms).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsByTagAndLevel
	// -----------------------------------------------------------------------

	describe('getTermsByTagAndLevel', () => {
		it('should return a subset of getTermsByTag', () => {
			const allGeometrie = getTermsByTag('geometrie');
			const geometrie4 = getTermsByTagAndLevel('geometrie', '4');
			expect(geometrie4.length).toBeGreaterThan(0);
			expect(geometrie4.length).toBeLessThanOrEqual(allGeometrie.length);
			// Every term in the filtered set should be in the full set
			for (const t of geometrie4) {
				expect(allGeometrie).toContainEqual(t);
			}
		});

		it('should respect level filtering', () => {
			const terms = getTermsByTagAndLevel('fonctions', '6');
			for (const t of terms) {
				expect(t.tags).toContain('fonctions');
				// schoolYear should be <= 6 (6eme)
			}
			// "fonction" is introduced at level '3', should not appear at level '6'
			expect(terms.some((t) => t.term === 'fonction')).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// getAllTerms
	// -----------------------------------------------------------------------

	describe('getAllTerms', () => {
		it('should return all terms', () => {
			const all = getAllTerms();
			expect(all.length).toBe(MATH_DICTIONARY.length);
		});

		it('should return a copy (not the original array)', () => {
			const all = getAllTerms();
			all.push({
				term: 'test',
				tags: ['test'],
				definition: 'test',
				level: 'CP'
			} satisfies MathTerm);
			expect(getAllTerms().length).toBe(MATH_DICTIONARY.length);
		});
	});
});
