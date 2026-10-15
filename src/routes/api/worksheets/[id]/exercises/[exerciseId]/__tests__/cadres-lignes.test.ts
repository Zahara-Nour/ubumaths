/**
 * PUT /api/worksheets/[id]/exercises/[exerciseId] — lignes des cadres (ADR 0030, lot 4)
 * ====================================================================================
 *
 * `answer_frame_lines` validé par Zod (`.strict()`, entiers 0..40, ≤ 200) ;
 * écriture avec `.select()` : une écriture qui ne rend aucune ligne (refus de
 * la RLS, qui échoue en silence) est une erreur explicite, jamais un succès.
 */

import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: async () => ({
		user: { id: TEACHER_ID },
		profile: { role: 'teacher', school_id: null }
	})
}));

const ROW = {
	id: WE_ID,
	worksheet_id: WORKSHEET_ID,
	exercise_id: '550e8400-e29b-41d4-a716-446655440013',
	section_id: null,
	position: 1,
	points: null,
	variant_mode: 'none',
	variant_config: {},
	custom_instructions: null,
	is_essential: false,
	answer_frame_lines: null,
	created_at: '2026-10-15T10:00:00Z',
	updated_at: '2026-10-15T10:00:00Z'
};

interface Recorded {
	updates: unknown[];
	selectAfterUpdate: boolean;
}

/**
 * `worksheets` : la fiche (brouillon du prof) ; `worksheet_exercises` : la ligne
 * lue, puis la réponse de l'écriture (`written`, `null` = aucune ligne rendue)
 */
function client(written: Record<string, unknown> | null, recorded: Recorded) {
	return {
		from: (table: string) => {
			let updating = false;
			const query: Record<string, unknown> = {};
			query.eq = () => query;
			query.select = () => {
				if (updating) recorded.selectAfterUpdate = true;
				return query;
			};
			query.update = (values: unknown) => {
				updating = true;
				recorded.updates.push(values);
				return query;
			};
			query.single = async () => {
				if (table === 'worksheets') {
					return {
						data: { id: WORKSHEET_ID, created_by: TEACHER_ID, school_id: null, status: 'draft' },
						error: null
					};
				}
				if (!updating) return { data: ROW, error: null };
				return written
					? { data: written, error: null }
					: {
							data: null,
							error: { code: 'PGRST116', message: 'JSON object requested, 0 rows returned' }
						};
			};
			return query;
		}
	};
}

async function put(body: unknown, written: Record<string, unknown> | null = null) {
	const recorded: Recorded = { updates: [], selectAfterUpdate: false };
	const { PUT } = await import('../+server');
	try {
		const response = await PUT({
			params: { id: WORKSHEET_ID, exerciseId: WE_ID },
			request: new Request('http://localhost', { method: 'PUT', body: JSON.stringify(body) }),
			locals: { supabase: client(written, recorded) } as unknown as App.Locals
		} as never);
		return { status: response.status, body: await response.json(), recorded };
	} catch (thrown) {
		const { status, body: errorBody } = thrown as { status: number; body: { message: string } };
		return { status, body: errorBody, recorded };
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('PUT exercice de fiche : lignes des cadres', () => {
	it('valeur valide : écrite, relue par `.select()`, rendue', async () => {
		const lines = { questions: [0, 12, null] };
		const result = await put({ answer_frame_lines: lines }, { ...ROW, answer_frame_lines: lines });
		expect(result.status).toBe(200);
		expect(result.recorded.updates).toEqual([{ answer_frame_lines: lines }]);
		expect(result.recorded.selectAfterUpdate).toBe(true);
		expect(result.body.exercise.answer_frame_lines).toEqual(lines);
	});

	it('remise en auto de tout l’exercice : `null` écrit', async () => {
		const result = await put({ answer_frame_lines: null }, ROW);
		expect(result.status).toBe(200);
		expect(result.recorded.updates).toEqual([{ answer_frame_lines: null }]);
	});

	it.each([
		{ questions: [41] },
		{ questions: [1.5] },
		{ exercise: -1 },
		{ questions: [1], secret: 'x' },
		{ questions: Array(201).fill(1) }
	])('valeur refusée %o : 400, rien n’est écrit', async (lines) => {
		const result = await put({ answer_frame_lines: lines }, ROW);
		expect(result.status).toBe(400);
		expect(result.recorded.updates).toEqual([]);
	});

	it('aucune ligne rendue par l’écriture : erreur explicite, jamais un succès', async () => {
		const result = await put({ answer_frame_lines: { exercise: 3 } }, null);
		expect(result.status).toBe(404);
		expect(result.body.message).toMatch(/aucune modification/i);
	});
});
