/**
 * Titre d'un exercice contenant une formule, à l'écran de l'élève (écart E27)
 * ==========================================================================
 *
 * « Corvée 1 : Dériver $f(x)=x^2$ » doit rendre la formule (comme l'écran du prof et le PDF),
 * jamais le source `$…$`.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseListItem from '../ExerciseListItem.svelte';
import type { StudentExerciseView } from '#lib/types/worksheets.ts';

const exercise: StudentExerciseView = {
	id: 'we-1',
	exercise_id: 'ex-1',
	position: 1,
	points: null,
	custom_instructions: null,
	statement: 'Énoncé',
	correction: null,
	correction_visible: false,
	section_id: null,
	title: 'Dériver $f(x)=x^2$'
};

describe('titre en formule, liste de la fiche', () => {
	it('rend la formule et ne laisse pas le source', async () => {
		const screen = await render(ExerciseListItem, { exercise, index: 1, onclick: () => {} });
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Dériver');
		expect(text).not.toContain('$');
		expect(screen.container.querySelector('math-span')).not.toBeNull();
	});
});
