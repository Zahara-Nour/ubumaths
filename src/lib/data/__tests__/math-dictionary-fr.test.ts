import { describe, it, expect } from 'vitest';
import MATH_DICTIONARY, {
	getAllTerms,
	getTermsByTag,
	getTermsByTagAndGrade,
	getTermsForGrade,
	resolveGradedField,
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
			expect(validCodes.has(term.grade), `"${term.term}" has invalid grade "${term.grade}"`).toBe(
				true
			);
		}
	});

	it('should have at least 1 tag for every term', () => {
		for (const term of MATH_DICTIONARY) {
			expect(term.tags.length, `"${term.term}" has no tags`).toBeGreaterThanOrEqual(1);
		}
	});

	it('should have non-empty definitions for principal terms', () => {
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom) continue;
			expect(term.definitions?.items.length, `"${term.term}" has no definitions`).toBeGreaterThan(
				0
			);
			for (const item of term.definitions?.items ?? []) {
				expect(
					item.content?.trim().length,
					`"${term.term}" has empty definition content`
				).toBeGreaterThan(0);
			}
		}
	});

	it('should have valid GradeCode in definition items', () => {
		const validCodes = new Set<string>(GRADE_CODES);
		for (const term of MATH_DICTIONARY) {
			for (const item of term.definitions?.items ?? []) {
				expect(
					validCodes.has(item.grade),
					`"${term.term}" definition has invalid grade "${item.grade}"`
				).toBe(true);
			}
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

	it('should have lowercase tags', () => {
		for (const term of MATH_DICTIONARY) {
			for (const tag of term.tags) {
				expect(tag, `tag "${tag}" on "${term.term}" is not lowercase`).toBe(tag.toLowerCase());
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
			'décimaux',
			'calcul-littéral',
			'fractions',
			'grandeurs',
			'fonctions',
			'relatifs',
			'proportionnalité',
			'puissances',
			'suites',
			'racines-carrees',
			'probabilités'
		];
		for (const theme of expectedThemes) {
			expect(allTags.has(theme), `missing theme: ${theme}`).toBe(true);
		}
	});

	// -----------------------------------------------------------------------
	// resolveGradedField
	// -----------------------------------------------------------------------

	describe('resolveGradedField', () => {
		it('should return all items for cumulative mode (default)', () => {
			const field = {
				items: [
					{ grade: 'CP' as const, content: 'Base' },
					{ grade: '6' as const, content: 'Complément 6ème' },
					{ grade: '3' as const, content: 'Complément 3ème' }
				]
			};
			const result = resolveGradedField(field, '3');
			expect(result).toEqual(['Base', 'Complément 6ème', 'Complément 3ème']);
		});

		it('should filter by grade accessibility', () => {
			const field = {
				items: [
					{ grade: 'CP' as const, content: 'Base' },
					{ grade: '6' as const, content: 'Complément 6ème' },
					{ grade: 'T_SPE' as const, content: 'Complément Tale' }
				]
			};
			const result = resolveGradedField(field, '6');
			expect(result).toEqual(['Base', 'Complément 6ème']);
		});

		it('should return only last item for discriminant mode', () => {
			const field = {
				mode: 'discriminant' as const,
				items: [
					{ grade: 'CP' as const, content: 'Simple' },
					{ grade: '6' as const, content: 'Détaillé' },
					{ grade: '3' as const, content: 'Avancé' }
				]
			};
			const result = resolveGradedField(field, '3');
			expect(result).toEqual(['Avancé']);
		});

		it('should return empty for inaccessible grade', () => {
			const field = {
				items: [{ grade: 'T_SPE' as const, content: 'Terminale only' }]
			};
			const result = resolveGradedField(field, '6');
			expect(result).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsForGrade
	// -----------------------------------------------------------------------

	describe('getTermsForGrade', () => {
		it('should return CP terms for grade CP', () => {
			const terms = getTermsForGrade('CP');
			expect(terms.length).toBeGreaterThan(0);
			for (const t of terms) {
				expect(t.grade).toBe('CP');
			}
		});

		it('should return CP through 6e terms for grade 6', () => {
			const terms = getTermsForGrade('6');
			expect(terms.some((t) => t.grade === 'CP')).toBe(true);
			expect(terms.some((t) => t.grade === '6')).toBe(true);
			expect(terms.some((t) => t.grade === '5')).toBe(false);
		});

		it('should include more terms at higher grades', () => {
			const cpTerms = getTermsForGrade('CP');
			const cm2Terms = getTermsForGrade('CM2');
			const sixTerms = getTermsForGrade('6');
			const troisTerms = getTermsForGrade('3');
			expect(cm2Terms.length).toBeGreaterThan(cpTerms.length);
			expect(sixTerms.length).toBeGreaterThan(cm2Terms.length);
			expect(troisTerms.length).toBeGreaterThan(sixTerms.length);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsByTag
	// -----------------------------------------------------------------------

	describe('getTermsByTag', () => {
		it('should return terms for "arithmétique"', () => {
			const terms = getTermsByTag('arithmétique');
			expect(terms.length).toBeGreaterThan(0);
			for (const t of terms) {
				expect(t.tags).toContain('arithmétique');
			}
		});

		it('should return terms for "géométrie"', () => {
			const terms = getTermsByTag('géométrie');
			expect(terms.length).toBeGreaterThan(0);
		});

		it('should return empty array for unknown tag', () => {
			const terms = getTermsByTag('nonexistent-tag-xyz');
			expect(terms).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsByTagAndGrade
	// -----------------------------------------------------------------------

	describe('getTermsByTagAndGrade', () => {
		it('should return a subset of getTermsByTag', () => {
			const allGeometrie = getTermsByTag('géométrie');
			const geometrie4 = getTermsByTagAndGrade('géométrie', '4');
			expect(geometrie4.length).toBeGreaterThan(0);
			expect(geometrie4.length).toBeLessThanOrEqual(allGeometrie.length);
			for (const t of geometrie4) {
				expect(allGeometrie).toContainEqual(t);
			}
		});

		it('should respect grade filtering', () => {
			const terms = getTermsByTagAndGrade('fonctions', '6');
			for (const t of terms) {
				expect(t.tags).toContain('fonctions');
			}
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
				definitions: { items: [{ grade: 'CP', content: 'test' }] },
				grade: 'CP'
			} satisfies MathTerm);
			expect(getAllTerms().length).toBe(MATH_DICTIONARY.length);
		});
	});
});
