/**
 * API — Journal entry coverage (curriculum points worked on in an entry).
 *
 * GET    /api/teacher/curriculum/coverage?entry_id=<uuid>          — list covered points (+ source)
 * POST   /api/teacher/curriculum/coverage                          — manually check a point
 * DELETE /api/teacher/curriculum/coverage?entry_id=&point_id=      — uncheck a point (any source)
 *
 * Auto points are managed by reconciliation (see curriculum-coverage.ts); this
 * endpoint manages the teacher's manual checks/unchecks. Teacher/admin only.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	coveragePointSchema,
	coverageListQuerySchema,
	coveragePointQuerySchema
} from '$lib/server/validation/curriculum';
import { curriculumDbError } from '$lib/server/curriculum';
import type { JournalEntryPoint } from '$lib/types/database-helpers';

const COVERAGE_COLS = 'id, entry_id, point_id, source, created_at';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = coverageListQuerySchema.safeParse({ entry_id: url.searchParams.get('entry_id') });
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('journal_entry_points' as never)
		.select(COVERAGE_COLS)
		.eq('entry_id', parsed.data.entry_id);

	if (dbErr) {
		console.error('[curriculum] coverage GET failed:', dbErr);
		return json({ error: 'Échec du chargement de la couverture' }, { status: 500 });
	}

	return json({ coverage: (data ?? []) as JournalEntryPoint[] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = coveragePointSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('journal_entry_points' as never)
		.insert({
			entry_id: parsed.data.entry_id,
			point_id: parsed.data.point_id,
			source: 'manual'
		} as never)
		.select(COVERAGE_COLS)
		.single();

	if (dbErr) {
		// 23505 = point already covered for this entry. A manual check must WIN
		// over an existing auto row (otherwise the teacher's choice would be
		// dropped on the next reconcile). Promote the row to source='manual'.
		if (dbErr.code === '23505') {
			const { data: promoted, error: upErr } = await locals.supabase
				.from('journal_entry_points' as never)
				.update({ source: 'manual' } as never)
				.eq('entry_id', parsed.data.entry_id)
				.eq('point_id', parsed.data.point_id)
				.select(COVERAGE_COLS)
				.single();
			if (upErr) {
				console.error('[curriculum] coverage POST promote failed:', upErr);
				return json({ error: 'Erreur serveur' }, { status: 500 });
			}
			return json({ coverage: promoted as JournalEntryPoint, promoted: true });
		}
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] coverage POST failed:', dbErr);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}

	return json({ coverage: data as JournalEntryPoint }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = coveragePointQuerySchema.safeParse({
		entry_id: url.searchParams.get('entry_id'),
		point_id: url.searchParams.get('point_id')
	});
	if (!parsed.success) {
		return json({ error: 'entry_id et point_id requis (UUID)' }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase
		.from('journal_entry_points' as never)
		.delete()
		.eq('entry_id', parsed.data.entry_id)
		.eq('point_id', parsed.data.point_id);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] coverage DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true });
};
