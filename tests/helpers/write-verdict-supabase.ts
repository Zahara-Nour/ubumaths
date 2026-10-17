/**
 * Faux client Supabase pour les tests « l'écriture rend-elle compte de ce
 * qu'elle a écrit ? ».
 * ======================================================================
 *
 * ⚠️ Une écriture refusée par la RLS ne rend pas d'erreur : elle rend zéro
 * ligne (cf. docs/pratiques/rls-echecs-silencieux.md). Ce faux client permet de
 * donner à chaque table :
 *   - `single` / `maybeSingle` : le résultat des lectures de contrôle ;
 *   - `awaited` : le résultat de la chaîne attendue telle quelle — ce que rend
 *     `await supabase.from(t).update(…).eq(…).select('id')`.
 *
 * Les fichiers retirés du stockage sont relevés dans `removedPaths`, pour
 * vérifier qu'une capture envoyée puis non rattachée ne reste pas orpheline.
 *
 * @module tests/helpers/write-verdict-supabase
 */

import { expect, vi } from 'vitest';

export interface FakeResult {
	data: unknown;
	error: unknown;
}

export interface FakeTable {
	single?: FakeResult;
	maybeSingle?: FakeResult;
	awaited?: FakeResult;
}

const EMPTY: FakeResult = { data: null, error: null };

const CHAIN_METHODS = [
	'select',
	'insert',
	'update',
	'delete',
	'eq',
	'in',
	'gte',
	'lte',
	'order',
	'limit',
	'contains'
] as const;

function createChain(table: FakeTable): Record<string, unknown> {
	const chain: Record<string, unknown> = {};
	for (const method of CHAIN_METHODS) {
		chain[method] = vi.fn(() => chain);
	}
	chain.single = vi.fn().mockResolvedValue(table.single ?? table.awaited ?? EMPTY);
	chain.maybeSingle = vi.fn().mockResolvedValue(table.maybeSingle ?? table.single ?? EMPTY);
	// Rend la chaîne « awaitable », comme le constructeur de requêtes réel.
	chain.then = (resolve: (value: FakeResult) => unknown, reject?: (reason: unknown) => unknown) =>
		Promise.resolve(table.awaited ?? EMPTY).then(resolve, reject);
	return chain;
}

/**
 * Un client dont chaque `from(table)` rend la chaîne prévue pour cette table,
 * et dont `rpc` rend `rpcResult`.
 */
export function createWriteVerdictSupabase(
	tables: Record<string, FakeTable>,
	rpcResult: FakeResult = EMPTY
) {
	const chains: Record<string, Record<string, unknown>> = {};
	for (const [name, table] of Object.entries(tables)) {
		chains[name] = createChain(table);
	}
	const removedPaths: string[][] = [];

	const bucket = {
		remove: vi.fn(async (paths: string[]) => {
			removedPaths.push(paths);
			return { data: [], error: null };
		}),
		upload: vi.fn(async (path: string) => ({ data: { path }, error: null })),
		createSignedUrl: vi.fn(async () => ({
			data: { signedUrl: 'https://example.test/signed' },
			error: null
		}))
	};

	const client = {
		from: vi.fn((name: string) => {
			const chain = chains[name];
			if (!chain) throw new Error(`Table inattendue dans le test : ${name}`);
			return chain;
		}),
		rpc: vi.fn().mockResolvedValue(rpcResult),
		storage: { from: vi.fn(() => bucket) }
	};

	return { client, chains, bucket, removedPaths };
}

/**
 * Attend une `HttpError` SvelteKit du statut donné. `HttpError` n'étend pas
 * `Error` : on compare la forme, pas la classe.
 */
export async function expectHttpStatus(run: () => unknown, status: number): Promise<void> {
	let thrown: unknown = null;
	try {
		await run();
	} catch (err) {
		thrown = err;
	}
	expect(thrown).toMatchObject({ status });
}
