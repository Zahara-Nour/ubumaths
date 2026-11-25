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
import type { Database } from '#lib/types/database.ts';

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
	/** Filtres `.eq(colonne, valeur)` posés, par table */
	eqs: Array<{ table: string; column: string; value: unknown }>;
	/** Colonnes demandées à chaque `.select()`, par table (avant ou après écriture) */
	selects: Array<{ table: string; columns: string }>;
}

/**
 * Tables lues par toutes les routes de la copie mais sans objet pour la
 * plupart des tests : réponse neutre si le test n'en déclare pas d'autre.
 * Notions de la fiche (ADR 0041) : aucune.
 */
const NEUTRAL_RESPONSES: Record<string, TableResponse> = {
	worksheet_classifications: { data: [], error: null }
};

export function tableMock(
	responses: Record<string, TableResponse>,
	rpc: Record<string, TableResponse> = {}
): TableMock {
	const tablesRead: string[] = [];
	const writes: TableMock['writes'] = [];
	const rpcCalls: string[] = [];
	const selects: TableMock['selects'] = [];
	const eqs: TableMock['eqs'] = [];

	function chain(table: string) {
		const response = (): TableResponse =>
			responses[table] ??
			NEUTRAL_RESPONSES[table] ?? { data: null, error: { message: `table inattendue : ${table}` } };
		const query: Record<string, unknown> = {};
		for (const method of ['in', 'order', 'limit', 'neq', 'is', 'delete', 'range']) {
			query[method] = () => query;
		}
		query.eq = (column: string, value: unknown) => {
			eqs.push({ table, column, value });
			return query;
		};
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

	return { client, tablesRead, writes, rpcCalls, eqs, selects };
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

/**
 * Ligne de fiche de la forme réelle (ADR 0044) : l'exercice ne porte que son identité, le
 * contenu (`variations`, `shared`, `generic_functions`) vient de `version`, la version de la ligne.
 * `exercise` est donné sous l'ancienne forme (identité + contenu) : le contenu en est retiré.
 * `stale` pose sur `exercise` un contenu périmé (l'ancienne colonne de la ligne `exercises`) :
 * ce qui sort de la route doit venir de `version`, jamais de lui.
 */
export function versionedLine<L extends object>(
	line: L,
	exercise: {
		shared?: unknown;
		variations?: unknown;
		generic_functions?: unknown;
		[key: string]: unknown;
	},
	stale?: { variations?: unknown; shared?: unknown; generic_functions?: unknown }
) {
	const { shared, variations, generic_functions, ...identity } = exercise;
	return {
		...line,
		exercise: { ...identity, ...stale },
		version: {
			id: `version-${String(identity.id ?? 'x')}`,
			number: 1,
			shared: shared ?? null,
			variations: variations ?? null,
			generic_functions: generic_functions ?? null
		}
	};
}

/**
 * Les lignes d'une fiche lues par jointure (`worksheet_exercises(... exercise, version ...)`),
 * données sous l'ancienne forme (contenu sur `exercise`) : chacune est mise à la forme réelle
 * (voir `versionedLine`). Une ligne sans exercice (orphelin) reste sans exercice ni version.
 */
export function versionedLines<L extends { exercise?: object | null }>(
	lines: readonly L[],
	stale?: { variations?: unknown; shared?: unknown; generic_functions?: unknown }
) {
	return lines.map((line) => {
		const { exercise, ...rest } = line;
		if (!exercise) return { ...rest, exercise: null, version: null };
		return versionedLine(rest, exercise, stale);
	});
}

/** Les colonnes du premier `.select()` lu sur une table */
export function selectedColumns(mock: TableMock, table: string): string {
	return mock.selects.find((s) => s.table === table)?.columns ?? '';
}
