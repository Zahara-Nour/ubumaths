/**
 * Tag-resolution helpers for exercises (math + Python).
 *
 * After the tag-normalization migration (20260509094828), the source of truth
 * for an exercise's tags is the junction table (exercise_tags / python_exercise_tags),
 * not a `tags TEXT[]` column. The API still exposes `tags: string[]` for
 * backward compatibility, so these helpers handle the names ↔ ids translation
 * + auto-create on save.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type SB = SupabaseClient<Database>;

type CatalogTable = 'tags' | 'python_tags';
type JunctionTable = 'exercise_tags' | 'python_exercise_tags';

/**
 * Find or create catalog rows for the given tag names. Returns the resolved
 * ids in the same order as the input (with duplicates removed).
 *
 * Auto-create: any name not yet in the catalog is inserted, preserving the
 * "save without curating tags first" UX of the previous design.
 */
export async function resolveTagsToIds(
	supabase: SB,
	names: string[],
	tagsTable: CatalogTable
): Promise<string[]> {
	const unique = [...new Set(names.filter((n) => n.trim().length > 0))];
	if (unique.length === 0) return [];

	// 1. Lookup existing
	const { data: existing, error: lookupErr } = await supabase
		.from(tagsTable)
		.select('id, name')
		.in('name', unique);

	if (lookupErr) {
		console.error(`tags-resolution: failed to look up names in ${tagsTable}:`, lookupErr);
		throw lookupErr;
	}

	const idByName = new Map<string, string>(
		(existing ?? []).map((row) => [row.name as string, row.id as string])
	);

	// 2. Insert missing
	const missing = unique.filter((n) => !idByName.has(n));
	if (missing.length > 0) {
		const { data: created, error: insertErr } = await supabase
			.from(tagsTable)
			.insert(missing.map((name) => ({ name })))
			.select('id, name');

		if (insertErr) {
			// Race condition possible: a concurrent insert may have created the row
			// between our SELECT and INSERT. Retry the lookup once.
			const { data: refreshed } = await supabase
				.from(tagsTable)
				.select('id, name')
				.in('name', missing);
			for (const row of refreshed ?? []) {
				idByName.set(row.name as string, row.id as string);
			}
		} else {
			for (const row of created ?? []) {
				idByName.set(row.name as string, row.id as string);
			}
		}
	}

	return unique.map((n) => idByName.get(n)).filter((id): id is string => Boolean(id));
}

/**
 * Replace the junction rows for an exercise with the given tag ids.
 *
 * Synchronises the set: deletes rows whose tag_id is not in the new set, then
 * inserts the new ones (ON CONFLICT DO NOTHING handles already-present pairs).
 */
export async function syncExerciseTagJunction(
	supabase: SB,
	exerciseId: string,
	tagIds: string[],
	junctionTable: JunctionTable
): Promise<void> {
	if (tagIds.length === 0) {
		// Empty set: just delete any existing rows for this exercise
		const { error: delErr } = await supabase
			.from(junctionTable)
			.delete()
			.eq('exercise_id', exerciseId);
		if (delErr) {
			console.error(`tags-resolution: failed to clear ${junctionTable}:`, delErr);
			throw delErr;
		}
		return;
	}

	// 1. Delete junction rows whose tag_id is no longer in the desired set
	const { error: delErr } = await supabase
		.from(junctionTable)
		.delete()
		.eq('exercise_id', exerciseId)
		.not('tag_id', 'in', `(${tagIds.join(',')})`);

	if (delErr) {
		console.error(`tags-resolution: failed to delete stale ${junctionTable} rows:`, delErr);
		throw delErr;
	}

	// 2. Insert the desired set (existing pairs are ignored by ON CONFLICT DO NOTHING).
	// We don't have a way to specify ON CONFLICT in the JS client; instead we use
	// upsert with ignoreDuplicates, which generates ON CONFLICT DO NOTHING.
	const { error: insertErr } = await supabase.from(junctionTable).upsert(
		tagIds.map((tag_id) => ({ exercise_id: exerciseId, tag_id })),
		{ onConflict: 'exercise_id,tag_id', ignoreDuplicates: true }
	);

	if (insertErr) {
		console.error(`tags-resolution: failed to insert ${junctionTable}:`, insertErr);
		throw insertErr;
	}
}

/**
 * Read the tag names attached to an exercise via the junction.
 */
export async function fetchTagNamesForExercise(
	supabase: SB,
	exerciseId: string,
	junctionTable: JunctionTable,
	tagsTable: CatalogTable
): Promise<string[]> {
	// Use Supabase's nested-relation syntax. The FK on tag_id makes the join
	// implicit: select the joined row's `name`.
	const { data, error } = await supabase
		.from(junctionTable)
		.select(`${tagsTable}(name)`)
		.eq('exercise_id', exerciseId);

	if (error) {
		console.error(`tags-resolution: failed to fetch tags for exercise:`, error);
		throw error;
	}

	const names: string[] = [];
	for (const row of data ?? []) {
		// Supabase nested syntax returns either an object or an array depending on
		// the relation. With a many-to-one (junction.tag_id → tags.id) it's an
		// object. Be defensive in case the typing surprises us.
		const tag = (row as Record<string, unknown>)[tagsTable];
		if (tag && typeof tag === 'object' && 'name' in tag) {
			names.push((tag as { name: string }).name);
		}
	}
	return names.sort();
}

/**
 * Find exercise ids whose junction matches ANY of the given tag names.
 *
 * Replaces the previous `query.overlaps('tags', names)` and `query.contains('tags', names)`
 * call sites. Note: this returns IDs that have at least one of the names (the
 * "overlaps" semantics, which both math and Python lists used).
 */
export async function fetchExerciseIdsByAnyTag(
	supabase: SB,
	names: string[],
	junctionTable: JunctionTable,
	tagsTable: CatalogTable
): Promise<string[]> {
	if (names.length === 0) return [];

	// Resolve names to ids first (skip auto-create here — we don't want a list
	// filter to silently spawn catalog rows).
	const { data: tagRows, error: tagsErr } = await supabase
		.from(tagsTable)
		.select('id')
		.in('name', names);

	if (tagsErr) {
		console.error(`tags-resolution: failed to look up filter tags:`, tagsErr);
		throw tagsErr;
	}

	const tagIds = (tagRows ?? []).map((r) => r.id as string);
	if (tagIds.length === 0) return [];

	const { data: junctionRows, error: jErr } = await supabase
		.from(junctionTable)
		.select('exercise_id')
		.in('tag_id', tagIds);

	if (jErr) {
		console.error(`tags-resolution: failed to query junction for filter:`, jErr);
		throw jErr;
	}

	// Deduplicate exercise_ids
	return [...new Set((junctionRows ?? []).map((r) => r.exercise_id as string))];
}
