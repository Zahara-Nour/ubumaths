/**
 * La copie d'une fiche, exercice par exercice (ADR 0023) : la fonction
 * partagée par l'API élève, l'aperçu d'affectation, le corrigé du prof et
 * l'aperçu de la page de la fiche.
 */
import { describe, it, expect } from 'vitest';
import {
	assignmentCopyScope,
	buildWorksheetCopy,
	hasDrawnValues,
	hasPerStudentValues,
	readGuidanceLevel,
	resolveWorksheetExerciseCopy,
	type WorksheetExerciseCopyRow,
	type WorksheetForCopy
} from '../worksheet-copy';

// ============================================================================
// FIXTURES — forme réelle : deux niveaux de guidage, une variable tirée
// ============================================================================

function row(id = 'we-1', variationIndex: number | null = null): WorksheetExerciseCopyRow {
	return {
		id,
		variation_index: variationIndex,
		exercise: {
			id: 'ex-1',
			title: 'Proportionnalité',
			shared: {
				variables: [
					{ name: 'a', expression: '{{2..99}}' },
					{ name: 't', expression: '{{eval:3*{{a}}}}' }
				]
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Guidé : calcule {{a}} fois 3.',
					solution_md: 'Guidé : {{t}}'
				},
				{
					label: 'autonomous',
					statement_md: 'Autonome : triple de {{a}} ?',
					solution_md: 'Autonome : {{t}}'
				}
			]
		}
	};
}

const ASSIGNMENT = {
	id: 'aff-1',
	worksheet_id: 'fiche-1',
	guidance_level: 'guided',
	individualized: false
};

const STUDENTS = ['eleve-1', 'eleve-2', 'eleve-3', 'eleve-4', 'eleve-5', 'eleve-6'];

// ============================================================================
// TESTS
// ============================================================================

describe('readGuidanceLevel', () => {
	it('les trois niveaux passent ; inconnu ou absent → guidé', () => {
		expect(readGuidanceLevel('autonomous')).toBe('autonomous');
		expect(readGuidanceLevel('intermediate')).toBe('intermediate');
		expect(readGuidanceLevel('expert')).toBe('guided');
		expect(readGuidanceLevel(null)).toBe('guided');
	});
});

describe('assignmentCopyScope', () => {
	it('individualized NULL → vrai (défaut de la colonne)', () => {
		expect(assignmentCopyScope({ ...ASSIGNMENT, individualized: null }).individualized).toBe(true);
	});
});

describe('resolveWorksheetExerciseCopy : la copie d’une affectation', () => {
	it('le niveau de l’affectation choisit la version, pour TOUS les élèves', () => {
		for (const level of ['guided', 'autonomous'] as const) {
			const prefix = level === 'guided' ? /^Guidé/ : /^Autonome/;
			for (const studentId of STUDENTS) {
				const scope = assignmentCopyScope({ ...ASSIGNMENT, guidance_level: level }, { studentId });
				expect(resolveWorksheetExerciseCopy(row(), scope).statement).toMatch(prefix);
			}
		}
	});

	it('la version imposée par la fiche prime sur le niveau', () => {
		const scope = assignmentCopyScope(ASSIGNMENT, { studentId: 'eleve-1' });
		expect(resolveWorksheetExerciseCopy(row('we-1', 1), scope).statement).toMatch(/^Autonome/);
	});

	it('les variables sont substituées, énoncé et corrigé cohérents', () => {
		const copy = resolveWorksheetExerciseCopy(row(), assignmentCopyScope(ASSIGNMENT));
		const a = Number(/calcule (\d+) fois/.exec(copy.statement)?.[1]);
		expect(copy.solution).toBe(`Guidé : ${3 * a}`);
		expect(copy.statement + copy.solution).not.toContain('{{');
	});

	it('non individualisée : chaque élève a la copie du prof (sans élève)', () => {
		const teacher = resolveWorksheetExerciseCopy(row(), assignmentCopyScope(ASSIGNMENT));
		for (const studentId of STUDENTS) {
			expect(
				resolveWorksheetExerciseCopy(row(), assignmentCopyScope(ASSIGNMENT, { studentId }))
			).toEqual(teacher);
		}
	});

	it('individualisée : les valeurs changent d’un élève à l’autre, pas la version', () => {
		const individual = { ...ASSIGNMENT, individualized: true };
		const copies = STUDENTS.map((studentId) =>
			resolveWorksheetExerciseCopy(row(), assignmentCopyScope(individual, { studentId }))
		);
		expect(new Set(copies.map((c) => c.statement)).size).toBeGreaterThan(1);
		expect(copies.every((c) => c.variationIndex === 0)).toBe(true);
	});

	it('même affectation, même élève : la même copie (API élève = aperçu)', () => {
		const individual = { ...ASSIGNMENT, individualized: true };
		const scope = () => assignmentCopyScope(individual, { studentId: 'eleve-3' });
		expect(resolveWorksheetExerciseCopy(row(), scope())).toEqual(
			resolveWorksheetExerciseCopy(row(), scope())
		);
	});

	it('hors affectation : une copie de la fiche, la même pour tous', () => {
		const scope = {
			assignmentId: null,
			worksheetId: 'fiche-1',
			level: 'autonomous' as const,
			individualized: false
		};
		const copy = resolveWorksheetExerciseCopy(row(), scope);
		expect(copy.statement).toMatch(/^Autonome/);
		expect(copy.statement).not.toContain('{{');
		expect(resolveWorksheetExerciseCopy(row(), { ...scope, studentId: 'eleve-1' })).toEqual(copy);
	});
});

describe('hasDrawnValues', () => {
	it('variables partagées ou d’une version : oui ; aucune : non', () => {
		expect(hasDrawnValues(row().exercise)).toBe(true);
		expect(
			hasDrawnValues({
				id: 'x',
				variations: [{ label: 'default', statement_md: 'a', solution_md: 'b' }]
			})
		).toBe(false);
		expect(
			hasDrawnValues({
				id: 'x',
				variations: [
					{
						label: 'default',
						statement_md: '{{a}}',
						solution_md: '',
						variables: [{ name: 'a', expression: '{{1..3}}' }]
					}
				]
			})
		).toBe(true);
	});
});

// ============================================================================
// LA FICHE ENTIÈRE (PDF)
// ============================================================================

function worksheetOf(rows: WorksheetExerciseCopyRow[]): WorksheetForCopy {
	return {
		id: 'fiche-1',
		config: {},
		sections: [
			{ id: 's2', title: 'B', instructions: null, position: 2 },
			{ id: 's1', title: 'A', instructions: 'Lire', position: 1 }
		],
		worksheet_exercises: rows.map((r, i) => ({
			id: r.id,
			exercise_id: r.exercise.id,
			position: rows.length - i,
			points: i + 1,
			section_id: 's1',
			custom_instructions: null,
			variation_index: r.variation_index,
			exercise: { ...r.exercise, title: `T${i}` }
		}))
	} as unknown as WorksheetForCopy;
}

describe('buildWorksheetCopy : la copie prête pour le PDF', () => {
	it('exercices dans l’ordre de la fiche, chacun par resolveWorksheetExerciseCopy', () => {
		const rows = [row('we-1'), row('we-2')];
		const scope = assignmentCopyScope({ ...ASSIGNMENT, guidance_level: 'autonomous' });
		const copy = buildWorksheetCopy(worksheetOf(rows), scope);
		// we-2 a la position 1, we-1 la position 2
		expect(copy.exercises.map((e) => e.title)).toEqual(['T1', 'T0']);
		expect(copy.exercises[0].statement).toBe(
			resolveWorksheetExerciseCopy(rows[1], scope).statement
		);
		expect(copy.exercises[0].statement).toMatch(/^Autonome/);
		expect(copy.exercises[0].points).toBe(2);
		expect(copy.sections?.map((s) => s.id)).toEqual(['s1', 's2']);
	});
});

describe('hasPerStudentValues : le corrigé de la classe vaut-il pour tous ?', () => {
	const ws = worksheetOf([row()]);
	it('individualisée + variables : non', () => {
		expect(
			hasPerStudentValues(ws, assignmentCopyScope({ ...ASSIGNMENT, individualized: true }))
		).toBe(true);
	});
	it('non individualisée, ou hors affectation : oui', () => {
		expect(hasPerStudentValues(ws, assignmentCopyScope(ASSIGNMENT))).toBe(false);
		expect(
			hasPerStudentValues(ws, {
				assignmentId: null,
				worksheetId: 'fiche-1',
				level: 'guided',
				individualized: true
			})
		).toBe(false);
	});

	it('exercice orphelin (`exercise: null`, jointure PostgREST vide) : ignoré, sans erreur', () => {
		const orphan = worksheetOf([row()]);
		const exercises = (orphan as unknown as { worksheet_exercises: Array<{ exercise: unknown }> })
			.worksheet_exercises;
		exercises[0].exercise = null;
		const individual = assignmentCopyScope({ ...ASSIGNMENT, individualized: true });
		expect(hasPerStudentValues(orphan, individual)).toBe(false);
		expect(buildWorksheetCopy(orphan, individual).exercises[0].statement).toBe('');
	});
});

// Sens de deux majuscules collées (lot 6 des longueurs, Q-J) : le thème de l'exercice
describe('buildWorksheetCopy : sens de AB selon le thème de l’exercice', () => {
	const scope = assignmentCopyScope(ASSIGNMENT);
	const withTopic = (topic: string | null | undefined) =>
		worksheetOf([{ ...row(), exercise: { ...row().exercise, topic } }]);

	it.each([
		['Géométrie', 'length'],
		[null, 'length'],
		['Graphes et matrices', 'product']
	] as const)('thème %s → %s', (topic, expected) => {
		expect(buildWorksheetCopy(withTopic(topic), scope).exercises[0].capital_pairs).toBe(expected);
	});
});
