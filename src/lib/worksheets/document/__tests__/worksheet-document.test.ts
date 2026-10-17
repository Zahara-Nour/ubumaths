/**
 * Le document d'une fiche : deux adaptateurs, un rendu d'exercice (ADR 0028)
 * =========================================================================
 *
 * Une même fiche, lue depuis la copie du prof ou depuis la vue de l'élève
 * (corrections toutes visibles), donne le même document, donc le même Typst
 * d'exercice. Les corrections non visibles n'entrent jamais dans le document.
 */
import { describe, it, expect } from 'vitest';
import { documentFromTeacherCopy } from '../teacher-adapter';
import { documentFromStudentView } from '../student-adapter';
import { EXERCISE_LAYOUTS, renderExercises, renderPrintedCorrection } from '../render-exercise';
import type {
	InstanceData,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow
} from '$lib/types/worksheets';

// Anciennes clés (numérotation, corrigé concis) : en base mais plus lues (ADR 0030)
const CONFIG = {
	language: 'en',
	show_points: true,
	numbering_style: 'roman',
	correction_detail: 'concise'
} as WorksheetConfig;

const SECTIONS = [
	{ id: 's2', title: 'Later', instructions: 'Think.', position: 2 },
	{ id: 's1', title: 'First', instructions: null, position: 1 }
];

const EXERCISES = [
	{
		title: 'Differentiate $f(x)=x^2$',
		statement: 'Differentiate ~f(x)=x^2~.',
		solution: "~f'(x)=2x~ \\detail{HIDDEN}",
		answers: "~f'(x)=2x~",
		points: 2,
		section_id: 's2',
		position: 2,
		instructions: 'Show working.',
		generic_functions: ['C'],
		capital_pairs: 'length' as const
	},
	{
		title: null,
		statement: 'Compute $3.5 \\times 2$.',
		solution: '',
		answers: '',
		points: null,
		section_id: 's1',
		position: 1,
		instructions: null,
		generic_functions: null,
		capital_pairs: undefined
	},
	{
		title: 'Last',
		statement: 'Expand ~(x+1)^2~.',
		solution: '~x^2+2x+1~',
		answers: '',
		points: 1,
		section_id: null,
		position: 3,
		instructions: null,
		generic_functions: null,
		capital_pairs: 'product' as const
	}
];

function teacherDocument() {
	const worksheet = {
		id: 'w',
		title: 'Worksheet',
		description: null,
		type: 'worksheet',
		config: CONFIG,
		translations: null
	} as unknown as WorksheetRow;
	const instance: InstanceData = {
		exercises: EXERCISES.map((e, i) => ({
			exercise_id: `ex-${i}`,
			position: e.position,
			section_id: e.section_id,
			parameters: {},
			statement: e.statement,
			solution: e.solution,
			answers: e.answers,
			title: e.title,
			points: e.points,
			custom_instructions: e.instructions,
			generic_functions: e.generic_functions,
			capital_pairs: e.capital_pairs
		})),
		sections: SECTIONS
	};
	return documentFromTeacherCopy({ worksheet, instance, config: CONFIG });
}

function view(visible: (index: number) => boolean = () => true): StudentWorksheetView {
	return {
		assignment_id: 'a',
		worksheet_id: 'w',
		title: 'Worksheet',
		language: 'en',
		show_points: true,
		description: null,
		type: 'worksheet',
		instructions: 'For Monday.',
		available_from: null,
		closes_at: null,
		show_corrections: true,
		class_name: null,
		read_only: false,
		sections: SECTIONS,
		exercises: EXERCISES.map((e, i) => ({
			id: `we-${i}`,
			exercise_id: `ex-${i}`,
			position: e.position,
			points: e.points,
			custom_instructions: e.instructions,
			statement: e.statement,
			correction: visible(i) ? e.solution || null : null,
			correction_visible: visible(i),
			answers: visible(i) ? e.answers || null : null,
			section_id: e.section_id,
			title: e.title,
			is_essential: false,
			generic_functions: e.generic_functions,
			capital_pairs: e.capital_pairs
		}))
	};
}

describe('deux adaptateurs, un document', () => {
	it('même fiche, corrections visibles : mêmes exercices, mêmes sections, mêmes options', () => {
		const prof = teacherDocument();
		const eleve = documentFromStudentView(view());
		expect(eleve.exercises).toEqual(prof.exercises);
		expect(eleve.sections).toEqual(prof.sections);
		expect(eleve.display).toEqual(prof.display);
		expect(eleve.locale).toBe('en');
	});

	it('ordre d’affichage et numéros en chiffres arabes (ADR 0030)', () => {
		const doc = teacherDocument();
		expect(doc.exercises.map((e) => [e.number, e.sectionId])).toEqual([
			['1', 's1'],
			['2', 's2'],
			['3', null]
		]);
	});

	it('chaînes vides ramenées à « non écrit »', () => {
		const first = teacherDocument().exercises[0];
		expect(first.correction).toEqual({ solution: null, answers: null });
	});

	it('l’affectation n’existe que côté élève', () => {
		expect(teacherDocument().assignment).toBeNull();
		expect(documentFromStudentView(view()).assignment).toEqual({ instructions: 'For Monday.' });
	});

	it.each(EXERCISE_LAYOUTS)('mise en page « %s » : le même Typst d’exercice', (layout) => {
		const prof = teacherDocument();
		const eleve = documentFromStudentView(view());
		for (const form of ['worksheet', 'answers', 'correction'] as const) {
			expect(renderExercises(eleve, form, layout)).toBe(renderExercises(prof, form, layout));
		}
	});

	it('le corrigé imprimé est toujours détaillé (ADR 0030)', () => {
		const doc = documentFromStudentView(view());
		const printed = doc.exercises.map((e) => renderPrintedCorrection(e, doc, 'correction'));
		expect(printed.join('\n')).toContain('HIDDEN');
	});
});

describe('garde : correction non visible', () => {
	it('jamais dans le document, même transmise par erreur', () => {
		const leaked = view((i) => i !== 0);
		leaked.exercises[0].correction = 'LEAK';
		leaked.exercises[0].answers = 'LEAK';
		const doc = documentFromStudentView(leaked);
		const hidden = doc.exercises.find((e) => e.title?.startsWith('Differentiate'));
		expect(hidden?.correction).toBeNull();
		expect(JSON.stringify(doc)).not.toContain('LEAK');
		for (const form of ['answers', 'correction'] as const) {
			expect(renderPrintedCorrection(hidden!, doc, form)).toBeNull();
		}
	});

	it('langue inconnue : repli en français', () => {
		const odd = { ...view(), language: 'xx' } as unknown as StudentWorksheetView;
		expect(documentFromStudentView(odd).locale).toBe('fr');
	});

	it('options absentes : ni points ni cadres (le type décide, ADR 0030)', () => {
		const old = { ...view(), type: 'assessment' } as Partial<StudentWorksheetView>;
		delete old.show_points;
		const doc = documentFromStudentView(old as StudentWorksheetView);
		expect(doc.display.showPoints).toBe(false);
		expect(doc.display.answersOnSheet).toBe(false);
	});
});

// Option « mélanger les exercices » : la vue arrive dans l'ordre de la copie
describe('vue élève mélangée', () => {
	function twoInSection(shuffled: boolean | undefined): StudentWorksheetView {
		const base = view();
		const [first, second] = [
			{ ...base.exercises[1], id: 'we-a', title: 'A', position: 1, section_id: 's1' },
			{ ...base.exercises[1], id: 'we-b', title: 'B', position: 2, section_id: 's1' }
		];
		// Ordre tiré : B avant A, dans la même section
		return { ...base, shuffled, exercises: [second, first, base.exercises[2]] };
	}

	it('`shuffled` : l’ordre reçu prime sur `position`, numéros continus', () => {
		const doc = documentFromStudentView(twoInSection(true));
		expect(doc.exercises.map((e) => e.title)).toEqual(['B', 'A', 'Last']);
		expect(doc.exercises.map((e) => e.number)).toEqual(['1', '2', '3']);
	});

	it('sans `shuffled` : retri par `position`, comme avant', () => {
		const doc = documentFromStudentView(twoInSection(undefined));
		expect(doc.exercises.map((e) => e.title)).toEqual(['A', 'B', 'Last']);
	});
});
