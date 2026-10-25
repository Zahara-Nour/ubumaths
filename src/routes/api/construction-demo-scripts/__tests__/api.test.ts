/**
 * Scripts de démo des constructions : réservés au prof (décision de David du 2026-10-23,
 * l'admin retiré le 2026-10-25), suppression vérifiée (un refus RLS rend zéro ligne, sans erreur) et
 * messages de la base gardés côté serveur. La RLS tient la même règle
 * (tests/integration/construction-demo-scripts-reserves.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { GET, POST, DELETE } from '../+server';

// ============================================================================
// CONSTANTES
// ============================================================================

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SCRIPT_ID = '22222222-2222-4222-8222-222222222222';
const DB_MESSAGE = 'duplicate key value violates unique constraint "idx_demo_scripts_author_name"';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Faux `locals` : session et profil du rôle donné ; toute requête sur une autre table
 * que `profiles` est notée. `rows` : lignes rendues (vide = refus RLS silencieux) ;
 * `dbError` : la base répond en erreur.
 */
function fakeLocals(
	role: 'student' | 'teacher' | 'admin',
	{ rows = [{ id: SCRIPT_ID }], dbError = false }: { rows?: unknown[]; dbError?: boolean } = {}
) {
	const tablesTouched: string[] = [];
	const error = dbError ? { message: DB_MESSAGE, code: '23505' } : null;
	const data = dbError ? null : rows;
	// Requête awaitable (une promesse) qui renvoie elle-même à chaque maillon.
	const chain = Object.assign(Promise.resolve({ data, error }), {
		single: async () => ({ data: dbError ? null : rows[0], error })
	});
	for (const method of ['select', 'upsert', 'delete', 'eq', 'order']) {
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

function postRequest(): Request {
	return new Request('http://localhost/api/construction-demo-scripts', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'zz', dsl_script: 'A = point(0, 0)' })
	});
}

function deleteUrl(): URL {
	return new URL(`http://localhost/api/construction-demo-scripts?id=${SCRIPT_ID}`);
}

/** Statut et message rendus par un handler, qu'il réponde ou qu'il lève. */
async function outcomeOf(run: () => unknown): Promise<{ status: number; message: string }> {
	try {
		const result = await run();
		return { status: result instanceof Response ? result.status : 200, message: '' };
	} catch (thrown) {
		if (isHttpError(thrown)) return { status: thrown.status, message: thrown.body.message };
		throw thrown;
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('API scripts de démo : ni l’élève ni l’admin n’y ont accès', () => {
	const VERBES = [
		['GET', (locals: unknown) => GET({ locals } as never)],
		['POST', (locals: unknown) => POST({ locals, request: postRequest() } as never)],
		['DELETE', (locals: unknown) => DELETE({ locals, url: deleteUrl() } as never)]
	] as const;
	const CAS = (['student', 'admin'] as const).flatMap((role) =>
		VERBES.map(([verbe, run]) => [verbe, role, run] as const)
	);

	it.each(CAS)('%s par %s → 403, table non touchée', async (_verbe, role, run) => {
		const { locals, tablesTouched } = fakeLocals(role);
		const { status } = await outcomeOf(() => run(locals));
		expect(status).toBe(403);
		expect(tablesTouched).toEqual([]);
	});

	it('prof : GET, POST et DELETE passent', async () => {
		const { locals, tablesTouched } = fakeLocals('teacher');
		expect((await outcomeOf(() => GET({ locals } as never))).status).toBe(200);
		expect((await outcomeOf(() => POST({ locals, request: postRequest() } as never))).status).toBe(
			201
		);
		expect((await outcomeOf(() => DELETE({ locals, url: deleteUrl() } as never))).status).toBe(200);
		expect(tablesTouched).toEqual([
			'construction_demo_scripts',
			'construction_demo_scripts',
			'construction_demo_scripts'
		]);
	});
});

describe('API scripts de démo : suppression vérifiée', () => {
	it('id étranger ou inconnu (zéro ligne supprimée) → 404', async () => {
		const { locals } = fakeLocals('teacher', { rows: [] });
		const { status, message } = await outcomeOf(() =>
			DELETE({ locals, url: deleteUrl() } as never)
		);
		expect(status).toBe(404);
		expect(message).toBe('Script introuvable');
	});
});

describe('API scripts de démo : le message de la base ne sort pas', () => {
	it.each([
		['GET', (locals: unknown) => GET({ locals } as never)],
		['POST', (locals: unknown) => POST({ locals, request: postRequest() } as never)],
		['DELETE', (locals: unknown) => DELETE({ locals, url: deleteUrl() } as never)]
	])('%s en erreur → 500 en français, sans le texte de Postgres', async (_verb, run) => {
		const { locals } = fakeLocals('teacher', { dbError: true });
		const { status, message } = await outcomeOf(() => run(locals));
		expect(status).toBe(500);
		expect(message).toMatch(/^Impossible d/);
		expect(message).not.toContain('constraint');
	});
});
