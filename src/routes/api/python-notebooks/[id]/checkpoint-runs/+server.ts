/**
 * API Route: /api/python-notebooks/[id]/checkpoint-runs
 *
 * POST — UPSERT a checkpoint run for the authenticated user on the notebook.
 *        Only the latest run per (notebook_id, user_id, cell_id) is retained
 *        (DB PK + ON CONFLICT DO UPDATE).
 *
 * GET  — List the runs visible to the caller on this notebook (RLS handles
 *        the filtering: a student sees only their own runs, a teacher sees
 *        all runs on a notebook they authored OR have assigned).
 *
 * Authorization is delegated to the RLS policies on
 * `python_notebook_checkpoint_runs` (migration 20260603103958). The endpoint
 * only enforces "must be authenticated".
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upsertCheckpointRunSchema } from '$lib/server/validation/notebook-checkpoints';
import { validateUuidParam } from '$lib/server/validation/params';
import type { CheckpointRun, CheckpointRunStatus } from '$lib/types/database-helpers';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Narrowed API response shape: `status` is a DB CHECK-constrained TEXT
 * column that `Tables<>` types as `string` — at this layer we know it's
 * always 'passed' | 'failed' (the upsert payload is built from Zod).
 */
type CheckpointRunResponse = Omit<CheckpointRun, 'status'> & { status: CheckpointRunStatus };

/**
 * POST /api/python-notebooks/[id]/checkpoint-runs
 *
 * Body: `{ cell_id, status, error_message? }`
 *
 * UPSERTs a row keyed by (notebook_id, user_id, cell_id). The previous run
 * for that triplet (if any) is overwritten — we keep only the latest result.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const notebookId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = upsertCheckpointRunSchema.safeParse(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${errorMsg}`);
	}

	const { cell_id, status, error_message } = validation.data;

	// UPSERT — the policy "Students can upsert own checkpoint runs" enforces:
	//   user_id = auth.uid()  AND  (notebook is_public OR assigned to student)
	// If RLS refuses, supabase returns null + a clear error.
	const { data: run, error: dbError } = await supabase
		.from('python_notebook_checkpoint_runs')
		.upsert(
			{
				notebook_id: notebookId,
				user_id: user.id,
				cell_id,
				status,
				error_message: error_message ?? null,
				ran_at: new Date().toISOString()
			},
			{ onConflict: 'notebook_id,user_id,cell_id' }
		)
		.select()
		.single();

	if (dbError) {
		// RLS rejection or constraint failure — surface a 403 (RLS) or 500.
		// SQLSTATE 42501 is the stable signal across Postgres versions; the
		// English error message ("row-level security policy") can change.
		if (dbError.code === '42501') {
			throw error(403, 'Accès refusé à ce notebook');
		}
		console.error('Failed to upsert checkpoint run:', dbError);
		throw error(500, 'Erreur lors de la sauvegarde du checkpoint');
	}

	if (!run) {
		// Belt-and-suspenders — upsert + single should always return a row on success.
		throw error(500, 'Erreur inattendue lors de la sauvegarde');
	}

	return json({ run: run as CheckpointRunResponse });
};

/**
 * GET /api/python-notebooks/[id]/checkpoint-runs
 *
 * Returns the list of runs visible to the caller on this notebook.
 *  - Student → their own runs only (RLS policy 1)
 *  - Teacher → all runs on the notebook they authored OR have assigned (policy 3)
 *  - Anon    → 401
 *
 * No body. Response: `{ runs: CheckpointRun[] }`.
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const notebookId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const { data: runs, error: dbError } = await supabase
		.from('python_notebook_checkpoint_runs')
		.select('*')
		.eq('notebook_id', notebookId)
		.order('ran_at', { ascending: false });

	if (dbError) {
		console.error('Failed to fetch checkpoint runs:', dbError);
		throw error(500, 'Erreur lors de la récupération des checkpoints');
	}

	return json({ runs: (runs ?? []) as CheckpointRunResponse[] });
};
