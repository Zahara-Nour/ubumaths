/**
 * Exercise translations (English worksheets)
 * ==========================================
 *
 * French is the source of truth: it lives in the base fields, and a translation
 * only carries what it overrides. Resolution walks a single cascade, from the
 * most specific value to the least:
 *
 *   1. variation.translations[locale]  2. variation
 *   3. shared.translations[locale]     4. shared
 *
 * A missing translation therefore falls back to French field by field, never
 * leaving a hole in a generated worksheet.
 */
import { describe, it, expect } from 'vitest';
import { getExerciseContent, resolveExerciseVariationWithShared } from '../types';
import type { Exercise, ExerciseVariation, SharedExerciseDefaults } from '../types';

function variation(overrides: Partial<ExerciseVariation> = {}): ExerciseVariation {
	return {
		label: 'autonomous',
		statement_md: 'Calculer 2 + 2',
		solution_md: 'La réponse est 4',
		...overrides
	};
}

function exercise(overrides: Partial<Exercise> = {}): Exercise {
	return {
		id: 'ex-1',
		category: 'automatisme',
		tags: [],
		title: 'Somme',
		grades: ['2nde'],
		topic: null,
		source: null,
		slug: null,
		is_public: false,
		created_by: 'teacher',
		created_at: '2026-01-01',
		updated_at: '2026-01-01',
		distribution_mode: 'random',
		variables: [],
		variations: [variation()],
		...overrides
	} as Exercise;
}

describe('resolveExerciseVariationWithShared() with a locale', () => {
	it('returns French by default, unchanged from today', () => {
		const resolved = resolveExerciseVariationWithShared(undefined, variation());

		expect(resolved.statement_md).toBe('Calculer 2 + 2');
		expect(resolved.solution_md).toBe('La réponse est 4');
	});

	it('prefers the variation translation over its French fields', () => {
		const v = variation({
			translations: { en: { statement_md: 'Work out 2 + 2', solution_md: 'The answer is 4' } }
		});

		const resolved = resolveExerciseVariationWithShared(undefined, v, 'en');

		expect(resolved.statement_md).toBe('Work out 2 + 2');
		expect(resolved.solution_md).toBe('The answer is 4');
	});

	it('falls back to French field by field on a partial translation', () => {
		const v = variation({ translations: { en: { statement_md: 'Work out 2 + 2' } } });

		const resolved = resolveExerciseVariationWithShared(undefined, v, 'en');

		expect(resolved.statement_md).toBe('Work out 2 + 2');
		// Solution left untranslated: French rather than an empty block.
		expect(resolved.solution_md).toBe('La réponse est 4');
	});

	it('falls back to French entirely when nothing is translated', () => {
		const resolved = resolveExerciseVariationWithShared(undefined, variation(), 'en');

		expect(resolved.statement_md).toBe('Calculer 2 + 2');
		expect(resolved.solution_md).toBe('La réponse est 4');
	});

	it('uses the shared translation when the variation defines no content', () => {
		const shared: SharedExerciseDefaults = {
			statement_md: 'Énoncé partagé',
			solution_md: 'Solution partagée',
			translations: { en: { statement_md: 'Shared statement', solution_md: 'Shared solution' } }
		};
		const v = variation({ statement_md: '', solution_md: '' });

		const resolved = resolveExerciseVariationWithShared(shared, v, 'en');

		expect(resolved.statement_md).toBe('Shared statement');
		expect(resolved.solution_md).toBe('Shared solution');
	});

	it('keeps the variation content over a shared translation', () => {
		// The shared English text translates the shared statement, which this
		// variation overrides — so it must not leak in.
		const shared: SharedExerciseDefaults = {
			statement_md: 'Énoncé partagé',
			translations: { en: { statement_md: 'Shared statement' } }
		};

		const resolved = resolveExerciseVariationWithShared(shared, variation(), 'en');

		expect(resolved.statement_md).toBe('Calculer 2 + 2');
	});

	describe('hints', () => {
		const frHints = [
			{ id: 'h1', type: 'ubumark' as const, title: 'Indice', content: 'Pense à…' },
			{ id: 'h2', type: 'link' as const, title: 'Rappel', url: 'https://example.org' }
		];

		function resolvedHints(translations?: ExerciseVariation['translations']) {
			return resolveExerciseVariationWithShared(
				undefined,
				variation({ hints: frHints, translations }),
				'en'
			).hints;
		}

		it('translates the text of a hint, keyed by its id', () => {
			const hints = resolvedHints({
				en: { hints: { h1: { title: 'Hint', content: 'Think about…' } } }
			});

			expect(hints?.[0]).toEqual({
				id: 'h1',
				type: 'ubumark',
				title: 'Hint',
				content: 'Think about…'
			});
		});

		it('never touches id, type or url', () => {
			// These are structural: a translation that could change them would break
			// the {{hint:id}} references in the statement.
			const hints = resolvedHints({ en: { hints: { h2: { title: 'Reminder' } } } });

			expect(hints?.[1]).toEqual({
				id: 'h2',
				type: 'link',
				title: 'Reminder',
				url: 'https://example.org'
			});
		});

		it('leaves untranslated hints in French', () => {
			const hints = resolvedHints({ en: { hints: { h1: { title: 'Hint' } } } });

			// h2 has no entry: it stays French rather than disappearing.
			expect(hints?.[1]).toEqual(frHints[1]);
		});

		it('falls back field by field within a translated hint', () => {
			const hints = resolvedHints({ en: { hints: { h1: { title: 'Hint' } } } });

			expect(hints?.[0].title).toBe('Hint');
			expect(hints?.[0].content).toBe('Pense à…');
		});

		it('keeps the French hints when nothing is translated', () => {
			expect(resolvedHints()).toEqual(frHints);
			expect(resolvedHints({ en: { hints: {} } })).toEqual(frHints);
		});

		it('ignores an entry pointing at a hint that no longer exists', () => {
			// A hint deleted in French must not resurrect through its translation.
			const hints = resolvedHints({ en: { hints: { gone: { title: 'Ghost' } } } });

			expect(hints).toEqual(frHints);
		});
	});

	it('still merges shared variables, whatever the locale', () => {
		const shared: SharedExerciseDefaults = {
			variables: [{ name: 'a', expression: '{{1..10}}' }]
		};

		const resolved = resolveExerciseVariationWithShared(shared, variation(), 'en');

		expect(resolved.variables).toEqual([{ name: 'a', expression: '{{1..10}}' }]);
	});
});

describe('getExerciseContent() with a locale', () => {
	it('returns the English content of the requested variation', () => {
		const ex = exercise({
			variations: [
				variation(),
				variation({
					statement_md: 'Calculer 3 + 3',
					translations: { en: { statement_md: 'Work out 3 + 3' } }
				})
			]
		});

		expect(getExerciseContent(ex, 1, 'en').statement_md).toBe('Work out 3 + 3');
	});

	it('defaults to French when no locale is asked for', () => {
		expect(getExerciseContent(exercise()).statement_md).toBe('Calculer 2 + 2');
	});
});
