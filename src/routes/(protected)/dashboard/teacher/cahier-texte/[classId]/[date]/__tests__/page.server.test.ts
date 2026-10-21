/**
 * Cahier de texte — « Programme travaillé » sur l'arbre branche > notion > points
 * ================================================================================
 *
 * Comportements validés par David (C5, étape 3, B2, 2026-10-21) :
 *   - les cases à cocher sont les points NEUFS du niveau de la classe, rangés par
 *     branche > notion (la sous-notion est nommée à côté du point) ;
 *   - un ancien point (thème → objectif) n'apparaît jamais, et la création d'une
 *     séance ne l'écrit pas (Q2), ni un point neuf archivé (B3) ;
 *   - un point archivé déjà coché reste affiché pour pouvoir le décocher ; non
 *     coché, il reste masqué (Q1).
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
const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const ENTRY_ID = '22222222-2222-4222-8222-222222222222';
const DATE = '2026-10-21';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: '99999999-9999-4999-8999-999999999999' } })
}));
vi.mock('$lib/server/journal-homework', () => ({
	getHomeworkForEntry: async () => [],
	prepareHomeworkForEntry: async () => ({ items: [], rejected: [] }),
	setHomeworkForEntry: async () => ({ error: null })
}));
vi.mock('$lib/server/class-sessions', () => ({
	getUpcomingSessionDates: async () => ({ dates: [], hasSchedule: false })
}));
vi.mock('$lib/server/curriculum-coverage', () => ({
	reconcileAutoCoverage: async () => ({ introuvables: [] })
}));
vi.mock('$lib/server/journal', () => ({
	createJournalEntry: async () => ({ data: { id: '22222222-2222-4222-8222-222222222222' } }),
	updateJournalEntry: async () => ({ data: null }),
	deleteJournalEntry: async () => ({ error: null })
}));

import { load, actions } from '../+page.server';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];
type CreateEvent = Parameters<(typeof actions)['create']>[0];

// ============================================================================
// HELPERS
// ============================================================================

function fakeDb(grade: string | null, coveredPointIds: string[], pointsUnreadable = false) {
	return createFakeSupabase((table, calls) => {
		if (pointsUnreadable && table === 'curriculum_points') {
			return { data: null, error: { message: 'panne' } };
		}
		const programme = answerProgramme(table, calls);
		if (programme) return programme;
		switch (table) {
			case 'classes':
				return { data: { id: CLASS_ID, name: '5e A', grade } };
			case 'class_journal_entries':
				return {
					data: {
						id: ENTRY_ID,
						class_id: CLASS_ID,
						entry_date: DATE,
						lesson_content: null,
						is_published: false,
						created_at: '',
						updated_at: ''
					}
				};
			case 'journal_entry_points':
				return {
					data: coveredPointIds.map((point_id) => ({ point_id, source: 'manual' }))
				};
			case 'journal_entry_activities':
			case 'exercises':
			case 'question_templates':
			case 'evaluations':
				return { data: [] };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
}

async function loadWith(grade: string | null, coveredPointIds: string[]) {
	const fake = fakeDb(grade, coveredPointIds);
	const event = {
		locals: { supabase: fake.client },
		params: { classId: CLASS_ID, date: DATE }
	} as unknown as LoadEvent;
	return (await load(event)) as PageServerData;
}

// ============================================================================
// TESTS
// ============================================================================

describe('cahier de texte — programme travaillé (C5, B2)', () => {
	it('range les points neufs du niveau par branche > notion, sous-notion nommée', async () => {
		const result = await loadWith('5', []);

		expect(result.curriculumTree.map((b) => b.name)).toEqual(['Nombres']);
		const notion = result.curriculumTree[0].notions[0];
		expect(notion.name).toBe('Fractions');
		expect(notion.points.map((p) => p.id)).toEqual([P_FRACTION, P_ADDITION]);
		expect(notion.points[1].subnotionName).toBe('Addition');
	});

	it('ni ancien point ni point d’un autre niveau, même coché', async () => {
		const result = await loadWith('5', [P_ANCIEN]);
		expect(pointIdsOf(result.curriculumTree)).not.toContain(P_ANCIEN);
		expect(pointIdsOf(result.curriculumTree)).not.toContain(P_QUATRIEME);
	});

	it('un point archivé déjà coché reste affiché, marqué archivé', async () => {
		const result = await loadWith('5', [P_TRIANGLE_ARCHIVE]);
		const geometrie = result.curriculumTree.find((b) => b.name === 'Géométrie');
		expect(geometrie?.notions[0].points.map((p) => p.id)).toEqual([P_TRIANGLE_ARCHIVE]);
		expect(geometrie?.notions[0].points[0].archived_at).not.toBeNull();
	});

	it('un point archivé non coché reste masqué', async () => {
		const result = await loadWith('5', []);
		expect(pointIdsOf(result.curriculumTree)).not.toContain(P_TRIANGLE_ARCHIVE);
	});

	it('classe sans niveau : aucun programme', async () => {
		const result = await loadWith(null, []);
		expect(result.curriculumTree).toEqual([]);
	});
});

describe('création d’une séance — points cochés avant enregistrement (Q2)', () => {
	it('écrit les points neufs, jamais un ancien point ni un archivé', async () => {
		const fake = fakeDb('5', []);
		const formData = new FormData();
		formData.set('coveredPointIds', [P_FRACTION, P_ANCIEN, P_TRIANGLE_ARCHIVE].join(','));
		const event = {
			locals: { supabase: fake.client, user: { id: USER_ID } },
			params: { classId: CLASS_ID, date: DATE },
			request: { formData: async () => formData }
		} as unknown as CreateEvent;

		await actions.create(event);

		const insert = fake
			.on('journal_entry_points')
			.flatMap((q) => q.calls)
			.find((c) => c.method === 'insert');
		const rows = insert?.args[0] as { point_id: string }[];
		expect(rows.map((r) => r.point_id)).toEqual([P_FRACTION]);
	});

	it('lecture des points en panne : séance créée, avertie, aucun point écrit', async () => {
		const fake = fakeDb('5', [], true);
		const formData = new FormData();
		formData.set('coveredPointIds', P_FRACTION);
		const event = {
			locals: { supabase: fake.client, user: { id: USER_ID } },
			params: { classId: CLASS_ID, date: DATE },
			request: { formData: async () => formData }
		} as unknown as CreateEvent;

		const result = (await actions.create(event)) as { success?: boolean; warning?: string };

		expect(result.success).toBe(true);
		expect(result.warning).toMatch(/points du programme/);
		const inserts = fake
			.on('journal_entry_points')
			.filter((q) => q.calls.some((c) => c.method === 'insert'));
		expect(inserts).toHaveLength(0);
	});
});
