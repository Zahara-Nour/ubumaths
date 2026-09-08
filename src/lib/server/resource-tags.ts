/**
 * Unified tag junction — mirror writes.
 *
 * Migration 20260908130000 introduced `resource_tags`, one polymorphic junction
 * meant to replace `exercise_tags`, `python_exercise_tags` and the free-form
 * `tags text[]` columns. That migration is deliberately additive: it copies, it
 * removes nothing, because dropping the old shapes is a destructive change that
 * needs an explicit decision.
 *
 * So both shapes coexist for now, and the old one stays the source of truth for
 * writes. This module keeps the new table roughly in step.
 *
 * ⚠️ ROUGHLY, and that word is load-bearing. The migration backfilled FIVE kinds
 * (exercise, python_exercise, construction, worksheet, parody_evaluation) but
 * only the first two are mirrored here — the `text[]` columns of constructions,
 * worksheets and parody evaluations are still written with no mirror at all. So
 * `resource_tags` starts drifting the moment one of those is created.
 *
 * The operational consequence, to be honoured and not assumed away: **the
 * destructive cleanup migration MUST re-run a full backfill and reconcile**,
 * never trust the mirror's state.
 *
 * A mirror failure is logged and swallowed on purpose: nothing reads
 * `resource_tags` yet, so breaking a teacher's save over it would be trading a
 * real feature for a bookkeeping detail.
 *
 * @module server/resource-tags
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ResourceKind } from '$lib/resources/kinds';

type SB = SupabaseClient<Database>;

/**
 * Kinds `resource_tags` accepts, beyond the five addressable resource kinds.
 * These have tags but no page of their own yet — they are taggable, not
 * addressable.
 */
export type TaggableKind =
	| ResourceKind
	| 'python_exercise'
	| 'construction'
	| 'worksheet'
	| 'parody_evaluation';

/**
 * `resource_tags` is not in the generated types until `pnpm db:types` runs
 * against a database carrying the migration. Narrow adapter rather than `any`.
 */
type ResourceTagRow = { resource_kind: string; resource_id: string; tag_id: string };
type ResolveTagsRpc = (
	fn: 'resolve_tag_ids',
	args: { p_names: string[] }
) => PromiseLike<{
	data: { id: string; name: string }[] | null;
	error: { message: string } | null;
}>;
type LooseTable = {
	delete: () => {
		eq: (
			c: string,
			v: string
		) => {
			eq: (c: string, v: string) => PromiseLike<{ error: { message: string } | null }>;
		};
	};
	upsert: (
		rows: ResourceTagRow[],
		options: { onConflict: string; ignoreDuplicates: boolean }
	) => PromiseLike<{ error: { message: string } | null }>;
};

const loose = (supabase: SB, table: string) =>
	(supabase as unknown as { from: (t: string) => LooseTable }).from(table);

/**
 * Resolve tag names against the unified `tags` catalogue, creating what is
 * missing.
 *
 * Delegated to the `resolve_tag_ids` SQL function rather than done here, because
 * uniqueness is enforced on the generated `slug` and the slug is only computable
 * in the database. Matching names client-side loses tags silently: a name whose
 * slug already exists under another spelling fails to insert, and a re-read by
 * `name` cannot find it — the row is stored under the other spelling.
 */
async function resolveUnifiedTagIds(supabase: SB, names: string[]): Promise<string[]> {
	const wanted = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
	if (wanted.length === 0) return [];

	const rpc = supabase.rpc as unknown as ResolveTagsRpc;
	const { data, error } = await rpc('resolve_tag_ids', { p_names: wanted });

	if (error) {
		console.error('[resource-tags] resolve_tag_ids failed', { message: error.message });
		return [];
	}

	return (data ?? []).map((row) => row.id);
}

/**
 * Mirror a resource's tags into `resource_tags`.
 *
 * Never throws: the caller's own write has already succeeded and must not be
 * rolled back because a mirror row failed.
 */
export async function mirrorResourceTags(
	supabase: SB,
	kind: TaggableKind,
	resourceId: string,
	tagNames: string[]
): Promise<void> {
	try {
		const tagIds = await resolveUnifiedTagIds(supabase, tagNames);

		const { error: delErr } = await loose(supabase, 'resource_tags')
			.delete()
			.eq('resource_kind', kind)
			.eq('resource_id', resourceId);

		if (delErr) {
			console.error('[resource-tags] mirror delete failed', {
				kind,
				resourceId,
				message: delErr.message
			});
			return;
		}

		if (tagIds.length === 0) return;

		const { error: upsertErr } = await loose(supabase, 'resource_tags').upsert(
			tagIds.map((tag_id) => ({ resource_kind: kind, resource_id: resourceId, tag_id })),
			{ onConflict: 'resource_kind,resource_id,tag_id', ignoreDuplicates: true }
		);

		if (upsertErr) {
			console.error('[resource-tags] mirror upsert failed', {
				kind,
				resourceId,
				message: upsertErr.message
			});
		}
	} catch (err) {
		console.error('[resource-tags] mirror failed', { kind, resourceId, err });
	}
}
