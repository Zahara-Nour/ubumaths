import { describe, expect, it } from 'vitest';
import {
	isFullyTranslated,
	untranslatedExercises,
	untranslatedVariationIndices
} from '../translation-status';
import type { TranslatableExercise } from '../translation-status';
import type { ExerciseVariation } from '../types';

const fr = (overrides: Partial<ExerciseVariation> = {}): ExerciseVariation => ({
	label: 'autonomous',
	statement_md: 'Calculer 2 + 2',
	solution_md: 'La réponse est 4',
	...overrides
});

const en = (overrides: Partial<ExerciseVariation> = {}): ExerciseVariation =>
	fr({ translations: { en: { statement_md: 'Work out 2 + 2' } }, ...overrides });

const exercise = (overrides: Partial<TranslatableExercise> = {}): TranslatableExercise => ({
	id: 'ex-1',
	title: 'Somme',
	variations: [fr()],
	...overrides
});

describe('untranslatedVariationIndices()', () => {
	it('lists a variation with no English statement', () => {
		expect(untranslatedVariationIndices(exercise())).toEqual([0]);
	});

	it('lists nothing when every variation is translated', () => {
		expect(untranslatedVariationIndices(exercise({ variations: [en(), en()] }))).toEqual([]);
	});

	it('checks every variation, not just the first', () => {
		// Variant mode can serve any of them: one gap makes the worksheet mix languages.
		expect(untranslatedVariationIndices(exercise({ variations: [en(), fr(), en()] }))).toEqual([1]);
	});

	it('does not count a translated solution as a translated statement', () => {
		const variation = fr({ translations: { en: { solution_md: 'The answer is 4' } } });

		expect(untranslatedVariationIndices(exercise({ variations: [variation] }))).toEqual([0]);
	});

	it('lets the shared translation cover a variation with no statement of its own', () => {
		const ex = exercise({
			shared: {
				statement_md: 'Énoncé partagé',
				translations: { en: { statement_md: 'Shared statement' } }
			},
			variations: [fr({ statement_md: '' })]
		});

		expect(untranslatedVariationIndices(ex)).toEqual([]);
	});

	it('counts a variation whose only statement is an English translation', () => {
		// The resolver serves that English statement, so the sheet does come out in
		// English — the status must not claim otherwise.
		const ex = exercise({
			variations: [fr({ statement_md: '', translations: { en: { statement_md: 'Work out' } } })]
		});

		expect(untranslatedVariationIndices(ex)).toEqual([]);
	});

	it('ignores the shared translation when the variation has its own statement', () => {
		const ex = exercise({
			shared: { translations: { en: { statement_md: 'Shared statement' } } },
			variations: [fr()]
		});

		expect(untranslatedVariationIndices(ex)).toEqual([0]);
	});

	it('does not flag a variation that has no statement at all', () => {
		// Nothing to translate: it prints nothing, not French.
		const ex = exercise({ variations: [fr({ statement_md: '' })] });

		expect(untranslatedVariationIndices(ex)).toEqual([]);
	});
});

describe('isFullyTranslated()', () => {
	it('is true for an exercise with no variation at all', () => {
		expect(isFullyTranslated(exercise({ variations: [] }))).toBe(true);
		expect(isFullyTranslated(exercise({ variations: null }))).toBe(true);
	});
});

describe('untranslatedExercises()', () => {
	it('keeps listing order and drops the translated ones', () => {
		const rows = [
			{ exercise: exercise({ id: 'a', title: 'A', variations: [en()] }) },
			{ exercise: exercise({ id: 'b', title: 'B' }) },
			{ exercise: undefined },
			{ exercise: exercise({ id: 'c', title: 'C' }) }
		];

		expect(untranslatedExercises(rows).map((e) => e.id)).toEqual(['b', 'c']);
	});
});
