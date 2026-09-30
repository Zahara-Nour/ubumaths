/**
 * Faux client Supabase pour les tests des séries et évaluations.
 *
 * Chaque `.from(table)` crée une requête qui ENREGISTRE ses appels (méthode et
 * arguments) ; son résultat est rendu par `respond(table, calls)`, appelé au
 * moment où la requête est attendue (`await`, `.single()`, `.maybeSingle()`).
 * Un test peut donc décider du résultat selon ce qui a été demandé — et
 * vérifier ensuite ce qui a été demandé (`queries`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export interface Call {
	method: string;
	args: unknown[];
}

export interface RecordedQuery {
	table: string;
	calls: Call[];
}

export type Result = {
	data?: unknown;
	error?: { code?: string; message: string } | null;
	count?: number | null;
};

export type Responder = (table: string, calls: Call[]) => Result;

const CHAIN_METHODS = [
	'select',
	'insert',
	'update',
	'delete',
	'upsert',
	'eq',
	'neq',
	'in',
	'is',
	'not',
	'or',
	'order',
	'limit',
	'range'
];

export function createFakeSupabase(respond: Responder) {
	const queries: RecordedQuery[] = [];

	function from(table: string) {
		const query: RecordedQuery = { table, calls: [] };
		queries.push(query);
		const resolve = (terminal?: string): Promise<Result> => {
			if (terminal) query.calls.push({ method: terminal, args: [] });
			const result = respond(table, query.calls);
			return Promise.resolve({ data: null, error: null, count: null, ...result });
		};

		const chain: Record<string, unknown> = {};
		for (const method of CHAIN_METHODS) {
			chain[method] = (...args: unknown[]) => {
				query.calls.push({ method, args });
				return chain;
			};
		}
		chain.single = () => resolve('single');
		chain.maybeSingle = () => resolve('maybeSingle');
		chain.then = (onFulfilled: (value: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
			resolve().then(onFulfilled, onRejected);
		return chain;
	}

	return {
		client: { from } as unknown as SupabaseClient<Database>,
		queries,
		/** Requêtes faites sur une table */
		on(table: string): RecordedQuery[] {
			return queries.filter((q) => q.table === table);
		}
	};
}

/** La requête a-t-elle appelé `method` avec ces arguments ? */
export function called(query: RecordedQuery, method: string, ...args: unknown[]): boolean {
	return query.calls.some(
		(c) => c.method === method && JSON.stringify(c.args) === JSON.stringify(args)
	);
}

/** Méthodes appelées par la requête */
export function methods(query: RecordedQuery): string[] {
	return query.calls.map((c) => c.method);
}
