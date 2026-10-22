/**
 * Constructions : création et modification réservées au prof et à l'admin (décision de
 * David du 2026-10-22). La RLS tient la même règle (tests/integration/
 * constructions-ecriture-reservee.test.ts) ; ici, l'API et les pages répondent 403 à
 * un élève sans toucher à la table.
 */
import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { POST } from '../+server';
import { PUT, DELETE } from '../[id]/+server';
import { load as loadNew } from '../../../(protected)/constructions/new/+page.server';
import { load as loadEdit } from '../../../(protected)/constructions/[id]/edit/+page.server';

// ============================================================================
// CONSTANTES
// ============================================================================

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CONSTRUCTION_ID = '22222222-2222-4222-8222-222222222222';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Faux `locals` : session et profil du rôle donné ; toute requête sur `constructions`
 * est notée et renvoie une construction de l'utilisateur.
 */
function fakeLocals(role: 'student' | 'teacher' | 'admin') {
	const tablesTouched: string[] = [];
	const row = {
		id: CONSTRUCTION_ID,
		author_id: USER_ID,
		title: 'zz',
		format: 'dsl',
		dsl_script: 'A = point(0, 0)',
		is_public: false
	};
	// Requête awaitable (une promesse) qui renvoie elle-même à chaque maillon.
	const chain = Object.assign(Promise.resolve({ data: [row], error: null }), {
		single: async () => ({ data: row, error: null }),
		maybeSingle: async () => ({ data: row, error: null })
	});
	for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'or', 'order', 'range']) {
		Object.assign(chain, { [method]: () => chain });
	}

	const supabase = {
		from(table: string) {
			if (table === 'profiles') {
				return {
					select: () => ({
						eq: () => ({ single: async () => ({ data: { id: USER_ID, role }, error: null }) })
					})
				};
			}
			tablesTouched.push(table);
			return chain;
		}
	};
	const locals = {
		safeGetSession: async () => ({ user: { id: USER_ID }, session: {} }),
		supabase
	};
	return { locals, tablesTouched };
}

function jsonRequest(body: unknown): Request {
	return new Request('http://localhost/api/constructions', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const NEW_CONSTRUCTION = {
	title: 'zz',
	format: 'dsl',
	dsl_script: 'A = point(0, 0)',
	is_public: true
};

async function statusOf(run: () => unknown): Promise<number> {
	try {
		const result = await run();
		return result instanceof Response ? result.status : 200;
	} catch (thrown) {
		if (isHttpError(thrown)) return thrown.status;
		throw thrown;
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('API constructions : un élève ne crée ni ne modifie', () => {
	it('POST par un élève → 403, table non touchée', async () => {
		const { locals, tablesTouched } = fakeLocals('student');
		const status = await statusOf(() =>
			POST({ locals, request: jsonRequest(NEW_CONSTRUCTION) } as never)
		);
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it('PUT par un élève → 403, table non touchée', async () => {
		const { locals, tablesTouched } = fakeLocals('student');
		const status = await statusOf(() =>
			PUT({
				locals,
				params: { id: CONSTRUCTION_ID },
				request: jsonRequest({ is_public: true })
			} as never)
		);
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it('DELETE par un élève auteur reste permis (pas de 403)', async () => {
		const { locals, tablesTouched } = fakeLocals('student');
		const status = await statusOf(() =>
			DELETE({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).not.toBe(403);
		expect(tablesTouched).toContain('constructions');
	});

	it.each(['teacher', 'admin'] as const)('POST par %s passe la garde', async (role) => {
		const { locals, tablesTouched } = fakeLocals(role);
		const status = await statusOf(() =>
			POST({ locals, request: jsonRequest(NEW_CONSTRUCTION) } as never)
		);
		expect(status).not.toBe(403);
		expect(tablesTouched).toContain('constructions');
	});

	it('PUT par un prof auteur passe la garde', async () => {
		const { locals, tablesTouched } = fakeLocals('teacher');
		const status = await statusOf(() =>
			PUT({
				locals,
				params: { id: CONSTRUCTION_ID },
				request: jsonRequest({ is_public: true })
			} as never)
		);
		expect(status).not.toBe(403);
		expect(tablesTouched).toContain('constructions');
	});
});

describe('pages constructions : création et modification fermées à l’élève', () => {
	it('/constructions/new par un élève → 403', async () => {
		const { locals } = fakeLocals('student');
		expect(await statusOf(() => loadNew({ locals } as never))).toBe(403);
	});

	it('/constructions/new par un prof → ouverte', async () => {
		const { locals } = fakeLocals('teacher');
		expect(await statusOf(() => loadNew({ locals } as never))).toBe(200);
	});

	it('/constructions/[id]/edit par un élève auteur → 403, table non touchée', async () => {
		const { locals, tablesTouched } = fakeLocals('student');
		const status = await statusOf(() =>
			loadEdit({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it('/constructions/[id]/edit par un prof auteur → ouverte', async () => {
		const { locals } = fakeLocals('teacher');
		const status = await statusOf(() =>
			loadEdit({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(200);
	});
});
