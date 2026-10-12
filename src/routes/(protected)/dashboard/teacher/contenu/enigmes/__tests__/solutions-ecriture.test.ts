/**
 * Énigmes côté prof : réponse attendue et correction s'écrivent dans `riddle_solutions`
 * ===================================================================================
 *
 * Étape B (2026-10-12) : `riddles.answer` et `riddles.correction` seront supprimées
 * (étape C). La création et l'édition n'y écrivent plus rien ; la solution part dans
 * `riddle_solutions`, et l'écriture n'est tenue pour faite que si `.select()` rend la
 * ligne (la RLS refuse en silence : zéro ligne, aucune erreur).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions as createActions } from '../new/+page.server';
import { actions as editActions } from '../[id]/edit/+page.server';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: vi.fn(async () => ({ user: { id: TEACHER_ID }, profile: { role: 'teacher' } }))
}));

// ============================================================================
// TYPES
// ============================================================================

interface Call {
	table: string;
	op: 'insert' | 'update' | 'delete' | 'upsert';
	payload: unknown;
}

type Result = { data: unknown; error: unknown };

// ============================================================================
// CONSTANTES
// ============================================================================

const TEACHER_ID = '22222222-2222-4222-8222-222222222222';
const RIDDLE_ID = '11111111-1111-4111-8111-111111111111';
const ANSWER = { type: 'numerical', value: 42 };

const RIDDLE_ROW = {
	id: RIDDLE_ID,
	riddle_number: 7,
	title: 'Les trois portes',
	genre: null,
	difficulty: 2,
	statement: 'Énoncé',
	image_url: null,
	created_by: TEACHER_ID,
	status: 'draft',
	created_at: '2026-10-01T00:00:00Z',
	updated_at: '2026-10-01T00:00:00Z'
};

// ============================================================================
// VARIABLES
// ============================================================================

let calls: Call[] = [];
/** Ce que rend la requête, par « table:opération ». */
let results: Record<string, Result> = {};

// ============================================================================
// HELPERS
// ============================================================================

/** Faux client : chaque opération est notée, `await` rend le résultat configuré. */
function supabaseMock() {
	return {
		from: vi.fn((table: string) => {
			let key = `${table}:select`;
			const c: Record<string, unknown> = {};
			for (const op of ['insert', 'update', 'delete', 'upsert'] as const) {
				c[op] = vi.fn((payload?: unknown) => {
					calls.push({ table, op, payload });
					key = `${table}:${op}`;
					return c;
				});
			}
			for (const m of ['select', 'eq', 'in']) c[m] = vi.fn(() => c);
			const resolve = (): Result => results[key] ?? { data: null, error: null };
			c.single = vi.fn(async () => resolve());
			c.then = (onFulfilled: (v: Result) => unknown) =>
				Promise.resolve(resolve()).then(onFulfilled);
			return c;
		})
	};
}

function riddleForm(): FormData {
	const fd = new FormData();
	fd.set('title', 'Les trois portes');
	fd.set('genre', '');
	fd.set('image_url', '');
	fd.set('difficulty', '2');
	fd.set('statement', 'Énoncé');
	fd.set('correction', 'La correction');
	fd.set('answer', JSON.stringify(ANSWER));
	fd.set('status', 'draft');
	return fd;
}

function event(extra: Record<string, unknown> = {}) {
	return {
		request: new Request('http://localhost', { method: 'POST', body: riddleForm() }),
		locals: { supabase: supabaseMock() },
		params: { id: RIDDLE_ID },
		...extra
	} as never;
}

function writesTo(table: string) {
	return calls.filter((c) => c.table === table);
}

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	calls = [];
	results = {};
});

describe('création d’une énigme', () => {
	it('écrit la solution dans riddle_solutions, rien dans riddles.answer/correction', async () => {
		results['riddles:insert'] = { data: RIDDLE_ROW, error: null };
		results['riddle_solutions:upsert'] = { data: [{ riddle_id: RIDDLE_ID }], error: null };

		const result = await createActions.default(event());

		expect(result).toMatchObject({ success: true });
		const [insert] = writesTo('riddles');
		expect(insert.op).toBe('insert');
		const inserted = (insert.payload as Record<string, unknown>[])[0];
		expect(inserted).not.toHaveProperty('answer');
		expect(inserted).not.toHaveProperty('correction');
		expect(writesTo('riddle_solutions')).toEqual([
			{
				table: 'riddle_solutions',
				op: 'upsert',
				payload: expect.objectContaining({
					riddle_id: RIDDLE_ID,
					answer: ANSWER,
					correction: 'La correction'
				})
			}
		]);
	});

	it('supprime l’énigme créée si la solution n’est pas écrite (zéro ligne rendue)', async () => {
		results['riddles:insert'] = { data: RIDDLE_ROW, error: null };
		results['riddle_solutions:upsert'] = { data: [], error: null };
		results['riddles:delete'] = { data: [{ id: RIDDLE_ID }], error: null };

		const result = await createActions.default(event());

		expect(result).toMatchObject({ status: 500 });
		expect(writesTo('riddles').map((c) => c.op)).toEqual(['insert', 'delete']);
	});
});

describe('édition d’une énigme', () => {
	it('met à jour riddles sans answer/correction, puis la solution', async () => {
		results['riddles:update'] = { data: [{ id: RIDDLE_ID }], error: null };
		results['riddle_solutions:upsert'] = { data: [{ riddle_id: RIDDLE_ID }], error: null };

		const result = await editActions.default(event());

		expect(result).toMatchObject({ success: true });
		const [update] = writesTo('riddles');
		expect(update.op).toBe('update');
		expect(update.payload).not.toHaveProperty('answer');
		expect(update.payload).not.toHaveProperty('correction');
		expect(writesTo('riddle_solutions')).toEqual([
			{
				table: 'riddle_solutions',
				op: 'upsert',
				payload: expect.objectContaining({
					riddle_id: RIDDLE_ID,
					answer: ANSWER,
					correction: 'La correction'
				})
			}
		]);
	});

	it('échoue si la solution n’est pas écrite (zéro ligne rendue)', async () => {
		results['riddles:update'] = { data: [{ id: RIDDLE_ID }], error: null };
		results['riddle_solutions:upsert'] = { data: [], error: null };

		const result = await editActions.default(event());

		expect(result).toMatchObject({ status: 500 });
	});

	it('échoue sans écrire la solution si la RLS refuse la mise à jour (zéro ligne)', async () => {
		results['riddles:update'] = { data: [], error: null };

		const result = await editActions.default(event());

		expect(result).toMatchObject({ status: 404 });
		expect(writesTo('riddle_solutions')).toEqual([]);
	});
});
