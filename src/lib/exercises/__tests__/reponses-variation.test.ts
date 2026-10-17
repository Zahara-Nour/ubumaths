/**
 * Les réponses d'une variation (`answers_md`)
 * ===========================================
 *
 * Les résultats seuls, sans détail, imprimés dans le PDF « Réponses ». Champ
 * facultatif d'une variation, traduisible comme l'énoncé et la correction : il
 * suit le même chemin que la correction jusqu'au générateur PDF.
 */
import { describe, it, expect } from 'vitest';
import { getExerciseContent, getExerciseContentSafe } from '../types';
import type { Exercise, ExerciseVariation } from '../types';
import { generateExerciseInstance } from '../generator/instance-generator';
import { withTranslatedField, translatedField } from '../translation-draft';
import {
	exerciseTranslationsSchema,
	exerciseVariationSchema
} from '$lib/server/validation/exercises';
import { resolveCopyExercise } from '$lib/worksheets/student-copy';
import { buildWorksheetCopy, type WorksheetForCopy } from '$lib/worksheets/worksheet-copy';

// ============================================================================
// FIXTURES — une variable tirée, une variation avec réponses traduites
// ============================================================================

function variation(overrides: Partial<ExerciseVariation> = {}): ExerciseVariation {
	return {
		label: 'guided',
		statement_md: 'Calculer le triple de {{a}}.',
		solution_md: 'On multiplie par 3 : $3 \\times {{a}} = {{t}}$.',
		answers_md: 'R = {{t}}',
		variables: [
			{ name: 'a', expression: '{{2..9}}' },
			{ name: 't', expression: '{{eval:3*{{a}}}}' }
		],
		...overrides
	};
}

function exercise(variations: ExerciseVariation[] = [variation()]): Exercise {
	return {
		id: 'ex-1',
		title: 'Triple',
		category: 'automatisme',
		tags: [],
		distribution_mode: 'on_demand',
		variations,
		created_at: '',
		updated_at: '',
		created_by: 'x'
	};
}

// ============================================================================
// VALIDATION
// ============================================================================

describe('validation Zod du champ answers_md', () => {
	const base = { label: 'guided', statement_md: 'É', solution_md: 'S' };

	it('accepte une variation avec réponses, et sans', () => {
		expect(exerciseVariationSchema.safeParse({ ...base, answers_md: '$4$' }).success).toBe(true);
		expect(exerciseVariationSchema.safeParse(base).success).toBe(true);
	});

	it('garde la clé (un schéma Zod retire les clés non déclarées)', () => {
		const parsed = exerciseVariationSchema.safeParse({ ...base, answers_md: '$4$' });
		expect(parsed.success && parsed.data.answers_md).toBe('$4$');
	});

	it('refuse des réponses trop longues', () => {
		const parsed = exerciseVariationSchema.safeParse({ ...base, answers_md: 'x'.repeat(50001) });
		expect(parsed.success).toBe(false);
	});

	it('accepte la traduction anglaise des réponses', () => {
		const parsed = exerciseTranslationsSchema.safeParse({ en: { answers_md: '$4$' } });
		expect(parsed.success && parsed.data.en?.answers_md).toBe('$4$');
	});
});

// ============================================================================
// CONTENU D'UNE VARIATION
// ============================================================================

describe('getExerciseContent : les réponses', () => {
	it('rend les réponses françaises', () => {
		expect(getExerciseContent(exercise()).answers_md).toBe('R = {{t}}');
	});

	it('rend la traduction anglaise quand elle existe', () => {
		const ex = exercise([variation({ translations: { en: { answers_md: 'EN {{t}}' } } })]);
		expect(getExerciseContent(ex, 0, 'en').answers_md).toBe('EN {{t}}');
	});

	it('anglais sans réponses traduites : repli sur le français', () => {
		const ex = exercise([variation({ translations: { en: { statement_md: 'Triple {{a}}' } } })]);
		expect(getExerciseContent(ex, 0, 'en').answers_md).toBe('R = {{t}}');
	});

	it('pas de réponses : vide, sans erreur', () => {
		const ex = exercise([variation({ answers_md: undefined })]);
		expect(getExerciseContent(ex).answers_md).toBe('');
		expect(getExerciseContentSafe(exercise([])).answers_md).toBe('');
	});
});

describe('generateExerciseInstance : les variables résolues dans les réponses', () => {
	it('remplace {{t}} par la même valeur que dans la correction', () => {
		const result = generateExerciseInstance(exercise([variation({ answers_md: 'R = {{t}}' })]), {
			seed: 42
		});
		expect(result.success).toBe(true);
		const instance = result.instance!;
		const t = instance.resolvedVariables.find((v) => v.name === 't')!.value;
		expect(instance.answers_md).toBe(`R = ${t}`);
		expect(instance.solution_md).toContain(String(t));
	});

	it('pas de réponses : chaîne vide', () => {
		const result = generateExerciseInstance(exercise([variation({ answers_md: undefined })]), {
			seed: 1
		});
		expect(result.instance?.answers_md).toBe('');
	});
});

// ============================================================================
// COPIE D'UNE FICHE
// ============================================================================

describe('la copie porte les réponses jusqu’au PDF', () => {
	it('resolveCopyExercise rend les réponses résolues', () => {
		const copy = resolveCopyExercise(exercise([variation({ answers_md: 'R = {{t}}' })]), {
			level: 'guided',
			seed: 7
		});
		expect(copy.answers).toMatch(/^R = \d+$/);
	});

	it('buildWorksheetCopy les passe à l’exercice résolu (anglais sans réponses → français)', () => {
		const worksheet = {
			id: 'fiche-1',
			title: 'F',
			exercises: [
				{
					id: 'we-1',
					exercise_id: 'ex-1',
					position: 1,
					points: null,
					section_id: null,
					variation_index: null,
					exercise: {
						id: 'ex-1',
						title: 'Triple',
						variations: [
							variation({
								answers_md: 'R = {{t}}',
								translations: { en: { statement_md: 'Triple {{a}}' } }
							})
						]
					}
				}
			]
		} as unknown as WorksheetForCopy;
		const copy = buildWorksheetCopy(worksheet, {
			assignmentId: null,
			worksheetId: 'fiche-1',
			level: 'guided',
			individualized: false,
			locale: 'en'
		});
		expect(copy.exercises[0].answers).toMatch(/^R = \d+$/);
	});
});

// ============================================================================
// ÉDITEUR : TRADUCTION
// ============================================================================

describe('withTranslatedField : les réponses se traduisent', () => {
	it('pose puis retire la traduction des réponses', () => {
		const withAnswers = withTranslatedField(undefined, 'answers_md', 'Answer: 4');
		expect(translatedField(withAnswers, 'answers_md')).toBe('Answer: 4');
		expect(withTranslatedField(withAnswers, 'answers_md', '  ')).toBeUndefined();
	});
});
