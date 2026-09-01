/**
 * Coverage reconciliation — materializes the AUTO curriculum coverage of a
 * cahier de texte entry from its tagged activities.
 *
 * Idempotent set-reconcile: the desired auto set = union of the curriculum
 * points tagged on everything the entry references — exercises, questions, and
 * the questions an assessment designates. We delete stale `source='auto'` rows
 * and insert missing ones, never touching `source='manual'` rows (the teacher's
 * explicit choices).
 *
 * Deliberately recomputed rather than frozen: tagging happens after the fact,
 * so a session recorded in September must light up when its content is tagged
 * in June. Fidelity to what was actually done is the manual layer's job, and
 * the manual layer is never overwritten here.
 *
 * Called after any such activity is added to / removed from an entry.
 */

type Sb = App.Locals['supabase'];

/** The activity kinds that carry curriculum tags. */
const TAGGED_KINDS = ['exercise', 'question', 'assessment'];

interface ActivityRef {
	kind: string;
	exercise_id: string | null;
	question_template_id: string | null;
	assessment_id: string | null;
}

/** Distinct non-null references of one kind. */
function refsOf(rows: ActivityRef[], kind: string, column: keyof ActivityRef): string[] {
	return [
		...new Set(
			rows
				.filter((r) => r.kind === kind)
				.map((r) => r[column])
				.filter((id): id is string => id !== null)
		)
	];
}

export async function reconcileAutoCoverage(supabase: Sb, entryId: string): Promise<void> {
	// 1. what this entry's tagged activities point at
	const { data: acts, error: actErr } = await supabase
		.from('journal_entry_activities')
		.select('kind, exercise_id, question_template_id, assessment_id')
		.eq('entry_id', entryId)
		.in('kind', TAGGED_KINDS);
	if (actErr) throw new Error(`reconcileAutoCoverage activities: ${actErr.message}`);

	const activities = (acts ?? []) as ActivityRef[];
	const exerciseIds = refsOf(activities, 'exercise', 'exercise_id');
	const templateIds = refsOf(activities, 'question', 'question_template_id');
	const assessmentIds = refsOf(activities, 'assessment', 'assessment_id');

	// 2. desired auto points = union of the three sources' curriculum tags
	const desiredSet = new Set<string>();

	if (exerciseIds.length > 0) {
		const { data, error } = await supabase
			.from('exercise_curriculum_points')
			.select('point_id')
			.in('exercise_id', exerciseIds);
		if (error) throw new Error(`reconcileAutoCoverage exercise tags: ${error.message}`);
		for (const t of (data ?? []) as { point_id: string }[]) desiredSet.add(t.point_id);
	}

	if (templateIds.length > 0) {
		const { data, error } = await supabase
			.from('question_template_points')
			.select('point_id')
			.in('template_id', templateIds);
		if (error) throw new Error(`reconcileAutoCoverage question tags: ${error.message}`);
		for (const t of (data ?? []) as { point_id: string }[]) desiredSet.add(t.point_id);
	}

	if (assessmentIds.length > 0) {
		// An assessment names question *categories*, not templates, so the
		// resolution is a four-column join better left to the database.
		const { data, error } = await supabase.rpc('assessment_curriculum_points', {
			p_assessment_ids: assessmentIds
		});
		if (error) throw new Error(`reconcileAutoCoverage assessment tags: ${error.message}`);
		for (const t of (data ?? []) as { point_id: string }[]) desiredSet.add(t.point_id);
	}

	const desired = [...desiredSet];

	// 3. existing coverage rows for the entry
	const { data: existing, error: exErr } = await supabase
		.from('journal_entry_points')
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
			.from('journal_entry_points')
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
			.from('journal_entry_points')
			.upsert(toInsert, { onConflict: 'entry_id,point_id', ignoreDuplicates: true });
		if (error) throw new Error(`reconcileAutoCoverage insert: ${error.message}`);
	}
}
