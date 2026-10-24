/**
 * Constructions : écriture réservée au prof, qui lit tout (décision de David du
 * 2026-10-24 ; mono-professeur, la propriété `author_id` ne compte plus). La RLS tient
 * la même règle (tests/integration/constructions-ecriture-reservee.test.ts) ; ici,
 * l'API et les pages répondent 403 à l'admin et à l'élève sans toucher à la table, et
 * 404 sur un brouillon qu'ils ne doivent pas voir.
 */
import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { GET as getList, POST } from '../+server';
import { GET, PUT, DELETE } from '../[id]/+server';
import { load as loadNew } from '../../../(protected)/constructions/new/+page.server';
import { load as loadEdit } from '../../../(protected)/constructions/[id]/edit/+page.server';
import { load as loadDetail } from '../../../(protected)/constructions/[id]/+page.server';
import { load as loadList } from '../../../(protected)/constructions/+page.server';
import { load as loadConversion } from '../../../(protected)/constructions/conversion/+page.server';
import { POST as convert } from '../convert/+server';

// ============================================================================
// TYPES
// ============================================================================

type Role = 'student' | 'teacher' | 'admin';

// ============================================================================
// CONSTANTES
// ============================================================================

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CONSTRUCTION_ID = '22222222-2222-4222-8222-222222222222';
const READERS: Role[] = ['student', 'admin'];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Faux `locals` : session et profil du rôle donné ; toute requête sur `constructions`
 * est notée (table, appels de filtre, ligne insérée) et renvoie une construction sans
 * auteur, comme en prod. `writeRefused` : la liste rendue est vide, comme après un
 * refus RLS silencieux ; `isPublic` : la construction rendue est publiée ou non.
 */
function fakeLocals(role: Role, { writeRefused = false, isPublic = false } = {}) {
	const tablesTouched: string[] = [];
	const calls: string[] = [];
	const inserted: unknown[] = [];
	const row = {
		id: CONSTRUCTION_ID,
		title: 'zz',
		format: 'dsl',
		dsl_script: 'A = point(0, 0)',
		is_public: isPublic
	};
	// Requête awaitable (une promesse) qui renvoie elle-même à chaque maillon.
	const chain = Object.assign(Promise.resolve({ data: writeRefused ? [] : [row], error: null }), {
		single: async () => ({ data: row, error: null }),
		maybeSingle: async () => ({ data: row, error: null })
	});
	for (const method of ['select', 'update', 'delete', 'eq', 'or', 'order', 'range']) {
		Object.assign(chain, {
			[method]: (...args: unknown[]) => {
				calls.push(`${method}(${args.map((a) => JSON.stringify(a)).join(',')})`);
				return chain;
			}
		});
	}
	Object.assign(chain, {
		insert: (payload: unknown) => {
			inserted.push(payload);
			return chain;
		}
	});

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
	const parent = async () => ({ user: { id: USER_ID }, profile: { role } });
	return { locals, parent, tablesTouched, calls, inserted };
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

describe('API constructions : seul le prof écrit', () => {
	it.each(READERS)('POST par %s → 403, table non touchée', async (role) => {
		const { locals, tablesTouched } = fakeLocals(role);
		const status = await statusOf(() =>
			POST({ locals, request: jsonRequest(NEW_CONSTRUCTION) } as never)
		);
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it.each(READERS)('PUT par %s → 403, table non touchée', async (role) => {
		const { locals, tablesTouched } = fakeLocals(role);
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

	it.each(READERS)('DELETE par %s → 403, table non touchée', async (role) => {
		const { locals, tablesTouched } = fakeLocals(role);
		const status = await statusOf(() =>
			DELETE({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it('POST par le prof → 201, sans author_id', async () => {
		const { locals, inserted } = fakeLocals('teacher');
		const status = await statusOf(() =>
			POST({ locals, request: jsonRequest(NEW_CONSTRUCTION) } as never)
		);
		expect(status).toBe(201);
		expect(inserted).toHaveLength(1);
		expect(inserted[0]).not.toHaveProperty('author_id');
	});

	it('PUT par le prof sur une construction sans auteur → 200', async () => {
		const { locals } = fakeLocals('teacher');
		const status = await statusOf(() =>
			PUT({
				locals,
				params: { id: CONSTRUCTION_ID },
				request: jsonRequest({ is_public: true })
			} as never)
		);
		expect(status).toBe(200);
	});

	it('DELETE par le prof sur une construction sans auteur → 200', async () => {
		const { locals } = fakeLocals('teacher');
		const status = await statusOf(() =>
			DELETE({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(200);
	});

	it('DELETE refusé en silence par la base (zéro ligne) → 404', async () => {
		const { locals } = fakeLocals('teacher', { writeRefused: true });
		const status = await statusOf(() =>
			DELETE({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(404);
	});
});

describe('API constructions : lecture', () => {
	it.each(READERS)('GET d’un brouillon par %s → 404', async (role) => {
		const { locals } = fakeLocals(role, { isPublic: false });
		const status = await statusOf(() => GET({ locals, params: { id: CONSTRUCTION_ID } } as never));
		expect(status).toBe(404);
	});

	it('GET d’un brouillon par le prof → 200, sans author_id demandé', async () => {
		const { locals, calls } = fakeLocals('teacher', { isPublic: false });
		const status = await statusOf(() => GET({ locals, params: { id: CONSTRUCTION_ID } } as never));
		expect(status).toBe(200);
		expect(calls.join(' ')).not.toMatch(/author_id|\*/);
	});

	it.each(READERS)('liste par %s : publiées seulement', async (role) => {
		const { locals, calls } = fakeLocals(role);
		await getList({ locals, url: new URL('http://localhost/api/constructions') } as never);
		expect(calls).toContain('eq("is_public",true)');
		expect(calls.join(' ')).not.toMatch(/author_id/);
	});

	it('liste par le prof : tout, brouillons compris', async () => {
		const { locals, calls } = fakeLocals('teacher');
		await getList({ locals, url: new URL('http://localhost/api/constructions') } as never);
		expect(calls.join(' ')).not.toMatch(/is_public",true|author_id/);
	});
});

describe('pages constructions', () => {
	it.each(READERS)('/constructions/new par %s → 403', async (role) => {
		const { locals } = fakeLocals(role);
		expect(await statusOf(() => loadNew({ locals } as never))).toBe(403);
	});

	it.each(READERS)('/constructions/conversion et sa conversion XML par %s → 403', async (role) => {
		const { locals } = fakeLocals(role);
		expect(await statusOf(() => loadConversion({ locals } as never))).toBe(403);
		expect(
			await statusOf(() => convert({ locals, request: jsonRequest({ xml: '<a/>' }) } as never))
		).toBe(403);
	});

	it('/constructions/new par le prof → ouverte', async () => {
		const { locals } = fakeLocals('teacher');
		expect(await statusOf(() => loadNew({ locals } as never))).toBe(200);
	});

	it.each(READERS)('/constructions/[id]/edit par %s → 403, table non touchée', async (role) => {
		const { locals, tablesTouched } = fakeLocals(role);
		const status = await statusOf(() =>
			loadEdit({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it('/constructions/[id]/edit par le prof, construction sans auteur → ouverte', async () => {
		const { locals } = fakeLocals('teacher');
		const status = await statusOf(() =>
			loadEdit({ locals, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(200);
	});

	it.each(READERS)('/constructions/[id] d’un brouillon par %s → 404', async (role) => {
		const { locals, parent } = fakeLocals(role, { isPublic: false });
		const status = await statusOf(() =>
			loadDetail({ locals, parent, params: { id: CONSTRUCTION_ID } } as never)
		);
		expect(status).toBe(404);
	});

	it('/constructions/[id] par le prof : brouillon ouvert et modifiable', async () => {
		const { locals, parent } = fakeLocals('teacher', { isPublic: false });
		const data = (await loadDetail({
			locals,
			parent,
			params: { id: CONSTRUCTION_ID }
		} as never)) as { canAuthor: boolean };
		expect(data.canAuthor).toBe(true);
	});

	it.each(READERS)('/constructions par %s : publiées seulement', async (role) => {
		const { locals, parent, calls } = fakeLocals(role);
		await loadList({ locals, parent } as never);
		expect(calls).toContain('eq("is_public",true)');
		expect(calls.join(' ')).not.toMatch(/author_id/);
	});

	it('/constructions par le prof : tout, brouillons compris', async () => {
		const { locals, parent, calls } = fakeLocals('teacher');
		await loadList({ locals, parent } as never);
		expect(calls.join(' ')).not.toMatch(/is_public",true|author_id/);
	});
});
