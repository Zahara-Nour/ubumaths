/**
 * Édition d'un exercice — tags du programme sur l'arbre branche > notion > points
 * ================================================================================
 *
 * Comportements validés par David (C5, étape 3, B2, 2026-10-21) :
 *   - un arbre par niveau de l'exercice, fait de ses points NEUFS rangés par
 *     branche > notion (la sous-notion est nommée à côté du point) ;
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

async function loadWith(grades: string[], taggedPointIds: string[]) {
	exercise.grades = grades;
	const fake = createFakeSupabase((table, calls) => {
		const programme = answerProgramme(table, calls);
		if (programme) return programme;
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
	it('un arbre par niveau, points neufs par branche > notion, sous-notion nommée', async () => {
		const result = await loadWith(['5', '4'], []);

		expect(result.curriculumByGrade.map((c) => c.grade)).toEqual(['5', '4']);
		const cinquieme = result.curriculumByGrade[0].tree;
		expect(cinquieme.map((b) => b.name)).toEqual(['Nombres']);
		const points = cinquieme[0].notions[0].points;
		expect(points.map((p) => p.id)).toEqual([P_FRACTION, P_ADDITION]);
		expect(points[1].subnotionName).toBe('Addition');
		expect(pointIdsOf(result.curriculumByGrade[1].tree)).toEqual([P_QUATRIEME]);
	});

	it('un ancien point n’apparaît jamais, même tagué', async () => {
		const result = await loadWith(['5'], [P_ANCIEN]);
		expect(pointIdsOf(result.curriculumByGrade[0].tree)).not.toContain(P_ANCIEN);
	});

	it('un point archivé déjà tagué reste affiché, marqué archivé', async () => {
		const result = await loadWith(['5'], [P_TRIANGLE_ARCHIVE]);
		const geometrie = result.curriculumByGrade[0].tree.find((b) => b.name === 'Géométrie');
		expect(geometrie?.notions[0].points[0].id).toBe(P_TRIANGLE_ARCHIVE);
		expect(geometrie?.notions[0].points[0].archived_at).not.toBeNull();
	});

	it('un point archivé non tagué reste masqué', async () => {
		const result = await loadWith(['5'], []);
		expect(pointIdsOf(result.curriculumByGrade[0].tree)).not.toContain(P_TRIANGLE_ARCHIVE);
	});

	it('niveau sans point neuf : pas d’arbre pour ce niveau', async () => {
		const result = await loadWith(['6'], []);
		expect(result.curriculumByGrade).toEqual([]);
	});
});
