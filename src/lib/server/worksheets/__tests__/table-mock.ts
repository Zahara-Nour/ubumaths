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
	/** Pour `select(..., { count: 'exact', head: true })` */
	count?: number | null;
	/**
	 * Réponse propre à `single` / `maybeSingle`, quand une route lit la même
	 * table une ligne à la fois ET en liste (absente : la réponse commune).
	 */
	single?: TableResponse;
}

export interface TableMock {
	client: SupabaseClient<Database>;
	tablesRead: string[];
	/** Arguments de `.insert()` / `.update()` / `.upsert()`, par table */
	writes: Array<{ table: string; kind: 'insert' | 'update' | 'upsert'; values: unknown }>;
	rpcCalls: string[];
	/** Colonnes demandées à chaque `.select()`, par table (avant ou après écriture) */
	selects: Array<{ table: string; columns: string }>;
}

export function tableMock(
	responses: Record<string, TableResponse>,
	rpc: Record<string, TableResponse> = {}
): TableMock {
	const tablesRead: string[] = [];
	const writes: TableMock['writes'] = [];
	const rpcCalls: string[] = [];
	const selects: TableMock['selects'] = [];

	function chain(table: string) {
		const response = (): TableResponse =>
			responses[table] ?? { data: null, error: { message: `table inattendue : ${table}` } };
		const query: Record<string, unknown> = {};
		for (const method of ['eq', 'in', 'order', 'limit', 'neq', 'is', 'delete', 'range']) {
			query[method] = () => query;
		}
		query.select = (columns = '*') => {
			selects.push({ table, columns: String(columns) });
			return query;
		};
		query.insert = (values: unknown) => {
			writes.push({ table, kind: 'insert', values });
			return query;
		};
		query.update = (values: unknown) => {
			writes.push({ table, kind: 'update', values });
			return query;
		};
		query.upsert = (values: unknown) => {
			writes.push({ table, kind: 'upsert', values });
			return query;
		};
		const singleResponse = (): TableResponse => response().single ?? response();
		query.single = () => Promise.resolve(singleResponse());
		query.maybeSingle = () => Promise.resolve(singleResponse());
		// Thenable voulu : le constructeur de requêtes de Supabase s'attend avec `await`
		// oxlint-disable-next-line unicorn/no-thenable
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

	return { client, tablesRead, writes, rpcCalls, selects };
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

/** Les colonnes du premier `.select()` lu sur une table */
export function selectedColumns(mock: TableMock, table: string): string {
	return mock.selects.find((s) => s.table === table)?.columns ?? '';
}
