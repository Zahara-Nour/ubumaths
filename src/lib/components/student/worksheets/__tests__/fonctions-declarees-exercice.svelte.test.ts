/**
 * Fonctions déclarées par un EXERCICE (`exercises.generic_functions`) à l'écran
 * ============================================================================
 *
 * Fiche de l'élève : l'énoncé et la correction sont relus au rendu. Sans la
 * liste de l'exercice (`['P']`), `~P'(2)~` ne se lit pas (erreur en rouge) et
 * `P(x)` devient un produit. L'API élève fournit déjà la liste
 * (`StudentExerciseView.generic_functions`) : elle doit atteindre le rendu.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseModal from '../ExerciseModal.svelte';
import ExerciseDisplay from '../ExerciseDisplay.svelte';
import type { StudentExerciseView } from '$lib/types/worksheets';

const STATEMENT = "Calcule ~P'(2)~ pour ~P(x)=x^2~.";

function exerciseView(generic_functions?: string[]): StudentExerciseView {
	return {
		id: 'we-1',
		exercise_id: 'ex-1',
		position: 1,
		points: null,
		custom_instructions: null,
		statement: STATEMENT,
		correction: "On trouve ~P'(2)=4~.",
		correction_visible: true,
		section_id: null,
		title: 'Dérivée',
		...(generic_functions && { generic_functions })
	};
}

/** Formules rendues en erreur : `\textcolor{red}{…}` (cf. expressionToRawLatex) */
function redErrors(root: ParentNode): number {
	return [...root.querySelectorAll('math-span, math-div')].filter((el) =>
		(el.textContent ?? '').includes('\\textcolor{red}')
	).length;
}

function modalProps(exercise: StudentExerciseView) {
	return {
		exercises: [exercise],
		currentIndex: 0,
		open: true,
		masteryStatus: 'not_worked' as const,
		assignmentId: 'a-1',
		reportsMap: new Map(),
		readOnly: true,
		onOpenChange: () => {},
		onNavigate: () => {},
		onMasteryChange: () => {},
		onReportCreated: () => {}
	};
}

describe('Fonctions déclarées d’un exercice — fiche élève', () => {
	it('ExerciseModal : énoncé et correction lus avec la liste de l’exercice', async () => {
		const without = await render(ExerciseModal, modalProps(exerciseView()));
		await expect.poll(() => redErrors(document.body)).toBeGreaterThan(0);
		await without.unmount();

		await render(ExerciseModal, modalProps(exerciseView(['P'])));
		await expect.poll(() => document.body.querySelectorAll('math-span').length).toBeGreaterThan(0);
		expect(redErrors(document.body)).toBe(0);
	});

	it('ExerciseDisplay (fiche) : même lecture', async () => {
		const without = await render(ExerciseDisplay, { exercise: exerciseView(), index: 1 });
		expect(redErrors(without.container)).toBeGreaterThan(0);
		await without.unmount();

		const withList = await render(ExerciseDisplay, { exercise: exerciseView(['P']), index: 1 });
		expect(withList.container.querySelectorAll('math-span').length).toBeGreaterThan(0);
		expect(redErrors(withList.container)).toBe(0);
	});
});
