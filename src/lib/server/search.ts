/**
 * Global resource search — server side.
 *
 * Thin wrapper over the `search_resources` SQL function (migration
 * 20260908120000). Shared by `GET /api/search` and the teacher search page so
 * the two can never drift apart.
 *
 * The function is `SECURITY INVOKER` and reads the `resources` view, which is
 * `security_invoker = true`: results are already filtered by the caller's RLS.
 * Restricting the search to teachers and admins is a **product** decision
 * enforced at the route level, not the thing that keeps a student's data safe.
 *
 * @module server/search
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { isResourceKind, type ResourceKind } from '$lib/resources/kinds';

/**
 * One row of the `resources` view, as consumed by the app.
 *
 * The generated type widens every column to nullable — Postgres cannot promise
 * a `UNION ALL` view's nullability — but the view itself guarantees `kind`, `id`
 * and `title`. `normaliseRow` is where that guarantee is enforced once, so no
 * caller has to defend against a title that cannot occur.
 */
export interface ResourceSearchRow {
	kind: ResourceKind;
	id: string;
	/** Never empty: the view falls back to the slug, then to a placeholder. */
	title: string;
	subtitle: string | null;
	grades: string[] | null;
	status: string | null;
	is_public: boolean;
	owner_id: string | null;
	slug: string | null;
	updated_at: string | null;
}

/** Row shape as the generated types describe it: everything nullable. */
type RawResourceRow = Database['public']['Functions']['search_resources']['Returns'][number];

/**
 * Drop the rows the view cannot actually produce, and narrow the rest.
 *
 * A row without a `kind` or an `id` would be unusable downstream; rather than
 * spreading optional chaining through the UI, it is discarded here.
 */
function normaliseRow(row: RawResourceRow): ResourceSearchRow | null {
	if (!row.kind || !row.id || !isResourceKind(row.kind)) return null;

	return {
		kind: row.kind,
		id: row.id,
		title: row.title ?? '(sans titre)',
		subtitle: row.subtitle ?? null,
		grades: row.grades ?? null,
		status: row.status ?? null,
		is_public: row.is_public ?? false,
		owner_id: row.owner_id ?? null,
		slug: row.slug ?? null,
		updated_at: row.updated_at ?? null
	};
}

export interface SearchResourcesParams {
	/** Texte libre. Facultatif dès lors qu'au moins un tag est fourni. */
	query: string;
	kinds?: ResourceKind[];
	/** Noms de tags ; la comparaison se fait sur leur forme canonique. */
	tags?: string[];
	limit?: number;
}

/**
 * Search resources by title and metadata.
 *
 * @returns rows the caller is allowed to read, most relevant first
 * @throws never — a database failure is returned as an empty list plus the error
 */
export async function searchResources(
	supabase: SupabaseClient<Database>,
	{ query, kinds, tags, limit = 20 }: SearchResourcesParams
): Promise<{ rows: ResourceSearchRow[]; error: string | null }> {
	const { data, error } = await supabase.rpc('search_resources', {
		p_query: query,
		// `undefined` et non `null` : les types générés décrivent ces paramètres
		// comme optionnels (ils ont une valeur par défaut SQL). Omettre la clé
		// laisse Postgres appliquer son `default null` — même résultat, typage juste.
		p_kinds: kinds && kinds.length > 0 ? kinds : undefined,
		p_tags: tags && tags.length > 0 ? tags : undefined,
		p_limit: limit
	});

	if (error) {
		console.error('[search] search_resources failed:', error);
		return { rows: [], error: 'Échec de la recherche' };
	}

	return {
		rows: (data ?? []).map(normaliseRow).filter((row): row is ResourceSearchRow => row !== null),
		error: null
	};
}
