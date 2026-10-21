/**
 * Édition d'un exercice — tags du programme sur l'arbre branche > notion > points
 * ================================================================================
 *
 * Comportements validés par David (C5, étape 3, B2, 2026-10-21) :
 *   - la base n'accepte, pour un exercice, que les points posés sur l'un de ses
 *     nœuds de rangement ou sur la notion de ce nœud (règle 1) : l'écran ne
 *     propose que ceux-là, des NIVEAUX de l'exercice, rangés par branche > notion
 *     (la sous-notion est nommée à côté du point) ;
 *   - un exercice non rangé ne peut recevoir aucun point : l'écran le dit ;
 *   - un ancien point (thème → objectif) n'apparaît jamais ;
 *   - un point archivé déjà tagué reste affiché pour pouvoir le retirer ; non
 *     tagué, il reste masqué (Q1).
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';
import {
	answerProgramme,
	pointIdsOf,
	P_ADDITION,
	P_ANCIEN,
	P_DECIMAL,
	P_FRACTION,
	P_QUATRIEME,
	P_TRIANGLE_ARCHIVE
} from '$lib/server/__tests__/helpers/fake-programme';
import type { PageServerData } from '../$types';

const USER_ID = '99999999-9999-4999-8999-999999999999';
const EXERCISE_ID = '33333333-3333-4333-8333-333333333333';

const exercise = { grades: ['5'] as string[] };

vi.mock('$lib/server/exercises', () => ({
	getExercise: async () => ({
		data: { id: EXERCISE_ID, created_by: USER_ID, grades: exercise.grades },
		error: null
	})
}));

import { load } from '../+page.server';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];

// ============================================================================
// HELPERS
// ============================================================================

/** Charge l'exercice, de ces niveaux, rangé sur ces nœuds et portant ces tags. */
async function loadWith(grades: string[], nodeIds: string[], taggedPointIds: string[] = []) {
	exercise.grades = grades;
	const fake = createFakeSupabase((table, calls) => {
		const programme = answerProgramme(table, calls);
		if (programme) return programme;
		if (table === 'exercise_classifications') {
			return { data: nodeIds.map((node_id) => ({ node_id })) };
		}
		if (table === 'exercise_curriculum_points') {
			return { data: taggedPointIds.map((point_id) => ({ point_id })) };
		}
		throw new Error(`Table inattendue : ${table}`);
	});
	const event = {
		locals: {
			supabase: fake.client,
			safeGetSession: async () => ({ user: { id: USER_ID } })
		},
		params: { id: EXERCISE_ID },
		fetch: async () => new Response('[]')
	} as unknown as LoadEvent;
	return (await load(event)) as PageServerData;
}

// ============================================================================
// TESTS
// ============================================================================

describe('édition d’un exercice — tags du programme (C5, B2)', () => {
	it('rangé sur une sous-notion : ses points et ceux de sa notion, par niveau de l’exercice', async () => {
		const result = await loadWith(['5', '4'], ['s-addition']);

		expect(result.exerciseUnranked).toBe(false);
		expect(result.curriculumByGrade.map((c) => c.grade)).toEqual(['5', '4']);
		const cinquieme = result.curriculumByGrade[0].tree;
		expect(cinquieme.map((b) => b.name)).toEqual(['Nombres']);
		const points = cinquieme[0].notions[0].points;
		expect(points.map((p) => p.id)).toEqual([P_FRACTION, P_ADDITION]);
		expect(points[1].subnotionName).toBe('Addition');
		expect(pointIdsOf(result.curriculumByGrade[1].tree)).toEqual([P_QUATRIEME]);
	});

	it('jamais un point hors de ses nœuds et de leur notion', async () => {
		const result = await loadWith(['5'], ['s-addition']);
		expect(pointIdsOf(result.curriculumByGrade[0].tree)).not.toContain(P_DECIMAL);
	});

	it('rangé sur une notion : seulement les points de cette notion', async () => {
		const result = await loadWith(['5'], ['n-fractions']);
		expect(pointIdsOf(result.curriculumByGrade[0].tree)).toEqual([P_FRACTION]);
	});

	it('rangé sur deux nœuds : les points des deux', async () => {
		const result = await loadWith(['5'], ['n-fractions', 'n-decimaux']);
		expect(pointIdsOf(result.curriculumByGrade[0].tree)).toEqual([P_FRACTION, P_DECIMAL]);
	});

	it('seulement les niveaux de l’exercice', async () => {
		const result = await loadWith(['5'], ['s-addition']);
		expect(result.curriculumByGrade.map((c) => c.grade)).toEqual(['5']);
	});

	it('un ancien point n’apparaît jamais, même tagué', async () => {
		const result = await loadWith(['5'], ['s-addition'], [P_ANCIEN]);
		expect(pointIdsOf(result.curriculumByGrade[0].tree)).not.toContain(P_ANCIEN);
	});

	it('un point archivé déjà tagué reste affiché, marqué archivé', async () => {
		const result = await loadWith(['5'], ['n-triangles'], [P_TRIANGLE_ARCHIVE]);
		const geometrie = result.curriculumByGrade[0].tree.find((b) => b.name === 'Géométrie');
		expect(geometrie?.notions[0].points[0].id).toBe(P_TRIANGLE_ARCHIVE);
		expect(geometrie?.notions[0].points[0].archived_at).not.toBeNull();
	});

	it('un point archivé non tagué reste masqué', async () => {
		const result = await loadWith(['5'], ['n-triangles']);
		expect(result.curriculumByGrade).toEqual([]);
	});

	it('exercice non rangé : signalé, aucun point proposé', async () => {
		const result = await loadWith(['5'], []);
		expect(result.exerciseUnranked).toBe(true);
		expect(result.curriculumByGrade).toEqual([]);
	});

	it('rangé, mais aucun point de ses niveaux : aucun arbre, pas « non rangé »', async () => {
		const result = await loadWith(['6'], ['s-addition']);
		expect(result.exerciseUnranked).toBe(false);
		expect(result.curriculumByGrade).toEqual([]);
	});
});
