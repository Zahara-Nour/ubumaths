/**
 * POST /api/admin/anti-fraud/run
 *
 * Déclenche le job anti-fraud SRS. Admin uniquement.
 *
 * Body : RunJobOptions (optional). Vide = options par défaut.
 * Réponse : JobReport.
 *
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md §B7
 */

import { error, json, type RequestHandler } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { runAntiFraudJob } from '$lib/server/anti-fraud';
import { runJobOptionsSchema } from '$lib/server/validation/anti-fraud';

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireRole(locals, 'admin');

	// Body optionnel : si absent ou vide, on accepte.
	let bodyJson: unknown = {};
	const text = await request.text();
	if (text.trim().length > 0) {
		try {
			bodyJson = JSON.parse(text);
		} catch {
			throw error(400, 'Invalid JSON body');
		}
	}

	const parsed = runJobOptionsSchema.safeParse(bodyJson);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	const report = await runAntiFraudJob(locals.supabase, parsed.data);
	return json(report);
};
