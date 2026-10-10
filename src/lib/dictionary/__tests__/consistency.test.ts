import { describe, expect, it } from 'vitest';
import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
import { checkDictionary, newProblems, type CheckedEntry } from '../consistency';
import type { MathTerm } from '../model';

/** Le dictionnaire de référence, toutes entrées visibles. */
const REFERENCE: CheckedEntry[] = MATH_DICTIONARY.map((term) => ({ term, hidden: false }));

/** Un mot principal simple, de 6e. */
function word(term: string, extra: Partial<MathTerm> = {}): MathTerm {
	return {
		term,
		tags: ['nombres'],
		grade: '6',
		definitions: { items: [{ grade: '6', content: `Définition de ${term}.` }] },
		...extra
	};
}

function visible(...terms: MathTerm[]): CheckedEntry[] {
	return terms.map((term) => ({ term, hidden: false }));
}

describe('checkDictionary', () => {
	it('should accept the 671 entries of the reference dictionary', () => {
		expect(REFERENCE).toHaveLength(671);
		expect(checkDictionary(REFERENCE)).toEqual([]);
	});

	it('should accept a small coherent dictionary', () => {
		expect(
			checkDictionary(
				visible(
					word('fraction'),
					word('fractionner', { derivedFrom: 'fraction', definitions: undefined })
				)
			)
		).toEqual([]);
	});

	describe('refus 10 : niveaux des définitions', () => {
		it('should refuse a first definition that is not at the word grade', () => {
			const problems = checkDictionary(
				visible(word('fraction', { definitions: { items: [{ grade: '5', content: 'x' }] } }))
			);
			expect(problems.join('\n')).toContain('la première définition doit être au niveau du mot');
		});

		it('should refuse definitions whose grades do not go up', () => {
			const problems = checkDictionary(
				visible(
					word('fraction', {
						definitions: {
							items: [
								{ grade: '6', content: 'a' },
								{ grade: '6', content: 'b' }
							]
						}
					})
				)
			);
			expect(problems.join('\n')).toContain('doivent monter');
		});

		it('should refuse a principal word without definition', () => {
			expect(checkDictionary(visible(word('fraction', { definitions: undefined })))).toEqual([
				"« fraction » n'a aucune définition."
			]);
		});
	});

	describe('refus 11 : renvoi', () => {
		it('should refuse a cross-reference to a missing word', () => {
			const problems = checkDictionary(
				visible(word('fractionner', { derivedFrom: 'fraction', definitions: undefined }))
			);
			expect(problems).toEqual(["Le renvoi « fractionner » vise « fraction », qui n'existe pas."]);
		});

		it('should refuse a cross-reference to a word hidden at a level that sees it', () => {
			const problems = checkDictionary(
				visible(
					word('dérivée', {
						grade: '1_SPE',
						definitions: { items: [{ grade: '1_SPE', content: 'd' }] }
					}),
					word('dériver', { grade: '6', derivedFrom: 'dérivée', definitions: undefined })
				)
			);
			expect(problems.join('\n')).toContain('Le renvoi « dériver » vise « dérivée », caché en');
		});
	});

	it('refus 12 : should refuse two entries of the same name, one without sense label', () => {
		const problems = checkDictionary(visible(word('base', { sense: 'géométrie' }), word('base')));
		expect(problems).toEqual([
			'« base » a plusieurs sens : chaque entrée doit porter une étiquette de sens.'
		]);
	});

	it('refus 12 : should compare names without accents nor case', () => {
		const problems = checkDictionary(visible(word('Base', { sense: 'géométrie' }), word('bàse')));
		expect(problems).toEqual([
			'« bàse » a plusieurs sens : chaque entrée doit porter une étiquette de sens.'
		]);
	});

	it('refus 13 : should refuse sharing with a branch that is not parallel', () => {
		const problems = checkDictionary(
			visible(
				word('seuil', {
					grade: '1_SPE',
					sharedWith: ['T_SPE'],
					definitions: { items: [{ grade: '1_SPE', content: 's', sharedWith: ['T_SPE'] }] }
				})
			)
		);
		expect(problems.join('\n')).toContain('seulement une filière parallèle de la même année');
	});

	describe('refus 14 : formes conjuguées', () => {
		it('should refuse a form already taken by another word', () => {
			const problems = checkDictionary(
				visible(word('calculer', { forms: ['calcule'] }), word('calculs', { forms: ['calcule'] }))
			);
			expect(problems).toEqual(['La forme « calcule » est déjà prise par « calculer ».']);
		});

		it('should refuse a form equal to the name of a word (accents ignored)', () => {
			const problems = checkDictionary(
				visible(word('résoudre', { forms: ['Equation'] }), word('équation'))
			);
			expect(problems).toEqual(["La forme « Equation » (résoudre) est déjà le nom d'un mot."]);
		});
	});

	it('refus 15 : should refuse the same name and sense, accents and case ignored', () => {
		const problems = checkDictionary(visible(word('unité'), word('Unite')));
		expect(problems).toContain('« Unite » existe déjà : même nom et même sens.');
	});

	it('refus 15 : should refuse the name of a hidden entry', () => {
		const problems = checkDictionary([
			{ term: word('unité'), hidden: true },
			{ term: word('unité'), hidden: false }
		]);
		expect(problems).toContain('« unité » existe déjà (entrée masquée) : même nom et même sens.');
	});

	it('refus 16 : should refuse hiding a word targeted by a visible cross-reference', () => {
		const problems = checkDictionary([
			{ term: word('fraction'), hidden: true },
			{
				term: word('fractionner', { derivedFrom: 'fraction', definitions: undefined }),
				hidden: false
			}
		]);
		expect(problems).toEqual([
			"Le renvoi « fractionner » vise « fraction », qui est masqué : masquer ou modifier d'abord le renvoi."
		]);
	});

	// « fonction exponentielle » a deux entrées principales : masquer la première ferait
	// glisser ses renvois vers la seconde, sans que personne l'ait décidé
	it('refus 16 : should refuse hiding the first homonym, even if the cross-reference would slide to a readable second one', () => {
		const problems = checkDictionary([
			{ term: word('fonction exponentielle', { sense: 'suites' }), hidden: true },
			{ term: word('fonction exponentielle', { sense: 'fonctions' }), hidden: false },
			{
				term: word('exponentielle', {
					derivedFrom: 'fonction exponentielle',
					definitions: undefined
				}),
				hidden: false
			}
		]);
		expect(problems).toEqual([
			"Le renvoi « exponentielle » vise « fonction exponentielle », qui est masqué : masquer ou modifier d'abord le renvoi."
		]);
	});

	it('should ignore the problems of a hidden entry', () => {
		expect(
			checkDictionary([{ term: word('fraction', { definitions: undefined }), hidden: true }])
		).toEqual([]);
	});
});

describe('newProblems', () => {
	it('should only report the problems a change adds', () => {
		const before = visible(word('base'), word('base', { sense: 'géométrie' }), word('angle'));
		const after = visible(
			word('base'),
			word('base', { sense: 'géométrie' }),
			word('angle', { definitions: undefined })
		);
		expect(newProblems(before, after)).toEqual(["« angle » n'a aucune définition."]);
	});

	it('should refuse breaking the reference dictionary', () => {
		const after = REFERENCE.map((entry) =>
			entry.term.term === 'fraction' && !entry.term.derivedFrom
				? { ...entry, term: { ...entry.term, grade: '2' as const } }
				: entry
		);
		expect(newProblems(REFERENCE, after).length).toBeGreaterThan(0);
	});
});
