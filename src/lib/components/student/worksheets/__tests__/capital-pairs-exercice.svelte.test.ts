/**
 * Sens de deux majuscules collées (`AB`) dans un EXERCICE à l'écran (lot 6 des longueurs)
 * ======================================================================================
 *
 * Décision Q-J : le contexte seul décide, le thème de l'exercice. Côté élève, le serveur
 * résout le sens et le transmet (`StudentExerciseView.capital_pairs`) ; côté prof, la
 * fiche de l'exercice porte son thème (`Exercise.topic`). Témoin visible : `~A'B'=5~`
 * s'affiche en erreur rouge en produit, comme une égalité de longueurs en longueur.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseModal from '../ExerciseModal.svelte';
import ExerciseDisplay from '../ExerciseDisplay.svelte';
import TeacherExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
import type { StudentExerciseView } from '$lib/types/worksheets';
import type { Exercise } from '$lib/exercises/types';
import type { CapitalPairs } from '$lib/mathAST/parser/types';

const STATEMENT = "Dans le triangle ~ABC~, montrer que ~A'B'=5~.";
const SOLUTION = "On trouve ~A'B'^2=25~.";

function exerciseView(capital_pairs?: CapitalPairs): StudentExerciseView {
	return {
		id: 'we-1',
		exercise_id: 'ex-1',
		position: 1,
		points: null,
		custom_instructions: null,
		statement: STATEMENT,
		correction: SOLUTION,
		correction_visible: true,
		section_id: null,
		title: 'Thalès',
		...(capital_pairs && { capital_pairs })
	};
}

function teacherExercise(topic?: string): Exercise {
	return {
		id: 'ex-1',
		title: 'Thalès',
		category: 'application',
		tags: [],
		topic,
		variations: [{ label: 'default', statement_md: STATEMENT, solution_md: SOLUTION }],
		created_at: '',
		updated_at: '',
		created_by: 'test'
	} as unknown as Exercise;
}

/** Formules rendues en erreur : `\textcolor{red}{…}` (cf. expressionToRawLatex) */
function redErrors(root: ParentNode): number {
	return [...root.querySelectorAll('math-span, math-div')].filter((el) =>
		(el.textContent ?? '').includes('\\textcolor{red}')
	).length;
}

function formulas(root: ParentNode): string {
	return [...root.querySelectorAll('math-span')].map((m) => m.textContent ?? '').join(' | ');
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

describe('Sens de AB d’un exercice — fiche élève', () => {
	it('ExerciseDisplay : longueur transmise → A′B′ lisible, ABC écrit sans espace', async () => {
		const screen = await render(ExerciseDisplay, { exercise: exerciseView('length'), index: 1 });
		await expect
			.poll(() => screen.container.querySelectorAll('math-span').length)
			.toBeGreaterThan(0);
		expect(redErrors(screen.container)).toBe(0);
		expect(formulas(screen.container)).toContain('ABC');
	});

	it('ExerciseDisplay : sans sens transmis → écriture d’avant (produit, A′B′ en erreur)', async () => {
		const screen = await render(ExerciseDisplay, { exercise: exerciseView(), index: 1 });
		await expect.poll(() => redErrors(screen.container)).toBeGreaterThan(0);
		expect(formulas(screen.container)).toContain('A B C');
	});

	it('ExerciseModal : énoncé et correction suivent le sens transmis', async () => {
		const before = await render(ExerciseModal, modalProps(exerciseView('product')));
		await expect.poll(() => redErrors(document.body)).toBeGreaterThan(0);
		await before.unmount();

		await render(ExerciseModal, modalProps(exerciseView('length')));
		await expect.poll(() => document.body.querySelectorAll('math-span').length).toBeGreaterThan(0);
		expect(redErrors(document.body)).toBe(0);
	});
});

describe('Sens de AB d’un exercice — affichage prof (thème de l’exercice)', () => {
	it('thème Géométrie : longueur', async () => {
		const screen = await render(TeacherExerciseDisplay, {
			exercise: teacherExercise('Géométrie'),
			showSolution: true
		});
		await expect
			.poll(() => screen.container.querySelectorAll('math-span').length)
			.toBeGreaterThan(0);
		expect(redErrors(screen.container)).toBe(0);
		expect(formulas(screen.container)).toContain('ABC');
	});

	it('thème Graphes et matrices : produit, l’écriture d’avant', async () => {
		const screen = await render(TeacherExerciseDisplay, {
			exercise: teacherExercise('Graphes et matrices'),
			showSolution: true
		});
		await expect.poll(() => redErrors(screen.container)).toBeGreaterThan(0);
	});
});
