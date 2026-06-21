/**
 * API — Journal entry activities (cahier de texte).
 *
 * GET  /api/teacher/curriculum/activities?entry_id=<uuid>   — list activities of an entry
 * POST /api/teacher/curriculum/activities                   — add an activity (3 kinds)
 *
 * Adding an 'exercise' activity reconciles the entry's AUTO coverage from the
 * exercise's curriculum tags. Teacher/admin only.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createActivitySchema, activityListQuerySchema } from '$lib/server/validation/curriculum';
import { curriculumDbError } from '$lib/server/curriculum';
import { reconcileAutoCoverage } from '$lib/server/curriculum-coverage';
import type { JournalEntryActivity } from '$lib/types/database-helpers';

const ACTIVITY_COLS =
	'id, entry_id, kind, exercise_id, chapter_id, textbook_ref, label, display_order, created_at';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = activityListQuerySchema.safeParse({ entry_id: url.searchParams.get('entry_id') });
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('journal_entry_activities' as never)
		.select(ACTIVITY_COLS)
		.eq('entry_id', parsed.data.entry_id)
		.order('display_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (dbErr) {
		console.error('[curriculum] activities GET failed:', dbErr);
		return json({ error: 'Échec du chargement des activités' }, { status: 500 });
	}

	return json({ activities: (data ?? []) as JournalEntryActivity[] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = createActivitySchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}
	const input = parsed.data;

	// Build the insert row per kind (columns not relevant to the kind stay null).
	const row: Record<string, unknown> = {
		entry_id: input.entry_id,
		kind: input.kind,
		display_order: input.display_order ?? 0
	};
	if (input.kind === 'exercise') {
		row.exercise_id = input.exercise_id;
	} else if (input.kind === 'course') {
		row.chapter_id = input.chapter_id ?? null;
		row.label = input.label ?? null;
	} else {
		row.textbook_ref = input.textbook_ref;
		row.label = input.textbook_ref.label;
	}

	const { data, error: dbErr } = await locals.supabase
		.from('journal_entry_activities' as never)
		.insert(row as never)
		.select(ACTIVITY_COLS)
		.single();

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] activities POST failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	// Exercise activity → refresh auto coverage of the entry.
	if (input.kind === 'exercise') {
		try {
			await reconcileAutoCoverage(locals.supabase, input.entry_id);
		} catch (e) {
			console.error('[curriculum] reconcile after activity POST failed:', e);
			// activity is created; coverage will re-reconcile on next change.
		}
	}

	return json({ activity: data as JournalEntryActivity }, { status: 201 });
};
