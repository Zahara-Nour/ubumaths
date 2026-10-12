/**
 * PDF d'un exercice seul : les fonctions déclarées par l'exercice
 * (`generic_functions`) sont lues comme à l'écran (2026-09-24).
 * Sans elles, `C'(x)` s'imprimait « Unexpected token: ' » dans le PDF de la page
 * d'exercice (enseignant) et de la page publique `exercice/[slug]`.
 */

import { describe, it, expect } from 'vitest';
import { generateExerciseTypst } from '../exercise-typst-generator';
import type { Exercise } from '$lib/exercises/types';

function exerciseWith(genericFunctions: string[] | undefined): Exercise {
	return {
		id: 'exercice-test',
		title: 'Dérivée de C',
		category: 'application',
		tags: [],
		variations: [
			{ label: 'default', statement_md: "Calculer ~C'(x)~.", solution_md: "~C'(x)=2x~" }
		],
		generic_functions: genericFunctions,
		created_at: '',
		updated_at: '',
		created_by: 'test'
	} as unknown as Exercise;
}

describe('generateExerciseTypst — fonctions déclarées', () => {
	it('C déclarée : énoncé et solution sans erreur', async () => {
		const result = await generateExerciseTypst({
			exercise: exerciseWith(['C']),
			includeSolution: true,
			includeMetadata: false
		});
		expect(result.success).toBe(true);
		expect(result.typstContent).not.toContain('Unexpected token');
		expect(result.typstContent).toContain('C');
	});

	it('témoin : sans déclaration, C′(x) reste une erreur', async () => {
		const result = await generateExerciseTypst({
			exercise: exerciseWith(undefined),
			includeSolution: true,
			includeMetadata: false
		});
		expect(result.typstContent).toContain('Unexpected token');
	});
});

// Sens de deux majuscules collées (lot 6 des longueurs, Q-J) : le thème de l'exercice décide
describe('generateExerciseTypst — sens de AB selon le thème', () => {
	const exerciseOn = (topic: string | undefined): Exercise =>
		({
			...exerciseWith(undefined),
			topic,
			variations: [{ label: 'default', statement_md: "Calculer ~A'B'~.", solution_md: "~A'B'=5~" }]
		}) as unknown as Exercise;

	it.each([['Géométrie'], [undefined]])('thème %s : longueur, A′B′ sans erreur', async (topic) => {
		const result = await generateExerciseTypst({
			exercise: exerciseOn(topic),
			includeSolution: true,
			includeMetadata: false
		});
		expect(result.typstContent).not.toContain('Unexpected token');
	});

	it('thème Graphes et matrices : produit, l’écriture d’avant (A′B′ en erreur)', async () => {
		const result = await generateExerciseTypst({
			exercise: exerciseOn('Graphes et matrices'),
			includeSolution: true,
			includeMetadata: false
		});
		expect(result.typstContent).toContain('Unexpected token');
	});
});
