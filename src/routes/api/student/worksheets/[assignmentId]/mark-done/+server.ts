/**
 * API Route: /api/student/worksheets/[assignmentId]/mark-done
 * ============================================================
 *
 * Student-only endpoint that lets a student declare a paper worksheet as done.
 * Mirrors the exercise `/api/exercises/[id]/complete` pattern (POST/DELETE toggle).
 *
 * AUTH: Student only (RLS does the heavy lifting via `can_access_assignment`)
 *
 * PARAMS:
 * - assignmentId: UUID of the worksheet_assignment
 *
 * BEHAVIOUR:
 * - POST   → upserts a `worksheet_instances` row with `submitted_at = NOW()`
 *            and `status = 'submitted'`. If no instance exists for this
 *            (worksheet, student) pair, a "ghost" instance is created with
 *            `variant_seed = 0` and `instance_data = {}` — paper-only worksheets
 *            never had an online instance generated, so we synthesise one.
 * - DELETE → clears `submitted_at` (and reverts `status` to `in_progress`
 *            if `accessed_at` is non-null, else `generated`). Idempotent: if
 *            there's no instance row, returns 200 with `{ instance: null }`.
 *
 * Both methods are idempotent.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * `worksheet_instances.submitted_at` and `accessed_at` exist in the DB
 * (migration `20250123000000_worksheets.sql`) but are missing from the
 * generated `database.ts`. We type the columns we select here locally.
 * Same workaround as `src/lib/server/student-inbox.ts:344`.
 */
interface InstanceLookupRow {
	id: string;
	variant_seed: number;
	accessed_at: string | null;
	submitted_at: string | null;
	status: string | null;
}

/** Shape of the response payload (POST + DELETE). */
interface InstanceResponse {
	instance: {
		id: string;
		status: string | null;
		submitted_at: string | null;
	} | null;
}

// Empty-body schema: client sends nothing meaningful but we still validate
// `request.json()` so we don't accept garbage payloads silently.
const emptyBodySchema = z.object({}).strict();

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Verify the student is authorised to act on this assignment.
 * Uses `can_access_assignment` (SECURITY DEFINER) which checks:
 *  - assignment exists, status = 'active', available_from passed
 *  - student is in an assigned class (via `worksheet_assignment_classes` or legacy `class_id`)
 *    OR individually assigned (via `worksheet_assignment_students`)
 *
 * Returns the worksheet_id on success, or throws 404 otherwise.
 */
async function authoriseAndGetWorksheetId(
	supabase: App.Locals['supabase'],
	assignmentId: string
): Promise<string> {
	const { data: canAccess } = await supabase.rpc('can_access_assignment', {
		p_assignment_id: assignmentId
	});

	if (!canAccess) {
		// Generic 404 — don't reveal whether the assignment exists or just that
		// the student isn't targeted (information disclosure protection).
		throw error(404, 'Devoir non trouve');
	}

	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('worksheet_id')
		.eq('id', assignmentId)
		.single();

	if (assignmentError || !assignment) {
		throw error(404, 'Devoir non trouve');
	}

	return assignment.worksheet_id;
}

/**
 * Look up an existing instance row, if any.
 */
async function findInstance(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	studentId: string
): Promise<InstanceLookupRow | null> {
	const { data, error: lookupError } = await supabase
		.from('worksheet_instances')
		.select('id, variant_seed, accessed_at, submitted_at, status')
		.eq('worksheet_id', worksheetId)
		.eq('student_id', studentId)
		.maybeSingle();

	if (lookupError) {
		console.error('[mark-done] Error looking up instance:', lookupError);
		throw error(500, 'Erreur lors de la recherche du devoir');
	}

	return (data as unknown as InstanceLookupRow | null) ?? null;
}

// ============================================================================
// POST — mark done
// ============================================================================

/**
 * POST /api/student/worksheets/[assignmentId]/mark-done
 *
 * Student declares "I did this worksheet on paper".
 * Idempotent: calling twice keeps the worksheet marked as done.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const assignmentId = validateUuidParam(params.assignmentId, 'assignmentId');
	const { user } = await requireRole(locals, 'student');

	// Validate the (likely empty) body. We're lenient about empty/missing JSON
	// so the client doesn't need to send anything, but anything with extra keys
	// is a 400 (defense-in-depth).
	const rawBody = await request.json().catch(() => ({}));
	const bodyValidation = emptyBodySchema.safeParse(rawBody);
	if (!bodyValidation.success) {
		throw error(400, 'Corps de la requete invalide');
	}

	const worksheetId = await authoriseAndGetWorksheetId(locals.supabase, assignmentId);
	const existing = await findInstance(locals.supabase, worksheetId, user.id);
	const nowIso = new Date().toISOString();

	if (existing) {
		// Real or ghost instance already there — just stamp submitted_at + status.
		const { data: updated, error: updateError } = await locals.supabase
			.from('worksheet_instances')
			.update({
				submitted_at: nowIso,
				status: 'submitted'
			})
			.eq('id', existing.id)
			.select('id, status, submitted_at')
			.single();

		if (updateError || !updated) {
			console.error('[mark-done] Failed to update instance:', updateError);
			throw error(500, 'Erreur lors de la mise a jour');
		}

		const updatedRow = updated as unknown as InstanceResponse['instance'];
		return json({ instance: updatedRow } satisfies InstanceResponse);
	}

	// No instance exists — paper-only worksheet. Create a "ghost" row whose
	// only purpose is to carry `submitted_at`. The schema requires
	// `variant_seed` (CHECK >= 0) and `instance_data` (NOT NULL DEFAULT '{}'),
	// hence the explicit values below.
	const { data: created, error: insertError } = await locals.supabase
		.from('worksheet_instances')
		.insert({
			worksheet_id: worksheetId,
			student_id: user.id,
			variant_seed: 0,
			instance_data: {},
			status: 'submitted',
			submitted_at: nowIso
		})
		.select('id, status, submitted_at')
		.single();

	if (insertError || !created) {
		// Unique-violation can race with a concurrent POST; recover by re-reading
		// the existing row and treating the call as a no-op success.
		if (insertError?.code === '23505') {
			const retry = await findInstance(locals.supabase, worksheetId, user.id);
			if (retry) {
				return json({
					instance: {
						id: retry.id,
						status: retry.status,
						submitted_at: retry.submitted_at
					}
				} satisfies InstanceResponse);
			}
		}

		console.error('[mark-done] Failed to create ghost instance:', insertError);
		throw error(500, 'Erreur lors du marquage comme fait');
	}

	const createdRow = created as unknown as InstanceResponse['instance'];
	return json({ instance: createdRow } satisfies InstanceResponse);
};

// ============================================================================
// DELETE — unmark
// ============================================================================

/**
 * DELETE /api/student/worksheets/[assignmentId]/mark-done
 *
 * Student changed their mind — clear `submitted_at` and revert `status`.
 * Idempotent: if no instance exists, returns 200 with `{ instance: null }`.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const assignmentId = validateUuidParam(params.assignmentId, 'assignmentId');
	const { user } = await requireRole(locals, 'student');

	const worksheetId = await authoriseAndGetWorksheetId(locals.supabase, assignmentId);
	const existing = await findInstance(locals.supabase, worksheetId, user.id);

	if (!existing) {
		// No row to update — idempotent no-op.
		return json({ instance: null } satisfies InstanceResponse);
	}

	// Pick a sensible status to revert to: if the student opened the worksheet
	// online at some point, keep `in_progress`; otherwise drop back to `generated`.
	const revertedStatus: string = existing.accessed_at ? 'in_progress' : 'generated';

	const { data: updated, error: updateError } = await locals.supabase
		.from('worksheet_instances')
		.update({
			submitted_at: null,
			status: revertedStatus
		})
		.eq('id', existing.id)
		.select('id, status, submitted_at')
		.single();

	if (updateError || !updated) {
		console.error('[mark-done] Failed to clear submitted_at:', updateError);
		throw error(500, 'Erreur lors du retrait de la marque');
	}

	const updatedRow = updated as unknown as InstanceResponse['instance'];
	return json({ instance: updatedRow } satisfies InstanceResponse);
};
