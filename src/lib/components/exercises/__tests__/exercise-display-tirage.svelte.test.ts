/**
 * ExerciseDisplay — boutons de tirage
 * ===================================
 *
 * Les variables d'un exercice vivent aujourd'hui dans `shared.variables` ou dans
 * `variations[].variables` ; la colonne `exercises.variables` est l'ancien format.
 * Les boutons « Autres valeurs » (aperçu du professeur) et « Nouveau problème »
 * (élève, mode à la demande) doivent paraître dès que l'exercice a des variables,
 * où qu'elles soient.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseDisplay from '../ExerciseDisplay.svelte';
import type { Exercise } from '$lib/exercises/types';

const VARIABLES = [{ name: 'a', expression: '{{1..9}}' }];

function exercise(overrides: Partial<Exercise> = {}): Exercise {
	return {
		id: '550e8400-e29b-41d4-a716-446655440003',
		category: 'automatisme',
		tags: [],
		created_at: '2026-10-01T08:00:00Z',
		updated_at: '2026-10-01T08:00:00Z',
		created_by: '550e8400-e29b-41d4-a716-446655440001',
		distribution_mode: 'on_demand',
		variations: [{ label: 'default', statement_md: 'Calcule {{a}} + 1.', solution_md: 'R' }],
		...overrides
	};
}

function hasButton(container: HTMLElement, label: string): boolean {
	return [...container.querySelectorAll('button')].some((b) =>
		(b.textContent ?? '').includes(label)
	);
}

describe('ExerciseDisplay — boutons de tirage', () => {
	it('variables dans `shared` : « Nouveau problème » pour l’élève', async () => {
		const { container } = await render(ExerciseDisplay, {
			exercise: exercise({ shared: { variables: VARIABLES } }),
			mode: 'instance'
		});
		expect(hasButton(container, 'Nouveau problème')).toBe(true);
	});

	it('variables dans un niveau de guidage : « Autres valeurs » pour le professeur', async () => {
		const { container } = await render(ExerciseDisplay, {
			exercise: exercise({
				variations: [
					{
						label: 'default',
						statement_md: 'Calcule {{a}} + 1.',
						solution_md: 'R',
						variables: VARIABLES
					}
				]
			}),
			mode: 'template'
		});
		expect(hasButton(container, 'Autres valeurs')).toBe(true);
	});

	it('exercice sans variable (colonne `variables` à null) : aucun bouton', async () => {
		const { container } = await render(ExerciseDisplay, {
			exercise: exercise({
				variations: [{ label: 'default', statement_md: 'Calcule 2 + 1.', solution_md: 'R' }],
				variables: null as unknown as Exercise['variables']
			}),
			mode: 'template'
		});
		expect(hasButton(container, 'Autres valeurs')).toBe(false);
		expect(hasButton(container, 'Nouveau problème')).toBe(false);
	});
});
