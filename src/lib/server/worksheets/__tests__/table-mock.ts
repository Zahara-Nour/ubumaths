/**
 * Client Supabase factice, une réponse PAR TABLE
 * ==============================================
 *
 * Les routes de la copie (API élève, aperçu d'affectation, corrigé) lisent
 * cinq ou six tables à la suite ; un mock à chaîne unique les confondrait.
 * Chaque appel `from(table)` rend une chaîne dont tous les filtres se
 * renvoient eux-mêmes, et qui se résout (await, `single`, `maybeSingle`) sur
 * la réponse déclarée pour la table. Les tables lues sont notées dans
 * `tablesRead` : un test peut affirmer qu'une table n'est PLUS lue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export interface TableResponse {
	data: unknown;
	error: { code?: string; message: string } | null;
}

export interface TableMock {
	client: SupabaseClient<Database>;
	tablesRead: string[];
	/** Arguments de `.insert()` / `.update()`, par table */
	writes: Array<{ table: string; kind: 'insert' | 'update'; values: unknown }>;
	rpcCalls: string[];
}

export function tableMock(
	responses: Record<string, TableResponse>,
	rpc: Record<string, TableResponse> = {}
): TableMock {
	const tablesRead: string[] = [];
	const writes: TableMock['writes'] = [];
	const rpcCalls: string[] = [];

	function chain(table: string) {
		const response = (): TableResponse =>
			responses[table] ?? { data: null, error: { message: `table inattendue : ${table}` } };
		const query: Record<string, unknown> = {};
		for (const method of ['select', 'eq', 'in', 'order', 'limit', 'neq', 'is', 'delete']) {
			query[method] = () => query;
		}
		query.insert = (values: unknown) => {
			writes.push({ table, kind: 'insert', values });
			return query;
		};
		query.update = (values: unknown) => {
			writes.push({ table, kind: 'update', values });
			return query;
		};
		query.single = () => Promise.resolve(response());
		query.maybeSingle = () => Promise.resolve(response());
		query.then = (resolve: (value: TableResponse) => unknown, reject?: (e: unknown) => unknown) =>
			Promise.resolve(response()).then(resolve, reject);
		return query;
	}

	const client = {
		from: (table: string) => {
			tablesRead.push(table);
			return chain(table);
		},
		rpc: (name: string) => {
			rpcCalls.push(name);
			return Promise.resolve(rpc[name] ?? { data: null, error: { message: `rpc : ${name}` } });
		}
	} as unknown as SupabaseClient<Database>;

	return { client, tablesRead, writes, rpcCalls };
}

/** Exercice de la forme réelle : deux niveaux de guidage, une variable tirée */
export function twoLevelExercise(id = '550e8400-e29b-41d4-a716-4466554400e1') {
	return {
		id,
		title: 'Proportionnalité',
		variables: null,
		shared: {
			variables: [
				{ name: 'a', expression: '{{2..99}}' },
				{ name: 't', expression: '{{eval:3*{{a}}}}' }
			]
		},
		variations: [
			{
				label: 'guided',
				statement_md: 'Guidé : calcule {{a}} fois 3.',
				solution_md: 'Guidé : {{t}}'
			},
			{
				label: 'autonomous',
				statement_md: 'Autonome : triple de {{a}} ?',
				solution_md: 'Autonome : {{t}}'
			}
		],
		resources: null,
		generic_functions: null,
		tags: null
	};
}
