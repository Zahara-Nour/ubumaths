import { describe, it, expect } from 'vitest';
import MATH_DICTIONARY, {
	getAllTerms,
	getTermsByTag,
	getTermsByTagAndGrade,
	getTermsForGrade,
	resolveGradedField,
	type MathTerm
} from '../math-dictionary-fr';
import { readFileSync } from 'node:fs';
import { GRADE_CODES } from '$lib/types/grades';
import { hasAccessToGrade } from '$lib/utils/grades';

/**
 * Niveaux validés par David (lot 0b, 2026-10-09) : copie figée de docs/wip/lexique/lot0b-niveaux.md,
 * mise à jour par le lot 0c pour les entrées qu'il a reprises (voir le champ `source` du JSON).
 */
interface ValidatedLevels {
	principaux: { term: string; sense: string | null; grade: string; niveauxDefinitions: string[] }[];
	derives: { term: string; grade: string }[];
}
const LOT_0B: ValidatedLevels = JSON.parse(
	readFileSync('tests/fixtures/lexique/niveaux-lot0b.json', 'utf-8')
);

/** Définitions validées par David (lot 0c, 2026-10-09) : copie figée de docs/wip/lexique/lot0c-definitions.md. */
interface ValidatedDefinitions {
	entrees: {
		term: string;
		sense: string | null;
		grade: string;
		derivedFrom?: string | null;
		keepDefs: boolean;
		definitions?: { grade: string; content: string }[];
		synonymesRetires: string[];
	}[];
}
const LOT_0C: ValidatedDefinitions = JSON.parse(
	readFileSync('tests/fixtures/lexique/definitions-lot0c.json', 'utf-8')
);

/** Minuscules, accents retirés : « Unité » et « unite » sont le même mot. */
function normalizeName(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

describe('math-dictionary-fr', () => {
	// -----------------------------------------------------------------------
	// Data integrity
	// -----------------------------------------------------------------------

	it('should have at least 200 terms', () => {
		expect(MATH_DICTIONARY.length).toBeGreaterThanOrEqual(200);
	});

	it('should have no duplicate terms (term + sense)', () => {
		const keys = MATH_DICTIONARY.map((t) => `${t.term}|${t.sense ?? ''}`);
		const unique = new Set(keys);
		const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
		expect(duplicates).toEqual([]);
		expect(unique.size).toBe(keys.length);
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

	it('should have no duplicate terms, ignoring accents and case', () => {
		const keys = MATH_DICTIONARY.map(
			(t) => `${normalizeName(t.term)}|${normalizeName(t.sense ?? '')}`
		);
		const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
		expect(duplicates).toEqual([]);
	});

	// -----------------------------------------------------------------------
	// Niveaux des définitions
	// -----------------------------------------------------------------------
	// Le refactor GradedField du 2026-04-19 avait rangé chaque définition au
	// niveau de l'entrée précédente : « moyenne » (6e) n'avait de définition
	// qu'en Terminale, et la fiche du glossaire restait vide en 6e.

	it('should show a definition to every reader who has access to the term', () => {
		const hidden: string[] = [];
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom || !term.definitions) continue;
			for (const reader of GRADE_CODES) {
				if (!hasAccessToGrade(reader, term.grade)) continue;
				if (resolveGradedField(term.definitions, reader).length === 0) {
					hidden.push(`${term.term} (${term.grade}) caché en ${reader}`);
				}
			}
		}
		expect(hidden).toEqual([]);
	});

	it('should start definitions at the term grade, then go up', () => {
		const misplaced: string[] = [];
		for (const term of MATH_DICTIONARY) {
			const items = term.definitions?.items ?? [];
			if (items.length === 0) continue;
			if (items[0].grade !== term.grade) {
				misplaced.push(`${term.term} : terme ${term.grade}, définition ${items[0].grade}`);
			}
			for (let i = 1; i < items.length; i++) {
				const previous = items[i - 1].grade;
				const current = items[i].grade;
				if (current === previous || !hasAccessToGrade(current, previous)) {
					misplaced.push(`${term.term} : ${previous} puis ${current}`);
				}
			}
		}
		expect(misplaced).toEqual([]);
	});

	it('should never place an example before its term', () => {
		const early: string[] = [];
		for (const term of MATH_DICTIONARY) {
			for (const item of term.exemples?.items ?? []) {
				if (!hasAccessToGrade(item.grade, term.grade)) {
					early.push(`${term.term} : terme ${term.grade}, exemple ${item.grade}`);
				}
			}
		}
		expect(early).toEqual([]);
	});

	// Un terme est rangé au niveau de sa première mention au BO ; un sens plus
	// simple employé plus tôt ajoute une définition au lieu de déplacer l'ancienne.
	it('should place each reviewed term at the level validated in lot 0b', () => {
		// Une copie vide ou tronquée ne doit pas passer en silence
		// 221 et 15 au lot 0b ; le lot 0c a fait d'« exponentielle » un renvoi
		expect(LOT_0B.principaux).toHaveLength(220);
		expect(LOT_0B.derives).toHaveLength(16);
		const wrong: string[] = [];
		for (const expected of LOT_0B.principaux) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && (t.sense ?? null) === expected.sense && !t.derivedFrom
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			const levels = (term.definitions?.items ?? []).map((item) => item.grade).join(', ');
			const expectedLevels = expected.niveauxDefinitions.join(', ');
			if (term.grade !== expected.grade || levels !== expectedLevels) {
				wrong.push(
					`${expected.term} : ${term.grade} [${levels}], attendu ${expected.grade} [${expectedLevels}]`
				);
			}
		}
		for (const expected of LOT_0B.derives) {
			const term = MATH_DICTIONARY.find((t) => t.term === expected.term && t.derivedFrom);
			if (term?.grade !== expected.grade) {
				const found = term?.grade ?? 'introuvable';
				wrong.push(`${expected.term} (dérivé) : ${found}, attendu ${expected.grade}`);
			}
		}
		expect(wrong).toEqual([]);
	});

	// Les définitions affichées aux élèves sont celles que David a relues une à
	// une : une modification non relue doit faire échouer ce test.
	it('should carry the definitions validated in lot 0c, word for word', () => {
		expect(LOT_0C.entrees).toHaveLength(116);
		const wrong: string[] = [];
		for (const expected of LOT_0C.entrees) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && (t.sense ?? null) === expected.sense
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			if (term.grade !== expected.grade) {
				wrong.push(`${expected.term} : niveau ${term.grade}, attendu ${expected.grade}`);
			}
			// Sans clé `derivedFrom`, une entrée qui garde ses définitions reste un terme principal
			const expectedTarget =
				'derivedFrom' in expected
					? expected.derivedFrom
					: expected.keepDefs
						? term.derivedFrom
						: null;
			if ((term.derivedFrom ?? null) !== (expectedTarget ?? null)) {
				wrong.push(
					`${expected.term} : renvoi ${term.derivedFrom ?? 'aucun'}, attendu ${expectedTarget ?? 'aucun'}`
				);
			}
			if (!expected.keepDefs) {
				const actual = (term.definitions?.items ?? []).map((i) => `${i.grade} : ${i.content}`);
				const wanted = (expected.definitions ?? []).map((i) => `${i.grade} : ${i.content}`);
				const index = wanted.findIndex((line, i) => actual[i] !== line);
				if (index !== -1 || actual.length !== wanted.length) {
					const at = index === -1 ? wanted.length : index;
					wrong.push(
						`${expected.term} : définition ${at + 1} « ${actual[at] ?? '—'} », attendu « ${wanted[at] ?? '—'} »`
					);
				}
			}
			for (const removed of expected.synonymesRetires) {
				if (term.synonyms?.includes(removed))
					wrong.push(`${expected.term} : synonyme « ${removed} »`);
			}
		}
		expect(wrong).toEqual([]);
	});

	// Sinon, dans le glossaire, « Forme dérivée de X » ouvre une fiche X sans
	// définition au niveau du lecteur.
	it('should never place a derived term before the term it points to', () => {
		const early: string[] = [];
		for (const term of MATH_DICTIONARY) {
			if (!term.derivedFrom) continue;
			const target = MATH_DICTIONARY.find((t) => t.term === term.derivedFrom && !t.derivedFrom);
			if (target && !hasAccessToGrade(term.grade, target.grade)) {
				early.push(`${term.term} (${term.grade}) → ${target.term} (${target.grade})`);
			}
		}
		expect(early).toEqual([]);
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
