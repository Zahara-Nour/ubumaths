/**
 * Unified tag junction — the single source of truth.
 *
 * `resource_tags` (migration 20260908130000) replaces three shapes that used to
 * coexist: `exercise_tags`, `python_exercise_tags`, and the free-form
 * `tags text[]` columns of constructions, worksheets and parody evaluations.
 *
 * Since this module became the source rather than a mirror, failures are NO
 * LONGER swallowed: a tag that fails to save must fail visibly, because it is
 * now the only place the tag exists. The previous silence was defensible while
 * nothing read the table; it would be data loss now.
 *
 * The old shapes still exist in the database — dropping them is a destructive
 * migration, handled separately — but nothing reads or writes them any more.
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

	const { data, error } = await supabase.rpc('resolve_tag_ids', { p_names: wanted });

	if (error) {
		console.error('[resource-tags] resolve_tag_ids failed', { message: error.message });
		return [];
	}

	return (data ?? []).map((row) => row.id);
}

/**
 * Replace a resource's tags with the given names.
 *
 * Synchronises the whole set: what is absent from `tagNames` is removed, what is
 * new is added. Names are resolved (and created if needed) against the shared
 * catalogue, on their canonical slug.
 *
 * @throws when the write fails — the caller must know, this is the only copy
 */
export async function syncResourceTags(
	supabase: SB,
	kind: TaggableKind,
	resourceId: string,
	tagNames: string[]
): Promise<void> {
	const tagIds = await resolveUnifiedTagIds(supabase, tagNames);

	const { error: delErr } = await supabase
		.from('resource_tags')
		.delete()
		.eq('resource_kind', kind)
		.eq('resource_id', resourceId);

	if (delErr) {
		console.error('[resource-tags] suppression impossible', {
			kind,
			resourceId,
			message: delErr.message
		});
		throw delErr;
	}

	if (tagIds.length === 0) return;

	const { error: upsertErr } = await supabase.from('resource_tags').upsert(
		tagIds.map((tag_id) => ({ resource_kind: kind, resource_id: resourceId, tag_id })),
		{ onConflict: 'resource_kind,resource_id,tag_id', ignoreDuplicates: true }
	);

	if (upsertErr) {
		console.error('[resource-tags] écriture impossible', {
			kind,
			resourceId,
			message: upsertErr.message
		});
		throw upsertErr;
	}
}

/**
 * The tag names attached to a resource, alphabetically.
 */
export async function fetchResourceTagNames(
	supabase: SB,
	kind: TaggableKind,
	resourceId: string
): Promise<string[]> {
	const { data, error } = await supabase
		.from('resource_tags')
		.select('tags(name)')
		.eq('resource_kind', kind)
		.eq('resource_id', resourceId);

	if (error) {
		console.error('[resource-tags] lecture impossible', {
			kind,
			resourceId,
			message: error.message
		});
		throw error;
	}

	const names: string[] = [];
	for (const row of data ?? []) {
		const tag = (row as { tags: { name: string } | null }).tags;
		if (tag?.name) names.push(tag.name);
	}
	return names.sort();
}

/**
 * Ids of the resources of a kind carrying AT LEAST ONE of the given tags.
 *
 * Deliberately does NOT create missing tags: a list filter must not silently
 * spawn catalogue rows.
 */
export async function fetchResourceIdsByAnyTag(
	supabase: SB,
	kind: TaggableKind,
	names: string[]
): Promise<string[]> {
	if (names.length === 0) return [];

	const { data: tagRows, error: tagsErr } = await supabase
		.from('tags')
		.select('id')
		.in('name', names);

	if (tagsErr) {
		console.error('[resource-tags] recherche de tags impossible', { message: tagsErr.message });
		throw tagsErr;
	}

	const tagIds = (tagRows ?? []).map((row) => row.id);
	if (tagIds.length === 0) return [];

	const { data: rows, error } = await supabase
		.from('resource_tags')
		.select('resource_id')
		.eq('resource_kind', kind)
		.in('tag_id', tagIds);

	if (error) {
		console.error('[resource-tags] filtrage par tag impossible', { kind, message: error.message });
		throw error;
	}

	return [...new Set((rows ?? []).map((row) => row.resource_id))];
}
