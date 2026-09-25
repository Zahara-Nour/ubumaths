/**
 * Bouton « Modifier l'exercice » sur chaque ligne d'une fiche (2026-09-25)
 *
 * Demande de David : accéder à l'édition de l'exercice depuis l'édition de la
 * fiche, dans le même onglet, avec retour à la fiche (`?fiche=`). Présent aussi
 * sur une fiche publiée (liste en lecture seule) : on corrige toujours un exercice.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseList from '../ExerciseList.svelte';
import { lore } from '$lib/config/lore';

const LABEL = `Modifier la ${lore.learning.exercise}`;

const FICHE = '808e2eee-162a-4493-81f6-8a945c81db3c';
const EXO = '02a099dd-ff75-4a75-835b-056cd3565f8f';

const exercises = [
	{
		id: 'we-1',
		worksheet_id: FICHE,
		exercise_id: EXO,
		section_id: null,
		position: 1,
		points: null,
		variant_mode: 'none',
		is_essential: false,
		exercise: { id: EXO, title: 'Valeurs remarquables' }
	}
];

async function rendre(readonly: boolean) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(ExerciseList as any, {
		props: { worksheetId: FICHE, exercises, sections: [], readonly }
	});
	return screen.container;
}

describe('ExerciseList — lien « Modifier la corvée »', () => {
	it.each([
		['fiche en brouillon', false],
		['fiche publiée (lecture seule)', true]
	])('%s : lien vers l’édition de l’exercice, avec retour à la fiche', async (_cas, readonly) => {
		const el = await rendre(readonly);
		await expect.poll(() => el.querySelector(`a[aria-label="${LABEL}"]`)).not.toBeNull();
		const a = el.querySelector(`a[aria-label="${LABEL}"]`) as HTMLAnchorElement;
		expect(a.getAttribute('href')).toBe(
			`/dashboard/teacher/contenu/exercices/${EXO}?fiche=${FICHE}`
		);
	});
});
