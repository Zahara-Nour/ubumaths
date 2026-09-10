/**
 * Coverage reconciliation — materializes the AUTO curriculum coverage of a
 * cahier de texte entry from everything it designates.
 *
 * Two sources, unioned: the entry's tagged **activities**, and the resources
 * **cited in its content** (`[[exercise:…]]`, `[[worksheet_exercise:…]]`, …).
 * Asking the teacher for the same information twice — once in the text, once in
 * a card — is exactly the friction that leaves the tracking empty.
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
 * Called on EVERY save of an entry, and whenever an activity is added to /
 * removed from it. Gating it on activities alone would leave a text-only session
 * without its coverage, and would never drop a point whose citation was deleted.
 */

import { extractResourceReferences, referenceIdsOfKind } from '$lib/resources/references';
import { parseExerciseSelection } from '$lib/resources/exercise-selection';
import { resolveExercisesAtDisplayNumbers } from '$lib/server/worksheets/display-number';

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

export interface ReconcileReport {
	/**
	 * Numéros d'exercices cités mais absents de leur fiche.
	 *
	 * Remontés plutôt qu'ignorés : `#7` sur une fiche de six exercices est une
	 * faute de frappe, et le professeur doit l'apprendre en enregistrant, pas en
	 * constatant plus tard qu'un point manque.
	 */
	numerosIntrouvables: { worksheetId: string; numeros: number[] }[];
}

export async function reconcileAutoCoverage(
	supabase: Sb,
	entryId: string
): Promise<ReconcileReport> {
	// 1. what this entry's tagged activities point at
	const { data: acts, error: actErr } = await supabase
		.from('journal_entry_activities')
		.select('kind, exercise_id, question_template_id, assessment_id')
		.eq('entry_id', entryId)
		.in('kind', TAGGED_KINDS);
	if (actErr) throw new Error(`reconcileAutoCoverage activities: ${actErr.message}`);

	const activities = (acts ?? []) as ActivityRef[];
	const exerciseIds = new Set(refsOf(activities, 'exercise', 'exercise_id'));
	const templateIds = new Set(refsOf(activities, 'question', 'question_template_id'));
	const assessmentIds = new Set(refsOf(activities, 'assessment', 'assessment_id'));

	// 1bis. ce que le PROF A ÉCRIT dans la séance.
	//
	// Citer `[[exercise:…]]` dans le contenu vaut désigner l'activité : demander
	// la même information deux fois — une fois dans le texte, une fois dans une
	// carte — est la friction qui fait que le suivi n'est pas rempli.
	//
	// Une référence `[[…]]` n'est pas de la prose : c'est un jeton structuré
	// porteur d'un uuid. La retirer du texte est un geste aussi explicite que
	// décocher une case, et la réconciliation ci-dessous retire alors son point.
	const { data: entry, error: entryErr } = await supabase
		.from('class_journal_entries')
		.select('lesson_content, homework_content')
		.eq('id', entryId)
		.maybeSingle();
	if (entryErr) throw new Error(`reconcileAutoCoverage entry: ${entryErr.message}`);

	// Les travaux à faire vivent dans leur propre table depuis qu'une séance peut
	// en porter plusieurs. Les oublier ici ferait disparaître de la couverture
	// tout exercice cité UNIQUEMENT dans un devoir — sans rien signaler, puisque
	// la réconciliation retire ce qu'elle ne voit plus.
	const { data: travaux, error: travauxErr } = await supabase
		.from('journal_entry_homework')
		.select('content')
		.eq('entry_id', entryId);
	if (travauxErr) throw new Error(`reconcileAutoCoverage homework: ${travauxErr.message}`);

	const references = extractResourceReferences(
		entry?.lesson_content,
		entry?.homework_content,
		...(travaux ?? []).map((t) => t.content)
	);
	for (const id of referenceIdsOfKind(references, 'exercise')) exerciseIds.add(id);
	for (const id of referenceIdsOfKind(references, 'question')) templateIds.add(id);
	for (const id of referenceIdsOfKind(references, 'assessment')) assessmentIds.add(id);

	// Un exercice DE FICHE est cité par l'identifiant de la jonction : c'est ce
	// qui permet à l'élève de savoir quelle fiche ouvrir. Pour la couverture,
	// seul compte l'exercice qu'il désigne.
	// Une FICHE citée avec une sélection : `[[worksheet:<uuid>#3,5-7]]`.
	//
	// Sans sélection, elle n'apporte RIEN — et c'est voulu : rien ne dit lesquels
	// de ses exercices ont été faits. Avec une sélection, on résout les numéros
	// AFFICHÉS vers les exercices, puis leurs points.
	//
	// Les numéros introuvables sont remontés à l'appelant, qui les signale au
	// professeur : citer un exercice qui n'existe pas est une faute de frappe,
	// pas une intention.
	const numerosIntrouvables: { worksheetId: string; numeros: number[] }[] = [];
	for (const reference of references) {
		if (reference.kind !== 'worksheet') continue;

		const numeros = parseExerciseSelection(reference.selection);
		if (numeros.length === 0) continue;

		const resolue = await resolveExercisesAtDisplayNumbers(supabase, reference.id, numeros);
		for (const id of resolue.exerciseIds) exerciseIds.add(id);
		if (resolue.introuvables.length > 0) {
			numerosIntrouvables.push({ worksheetId: reference.id, numeros: resolue.introuvables });
		}
	}

	const worksheetExerciseIds = referenceIdsOfKind(references, 'worksheet_exercise');
	if (worksheetExerciseIds.length > 0) {
		const { data: linked, error: linkErr } = await supabase
			.from('worksheet_exercises')
			.select('exercise_id')
			.in('id', worksheetExerciseIds);
		if (linkErr) throw new Error(`reconcileAutoCoverage worksheet exercises: ${linkErr.message}`);
		for (const row of linked ?? []) exerciseIds.add(row.exercise_id);
	}

	// 2. desired auto points = union of the three sources' curriculum tags
	const desiredSet = new Set<string>();

	if (exerciseIds.size > 0) {
		const { data, error } = await supabase
			.from('exercise_curriculum_points')
			.select('point_id')
			.in('exercise_id', [...exerciseIds]);
		if (error) throw new Error(`reconcileAutoCoverage exercise tags: ${error.message}`);
		for (const t of (data ?? []) as { point_id: string }[]) desiredSet.add(t.point_id);
	}

	if (templateIds.size > 0) {
		const { data, error } = await supabase
			.from('question_template_points')
			.select('point_id')
			.in('template_id', [...templateIds]);
		if (error) throw new Error(`reconcileAutoCoverage question tags: ${error.message}`);
		for (const t of (data ?? []) as { point_id: string }[]) desiredSet.add(t.point_id);
	}

	if (assessmentIds.size > 0) {
		// An assessment names question *categories*, not templates, so the
		// resolution is a four-column join better left to the database.
		const { data, error } = await supabase.rpc('assessment_curriculum_points', {
			p_assessment_ids: [...assessmentIds]
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

	return { numerosIntrouvables };
}
