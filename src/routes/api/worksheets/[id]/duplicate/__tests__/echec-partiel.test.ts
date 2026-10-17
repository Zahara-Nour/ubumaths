/**
 * POST /api/worksheets/[id]/duplicate — échec partiel de la copie
 * ================================================================
 *
 * Bug validé par David (2026-10-15) : l'insertion des exercices de la copie
 * n'était pas vérifiée, une copie amputée était annoncée réussie (201). Toute
 * écriture vérifie maintenant son erreur ET ses lignes rendues (la RLS échoue
 * en silence : zéro ligne, pas d'erreur) ; en cas d'échec, la COPIE créée par
 * la requête est supprimée (jamais l'original), puis 500.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TYPES
// ============================================================================

interface Result {
	data: unknown;
	error: { message: string } | null;
}

/** Réponse simulée d'une écriture, par table */
interface Scenario {
	sectionInsert: Result;
	exerciseInsert: Result;
	worksheetDelete: Result;
}

interface Call {
	table: string;
	op: string;
	filters: [string, unknown][];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const ORIGINAL_ID = '550e8400-e29b-41d4-a716-446655440011';
const COPY_ID = '550e8400-e29b-41d4-a716-446655440099';
const SECTION_ID = '550e8400-e29b-41d4-a716-446655440021';

const ORIGINAL = {
	id: ORIGINAL_ID,
	title: 'Fiche',
	description: null,
	type: 'worksheet',
	config: {},
	translations: null,
	status: 'published',
	version: 3,
	template_id: null,
	style_id: null,
	estimated_duration_minutes: null,
	total_points: null,
	grades: null,
	created_by: TEACHER_ID,
	school_id: null,
	archived_at: null,
	published_at: '2026-10-01T10:00:00Z',
	created_at: '2026-10-01T10:00:00Z',
	updated_at: '2026-10-01T10:00:00Z'
};

const EXERCISE = {
	id: '550e8400-e29b-41d4-a716-446655440031',
	worksheet_id: ORIGINAL_ID,
	exercise_id: '550e8400-e29b-41d4-a716-446655440041',
	section_id: null,
	position: 1,
	points: null,
	variant_mode: 'none',
	variant_config: null,
	custom_instructions: null,
	answer_frame_lines: null,
	translations: null,
	is_essential: false,
	variation_index: null,
	correction_visible: true,
	created_at: '2026-10-01T10:00:00Z',
	updated_at: '2026-10-01T10:00:00Z'
};

const SECTION = {
	id: SECTION_ID,
	worksheet_id: ORIGINAL_ID,
	title: 'Partie A',
	instructions: null,
	position: 1,
	points_total: null,
	translations: null,
	created_at: '2026-10-01T10:00:00Z',
	updated_at: '2026-10-01T10:00:00Z'
};

// ============================================================================
// MOCKS
// ============================================================================

const loggerError = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: async () => ({
		user: { id: TEACHER_ID },
		profile: { role: 'teacher', school_id: null }
	})
}));

vi.mock('$lib/server/resource-tags', () => ({
	fetchResourceTagNames: async () => [],
	syncResourceTags: async () => undefined
}));

vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({
		error: loggerError,
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	})
}));

const { POST } = await import('../+server');

// ============================================================================
// VARIABLES
// ============================================================================

let calls: Call[];

// ============================================================================
// FONCTIONS
// ============================================================================

/** Client Supabase minimal : une requête chaînable qui se résout selon la table et l'opération */
function client(scenario: Scenario, sections: unknown[]) {
	return {
		from: (table: string) => {
			const call: Call = { table, op: 'select', filters: [] };
			calls.push(call);
			const resolve = (): Result => {
				if (call.op === 'select') {
					if (table === 'worksheets') return { data: ORIGINAL, error: null };
					if (table === 'worksheet_sections') return { data: sections, error: null };
					if (table === 'worksheet_exercises') return { data: [EXERCISE], error: null };
				}
				if (call.op === 'insert') {
					if (table === 'worksheets') return { data: { ...ORIGINAL, id: COPY_ID }, error: null };
					if (table === 'worksheet_sections') return scenario.sectionInsert;
					if (table === 'worksheet_exercises') return scenario.exerciseInsert;
				}
				if (call.op === 'delete' && table === 'worksheets') return scenario.worksheetDelete;
				throw new Error(`requête inattendue : ${table} ${call.op}`);
			};
			const query = {
				select: () => query,
				order: () => query,
				eq: (column: string, value: unknown) => {
					call.filters.push([column, value]);
					return query;
				},
				insert: () => {
					call.op = 'insert';
					return query;
				},
				delete: () => {
					call.op = 'delete';
					return query;
				},
				single: async () => {
					const result = resolve();
					if (result.error) return result;
					const data = Array.isArray(result.data) ? result.data[0] : result.data;
					return data
						? { data, error: null }
						: { data: null, error: { message: 'JSON object requested, 0 rows returned' } };
				},
				then: (
					onFulfilled: (value: Result) => unknown,
					onRejected?: (reason: unknown) => unknown
				) => Promise.resolve().then(resolve).then(onFulfilled, onRejected)
			};
			return query;
		}
	};
}

async function duplicate(scenario: Scenario, sections: unknown[] = []) {
	const locals = { supabase: client(scenario, sections) } as unknown as App.Locals;
	return POST({ locals, params: { id: ORIGINAL_ID } } as never);
}

function deletes(): Call[] {
	return calls.filter((call) => call.op === 'delete');
}

/** La 500 propre à une copie annulée (pas une 500 venue d'ailleurs) */
const ABORTED = { status: 500, body: { message: expect.stringContaining('annulée') } };
const OK_DELETE: Result = { data: [{ id: COPY_ID }], error: null };
const OK_SECTION: Result = { data: [{ id: '550e8400-e29b-41d4-a716-446655440022' }], error: null };

// ============================================================================
// SUITE
// ============================================================================

beforeEach(() => {
	calls = [];
	loggerError.mockClear();
});

describe('dupliquer une fiche : une copie incomplète est supprimée', () => {
	it('insertion des exercices en erreur → 500, la copie (et elle seule) est supprimée', async () => {
		await expect(
			duplicate({
				sectionInsert: OK_SECTION,
				exerciseInsert: { data: null, error: { message: 'boom' } },
				worksheetDelete: OK_DELETE
			})
		).rejects.toMatchObject(ABORTED);

		expect(deletes()).toEqual([{ table: 'worksheets', op: 'delete', filters: [['id', COPY_ID]] }]);
	});

	it('insertion des exercices sans ligne rendue (RLS silencieuse) → 500 et copie supprimée', async () => {
		await expect(
			duplicate({
				sectionInsert: OK_SECTION,
				exerciseInsert: { data: [], error: null },
				worksheetDelete: OK_DELETE
			})
		).rejects.toMatchObject(ABORTED);

		expect(deletes()).toEqual([{ table: 'worksheets', op: 'delete', filters: [['id', COPY_ID]] }]);
	});

	it('insertion d’une section en échec → 500 et copie supprimée', async () => {
		await expect(
			duplicate(
				{
					sectionInsert: { data: [], error: null },
					exerciseInsert: { data: [{ id: 'x' }], error: null },
					worksheetDelete: OK_DELETE
				},
				[SECTION]
			)
		).rejects.toMatchObject(ABORTED);

		expect(deletes()).toEqual([{ table: 'worksheets', op: 'delete', filters: [['id', COPY_ID]] }]);
		expect(calls.some((call) => call.table === 'worksheet_exercises' && call.op === 'insert')).toBe(
			false
		);
	});

	it('nettoyage qui ne supprime rien → toujours 500, et l’échec du nettoyage est journalisé', async () => {
		await expect(
			duplicate({
				sectionInsert: OK_SECTION,
				exerciseInsert: { data: null, error: { message: 'boom' } },
				worksheetDelete: { data: [], error: null }
			})
		).rejects.toMatchObject(ABORTED);

		expect(deletes()).toHaveLength(1);
		expect(loggerError).toHaveBeenCalledWith(
			expect.stringContaining('copie incomplète non supprimée'),
			expect.anything()
		);
	});
});
