/**
 * Coverage reconciliation — materializes the AUTO curriculum coverage of a
 * cahier de texte entry from its tagged exercise activities.
 *
 * Idempotent set-reconcile: the desired auto set = union of the curriculum
 * points tagged on the exercises referenced by the entry's 'exercise'
 * activities. We delete stale `source='auto'` rows and insert missing ones,
 * never touching `source='manual'` rows (the teacher's explicit choices).
 *
 * Called after any exercise activity is added to / removed from an entry.
 */

type Sb = App.Locals['supabase'];

export async function reconcileAutoCoverage(supabase: Sb, entryId: string): Promise<void> {
	// 1. exercises referenced by this entry's 'exercise' activities
	const { data: acts, error: actErr } = await supabase
		.from('journal_entry_activities' as never)
		.select('exercise_id')
		.eq('entry_id', entryId)
		.eq('kind', 'exercise');
	if (actErr) throw new Error(`reconcileAutoCoverage activities: ${actErr.message}`);

	const exerciseIds = [
		...new Set(
			((acts ?? []) as { exercise_id: string | null }[])
				.map((a) => a.exercise_id)
				.filter((id): id is string => id !== null)
		)
	];

	// 2. desired auto points = union of those exercises' curriculum tags
	let desired: string[] = [];
	if (exerciseIds.length > 0) {
		const { data: tags, error: tagErr } = await supabase
			.from('exercise_curriculum_points' as never)
			.select('point_id')
			.in('exercise_id', exerciseIds);
		if (tagErr) throw new Error(`reconcileAutoCoverage tags: ${tagErr.message}`);
		desired = [...new Set(((tags ?? []) as { point_id: string }[]).map((t) => t.point_id))];
	}

	// 3. existing coverage rows for the entry
	const { data: existing, error: exErr } = await supabase
		.from('journal_entry_points' as never)
		.select('point_id, source')
		.eq('entry_id', entryId);
	if (exErr) throw new Error(`reconcileAutoCoverage existing: ${exErr.message}`);

	const rows = (existing ?? []) as { point_id: string; source: string }[];
	const existingPoints = new Set(rows.map((r) => r.point_id));

	// 4. delete stale auto rows (source='auto' and no longer desired)
	const staleAuto = rows
		.filter((r) => r.source === 'auto' && !desired.includes(r.point_id))
		.map((r) => r.point_id);
	if (staleAuto.length > 0) {
		const { error } = await supabase
			.from('journal_entry_points' as never)
			.delete()
			.eq('entry_id', entryId)
			.eq('source', 'auto')
			.in('point_id', staleAuto);
		if (error) throw new Error(`reconcileAutoCoverage delete: ${error.message}`);
	}

	// 5. insert missing desired auto rows (no row at all yet — manual rows win)
	const toInsert = desired
		.filter((pid) => !existingPoints.has(pid))
		.map((pid) => ({ entry_id: entryId, point_id: pid, source: 'auto' }));
	if (toInsert.length > 0) {
		const { error } = await supabase
			.from('journal_entry_points' as never)
			.upsert(toInsert as never, { onConflict: 'entry_id,point_id', ignoreDuplicates: true });
		if (error) throw new Error(`reconcileAutoCoverage insert: ${error.message}`);
	}
}
