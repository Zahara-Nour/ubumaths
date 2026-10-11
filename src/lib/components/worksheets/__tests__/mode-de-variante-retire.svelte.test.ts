/**
 * « Mode de variante » retiré de l'interface (ADR 0023)
 * =====================================================
 *
 * Le réglage par exercice (aucune / individuel / N versions / groupe) n'était
 * lu par aucun chemin vivant : il disparaît de la fenêtre de l'exercice et de
 * la liste. Les colonnes restent en base.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseList from '../ExerciseList.svelte';
import ExerciseConfigModal from '../ExerciseConfigModal.svelte';
import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';

const FICHE = '808e2eee-162a-4493-81f6-8a945c81db3c';
const EXO = '02a099dd-ff75-4a75-835b-056cd3565f8f';

// Une ligne réglée sur un mode NON « aucune » : l'ancien badge s'affichait
const exercise = {
	id: 'we-1',
	worksheet_id: FICHE,
	exercise_id: EXO,
	section_id: null,
	position: 1,
	points: 2,
	variant_mode: 'n_versions',
	variant_config: { mode: 'n_versions', n_versions: 3 },
	custom_instructions: null,
	is_essential: false,
	exercise: { id: EXO, title: 'Valeurs remarquables' }
} as unknown as WorksheetExerciseWithExercise;

describe('Mode de variante : plus dans l’interface', () => {
	it('liste : pas de badge de mode de variante', async () => {
		const screen = await render(ExerciseList, {
			props: { worksheetId: FICHE, exercises: [exercise], sections: [], readonly: false }
		});
		await expect.poll(() => screen.container.textContent).toContain('Valeurs remarquables');
		expect(screen.container.textContent).not.toContain('N versions');
	});

	it('fenêtre de l’exercice : ni « Mode de variante », ni nombre de versions', async () => {
		await render(ExerciseConfigModal, {
			props: { open: true, exercise, worksheetId: FICHE, sections: [] }
		});
		await expect.poll(() => document.body.textContent).toContain('Instructions personnalisees');
		expect(document.body.textContent).not.toContain('Mode de variante');
		expect(document.body.textContent).not.toContain('Nombre de versions');
	});
});
