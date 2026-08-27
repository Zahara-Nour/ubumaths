/**
 * Server-side re-check of Python exercise submissions (Phase 1b).
 *
 * The client computes the verdict in Pyodide (in the student's browser) and the
 * submit endpoint trusts it. This module replays the submission in a **trusted**
 * Pyodide instance loaded in Node — the same engine (v0.26.2) and the same
 * validation core as the client, so an honest submission yields an identical
 * verdict. A forged `valid: true` is caught and flagged for the teacher.
 *
 * The verdict lives in a dedicated table `python_submission_server_verdicts`
 * (teacher/service_role only via RLS) — never in `python_exercise_submissions`,
 * so student reads of that table are untouched. This module NEVER mutates mastery
 * or the submission's `is_correct`. See docs/wip/python-server-recheck-progress.md.
 *
 * Trust model: the service-role key lives in this function's environment, but
 * student code runs inside Pyodide/WASM with no bridge to `process.env`, so it
 * cannot read secrets.
 */

import { loadPyodide } from 'pyodide';
import { waitUntil } from '@vercel/functions';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { runExerciseValidation } from '$lib/shared/python/validation-core';
import { PYODIDE_CONFIG } from '$lib/shared/python';
import type {
	ExerciseValidationConfig,
	ExerciseValidationResult,
	PyodideInterface
} from '$lib/shared/python';
import type { Json } from '$lib/types/database';

/** Terminal verdict written to `python_submission_server_verdicts.verification_status`. */
type TerminalStatus = 'match' | 'mismatch' | 'indeterminate' | 'error';

// =============================================================================
// Pyodide singleton (kept warm across Fluid Compute invocations)
// =============================================================================

let pyodidePromise: Promise<PyodideInterface> | null = null;

/**
 * Lazily load a single Pyodide instance and reuse it. Under Vercel Fluid Compute,
 * the function instance is reused across invocations, so this amortizes the
 * ~1.8s cold-start init. `PYODIDE_INDEX_URL` can point at a local dist dir (tests
 * / bundled prod); default is the same CDN build the client uses.
 */
function getPyodide(): Promise<PyodideInterface> {
	if (!pyodidePromise) {
		const indexURL = process.env.PYODIDE_INDEX_URL || PYODIDE_CONFIG.CDN_URL;
		pyodidePromise = loadPyodide({ indexURL }).then((p) => p as unknown as PyodideInterface);
	}
	return pyodidePromise;
}

// Pyodide is single-threaded; serialize validations against the shared instance
// so concurrent re-checks can't interleave Python execution.
let chain: Promise<unknown> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
	const result = chain.then(fn, fn);
	chain = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

// =============================================================================
// Re-check
// =============================================================================

/**
 * Replay a single submission server-side and persist the verdict into
 * `python_submission_server_verdicts`. Idempotent: skips submissions already
 * verdicted (terminal status). Never throws — any failure is captured as
 * `verification_status = 'error'` (E1–E3): we never accuse a student on a
 * server-side execution problem or engine divergence.
 */
export async function recheckSubmission(submissionId: string): Promise<void> {
	const supabase = createServiceRoleClient();

	// Idempotency: a terminal verdict already exists → nothing to do.
	const { data: existing } = await supabase
		.from('python_submission_server_verdicts')
		.select('submission_id, verification_status')
		.eq('submission_id', submissionId)
		.maybeSingle();
	if (existing && existing.verification_status !== 'pending') return;

	const { data: submission, error: subErr } = await supabase
		.from('python_exercise_submissions')
		.select('id, code, exercise_id, is_correct, created_at')
		.eq('id', submissionId)
		.single();

	// Only mastery-granting submissions are re-checked.
	if (subErr || !submission || !submission.is_correct) return;

	// Mark the verdict 'pending' up front so the stale-sweep can surface this run
	// if it hangs or the function is torn down before completing (E2).
	if (!existing) {
		await supabase.from('python_submission_server_verdicts').upsert(
			{ submission_id: submissionId, verification_status: 'pending' },
			{
				onConflict: 'submission_id',
				ignoreDuplicates: true
			}
		);
	}

	try {
		const { data: exercise, error: exErr } = await supabase
			.from('python_exercises')
			.select('validation_config, updated_at')
			.eq('id', submission.exercise_id)
			.single();

		if (exErr || !exercise) {
			await writeVerdict(supabase, submissionId, 'error', null, {
				error: 'Exercice introuvable au moment du re-check'
			});
			return;
		}

		// L4: the exercise was edited after the submission → its validation config
		// may no longer match what the student was graded against. Don't accuse.
		if (new Date(exercise.updated_at).getTime() > new Date(submission.created_at).getTime()) {
			await writeVerdict(supabase, submissionId, 'indeterminate', null, {
				reason: 'Exercice modifié après la soumission'
			});
			return;
		}

		const config = exercise.validation_config as ExerciseValidationConfig;
		const clientValid = submission.is_correct;

		const pyodide = await getPyodide();
		const r1 = await runExclusive(() => runExerciseValidation(pyodide, submission.code, config));

		// A top-level error means the server couldn't fairly evaluate (timeout,
		// runtime failure) — E1/E3: mark as error, never as a mismatch.
		if (r1.error) {
			await writeVerdict(supabase, submissionId, 'error', null, r1);
			return;
		}

		if (r1.valid === clientValid) {
			await writeVerdict(supabase, submissionId, 'match', r1.valid, r1);
			return;
		}

		// Server disagrees with the client. Re-run once to rule out non-determinism
		// (L2: random/time-dependent code) before flagging a mismatch.
		const r2 = await runExclusive(() => runExerciseValidation(pyodide, submission.code, config));
		if (r2.error) {
			await writeVerdict(supabase, submissionId, 'error', null, r2);
			return;
		}
		if (r2.valid !== r1.valid) {
			await writeVerdict(supabase, submissionId, 'indeterminate', null, {
				reason: 'Verdict serveur non déterministe (deux exécutions divergentes)',
				first: r1,
				second: r2
			});
			return;
		}

		// Two consistent server runs that both disagree with the client verdict.
		await writeVerdict(supabase, submissionId, 'mismatch', r1.valid, r1);
	} catch (error) {
		await writeVerdict(supabase, submissionId, 'error', null, {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * Fire-and-forget trigger from the submit endpoint. Only mastery-granting
 * submissions (`is_correct`) are re-checked. Uses Vercel `waitUntil` so the
 * function instance stays alive until the re-check finishes, without blocking
 * the student's response. Outside a Vercel request context (local dev) the task
 * simply runs detached.
 *
 * Never throws: `recheckSubmission` swallows its own errors, and the `.catch`
 * here is a final backstop so an unhandled rejection can't crash the submit path.
 */
export function scheduleRecheck(submissionId: string, isCorrect: boolean): void {
	if (!isCorrect) return;
	const task = recheckSubmission(submissionId).catch((e) => {
		console.error('[python-recheck] unhandled error', e);
	});
	try {
		waitUntil(task);
	} catch {
		// No Vercel context (local dev / tests): the task already runs detached.
		void task;
	}
}

/**
 * Persist the terminal server verdict. Runs as service-role (bypasses RLS on the
 * verdict table). Upserts so it works whether or not the 'pending' row exists.
 */
async function writeVerdict(
	supabase: ReturnType<typeof createServiceRoleClient>,
	submissionId: string,
	status: TerminalStatus,
	serverIsCorrect: boolean | null,
	serverValidationResult: ExerciseValidationResult | Record<string, unknown>
): Promise<void> {
	const { error } = await supabase.from('python_submission_server_verdicts').upsert(
		{
			submission_id: submissionId,
			verification_status: status,
			server_is_correct: serverIsCorrect,
			server_validation_result: serverValidationResult as unknown as Json,
			verified_at: new Date().toISOString()
		},
		{ onConflict: 'submission_id' }
	);

	if (error) {
		console.error(`[python-recheck] Failed to write verdict for ${submissionId}:`, error.message);
	}
}
