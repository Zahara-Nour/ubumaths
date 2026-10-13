/**
 * L'ordre des exercices de la copie : option « mélanger les exercices »
 * =====================================================================
 *
 * Décidé par David le 2026-10-13, dans l'esprit de l'ADR 0023 : l'ordre est
 * tiré comme les valeurs (graine de l'affectation, et de l'élève si la case
 * « exercices individualisés » est cochée), à l'intérieur de chaque section ;
 * les sections gardent leur ordre, les exercices hors section restent après
 * elles. Hors affectation : pas de mélange.
 */
import { describe, it, expect } from 'vitest';
import {
	assignmentCopyScope,
	buildWorksheetCopy,
	copyExerciseOrder,
	type CopyScope,
	type WorksheetForCopy
} from '../worksheet-copy';
import { copyOrderSeed, copySeed } from '../student-copy';
import { documentFromTeacherCopy } from '../document/teacher-adapter';
import type { WorksheetRow } from '$lib/types/worksheets';

// ============================================================================
// FIXTURES — forme réelle : positions qui redémarrent dans chaque section,
// deux niveaux de guidage, une variable tirée
// ============================================================================

interface Placement {
	id: string;
	section: string | null;
	position: number;
}

/** 6 exercices en section A, 2 en section B, 2 hors section */
const PLACEMENTS: Placement[] = [
	...['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((id, i) => ({ id, section: 'sA', position: i + 1 })),
	{ id: 'b1', section: 'sB', position: 1 },
	{ id: 'b2', section: 'sB', position: 2 },
	{ id: 'h1', section: null, position: 1 },
	{ id: 'h2', section: null, position: 2 }
];

const SECTIONS = [
	{ id: 'sB', title: 'B', instructions: null, position: 2 },
	{ id: 'sA', title: 'A', instructions: null, position: 1 }
];

function exerciseContent(id: string) {
	return {
		id: `ex-${id}`,
		title: `Titre ${id}`,
		shared: { variables: [{ name: 'a', expression: '{{2..999}}' }] },
		variations: [
			{ label: 'guided', statement_md: `${id} guidé : {{a}}`, solution_md: `${id} : {{a}}` },
			{ label: 'autonomous', statement_md: `${id} autonome : {{a}}`, solution_md: `${id} : {{a}}` }
		]
	};
}

function worksheet(
	config: Record<string, unknown>,
	placements: Placement[] = PLACEMENTS,
	sections = SECTIONS
): WorksheetForCopy {
	return {
		id: 'fiche-1',
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		config,
		sections,
		// Ordre de la base volontairement mélangé : le calcul ne s'y fie pas
		worksheet_exercises: [...placements].reverse().map((p) => ({
			id: `we-${p.id}`,
			exercise_id: `ex-${p.id}`,
			position: p.position,
			points: null,
			section_id: p.section,
			custom_instructions: null,
			variation_index: null,
			exercise: exerciseContent(p.id)
		}))
	} as unknown as WorksheetForCopy;
}

const SHUFFLE = { shuffle_exercises: true };

const ASSIGNMENT = {
	id: 'aff-1',
	worksheet_id: 'fiche-1',
	guidance_level: 'guided',
	individualized: false
};
const INDIVIDUAL = { ...ASSIGNMENT, individualized: true };

const STUDENTS = ['eleve-1', 'eleve-2', 'eleve-3', 'eleve-4', 'eleve-5', 'eleve-6'];

/** Ordre de la copie : les `exercise_id`, tels que le PDF les affichera */
function copyOrder(ws: WorksheetForCopy, scope: CopyScope): string[] {
	const copy = buildWorksheetCopy(ws, scope);
	const ordered = copy.exercise_order
		? copy.exercise_order.map((index) => copy.exercises[index])
		: copy.exercises;
	return ordered.map((e) => e.exercise_id.replace('ex-', ''));
}

/** L'ordre des positions (sans mélange) : sections dans l'ordre, puis hors section */
const POSITION_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'h1', 'h2'];

const blockOf = (id: string) => id[0];

// ============================================================================
// TESTS
// ============================================================================

describe('mélange : nominal', () => {
	it('case décochée : toute la classe a le même ordre, mélangé', () => {
		const orders = STUDENTS.map((studentId) =>
			copyOrder(worksheet(SHUFFLE), assignmentCopyScope(ASSIGNMENT, { studentId }))
		);
		expect(new Set(orders.map((o) => o.join())).size).toBe(1);
		// … celui de la copie de la classe (corrigé du prof)
		expect(orders[0]).toEqual(copyOrder(worksheet(SHUFFLE), assignmentCopyScope(ASSIGNMENT)));
		// … et c'est bien un tirage, pas l'ordre des positions
		expect(orders[0]).not.toEqual(POSITION_ORDER);
	});

	it('case cochée : un ordre par élève, stable d’un calcul à l’autre', () => {
		const orders = STUDENTS.map((studentId) =>
			copyOrder(worksheet(SHUFFLE), assignmentCopyScope(INDIVIDUAL, { studentId }))
		);
		expect(new Set(orders.map((o) => o.join())).size).toBeGreaterThan(1);
		for (const [i, studentId] of STUDENTS.entries()) {
			expect(copyOrder(worksheet(SHUFFLE), assignmentCopyScope(INDIVIDUAL, { studentId }))).toEqual(
				orders[i]
			);
		}
	});

	it('réaffecter la fiche : un autre tirage', () => {
		const first = copyOrder(worksheet(SHUFFLE), assignmentCopyScope(ASSIGNMENT));
		const others = ['aff-2', 'aff-3', 'aff-4'].map((id) =>
			copyOrder(worksheet(SHUFFLE), assignmentCopyScope({ ...ASSIGNMENT, id }))
		);
		expect(others.some((order) => order.join() !== first.join())).toBe(true);
	});

	it('mélange DANS chaque section : sections dans leur ordre, hors section à la fin', () => {
		for (const studentId of STUDENTS) {
			const order = copyOrder(worksheet(SHUFFLE), assignmentCopyScope(INDIVIDUAL, { studentId }));
			expect(order.map(blockOf)).toEqual(POSITION_ORDER.map(blockOf));
			expect([...order].sort()).toEqual([...POSITION_ORDER].sort());
		}
	});

	it('le PDF suit l’ordre de la copie, numéroté en continu', () => {
		const ws = worksheet(SHUFFLE);
		const scope = assignmentCopyScope(INDIVIDUAL, { studentId: 'eleve-2' });
		const doc = documentFromTeacherCopy({
			worksheet: ws as unknown as WorksheetRow,
			instance: buildWorksheetCopy(ws, scope),
			config: SHUFFLE
		});
		expect(doc.exercises.map((e) => e.title?.replace('Titre ', ''))).toEqual(copyOrder(ws, scope));
		expect(doc.exercises.map((e) => e.number)).toEqual(POSITION_ORDER.map((_, i) => `${i + 1}`));
	});
});

describe('mélange : limites', () => {
	it('option absente ou décochée : ordre des positions, pas de `exercise_order`', () => {
		for (const config of [{}, { shuffle_exercises: false }]) {
			const copy = buildWorksheetCopy(
				worksheet(config),
				assignmentCopyScope(INDIVIDUAL, { studentId: 'eleve-1' })
			);
			expect(copy.exercise_order).toBeUndefined();
		}
	});

	it('option décochée : la copie est identique à celle d’avant l’option (empreinte)', () => {
		const scope = assignmentCopyScope(INDIVIDUAL, { studentId: 'eleve-1' });
		expect(buildWorksheetCopy(worksheet({ shuffle_exercises: false }), scope)).toEqual(
			buildWorksheetCopy(worksheet({}), scope)
		);
	});

	it('hors affectation (page de la fiche, cahier, aperçu sans élève) : pas de mélange', () => {
		const scope: CopyScope = {
			assignmentId: null,
			worksheetId: 'fiche-1',
			level: 'guided',
			individualized: false
		};
		expect(buildWorksheetCopy(worksheet(SHUFFLE), scope).exercise_order).toBeUndefined();
	});

	it('section à un seul exercice : il reste à sa place', () => {
		const placements: Placement[] = [
			{ id: 'a1', section: 'sA', position: 1 },
			...['b1', 'b2', 'b3', 'b4', 'b5'].map((id, i) => ({ id, section: 'sB', position: i + 1 }))
		];
		for (const studentId of STUDENTS) {
			const order = copyOrder(
				worksheet(SHUFFLE, placements),
				assignmentCopyScope(INDIVIDUAL, { studentId })
			);
			expect(order[0]).toBe('a1');
		}
	});

	it('fiche sans section : tous les exercices se mélangent entre eux', () => {
		const placements: Placement[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((id, i) => ({
			id,
			section: null,
			position: i + 1
		}));
		const orders = STUDENTS.map((studentId) =>
			copyOrder(worksheet(SHUFFLE, placements, []), assignmentCopyScope(INDIVIDUAL, { studentId }))
		);
		expect(new Set(orders.map((o) => o.join())).size).toBeGreaterThan(1);
	});

	it('copyExerciseOrder : `null` sans mélange, sinon les lignes reçues, réordonnées', () => {
		const rows = PLACEMENTS.map((p) => ({ id: p.id, position: p.position, section_id: p.section }));
		expect(copyExerciseOrder(rows, SECTIONS, assignmentCopyScope(ASSIGNMENT), {})).toBeNull();
		const ordered = copyExerciseOrder(rows, SECTIONS, assignmentCopyScope(ASSIGNMENT), SHUFFLE);
		expect(ordered?.map((r) => r.id)).toEqual(
			copyOrder(worksheet(SHUFFLE), assignmentCopyScope(ASSIGNMENT))
		);
		expect(ordered?.every((r) => rows.includes(r))).toBe(true);
	});
});

describe('mélange : gardes', () => {
	it('le mélange ne change ni les valeurs tirées ni le niveau de guidage', () => {
		for (const level of ['guided', 'autonomous']) {
			const scope = assignmentCopyScope(
				{ ...INDIVIDUAL, guidance_level: level },
				{ studentId: 'eleve-3' }
			);
			const byId = (config: Record<string, unknown>) =>
				Object.fromEntries(
					buildWorksheetCopy(worksheet(config), scope).exercises.map((e) => [
						e.exercise_id,
						[e.statement, e.solution, e.selectedVariationIndex]
					])
				);
			expect(byId(SHUFFLE)).toEqual(byId({}));
		}
	});

	it('graine de l’ordre dédiée : aucune graine de valeurs ne la reprend', () => {
		const parts = {
			assignmentId: 'aff-1',
			worksheetId: 'fiche-1',
			studentId: 'eleve-1',
			individualized: true
		};
		const valueSeeds = new Set(
			PLACEMENTS.map((p) => copySeed({ ...parts, worksheetExerciseId: `we-${p.id}` }))
		);
		for (const sectionId of ['sA', 'sB', null]) {
			expect(valueSeeds.has(copyOrderSeed({ ...parts, sectionId }))).toBe(false);
		}
		// Une graine par section : ajouter un exercice à B ne rebat pas A
		expect(copyOrderSeed({ ...parts, sectionId: 'sA' })).not.toBe(
			copyOrderSeed({ ...parts, sectionId: 'sB' })
		);
	});

	it('ajouter un exercice à la section B ne change pas l’ordre de la section A', () => {
		const scope = assignmentCopyScope(INDIVIDUAL, { studentId: 'eleve-4' });
		const before = copyOrder(worksheet(SHUFFLE), scope).filter((id) => blockOf(id) === 'a');
		const more = [...PLACEMENTS, { id: 'b3', section: 'sB', position: 3 }];
		const after = copyOrder(worksheet(SHUFFLE, more), scope).filter((id) => blockOf(id) === 'a');
		expect(after).toEqual(before);
	});
});
