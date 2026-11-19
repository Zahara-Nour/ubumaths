/**
 * POST /api/admin/anti-fraud/run
 *
 * Déclenche le job anti-fraud SRS. Admin uniquement.
 *
 * Body : RunJobOptions (optional). Vide = options par défaut.
 * Réponse : JobReport.
 *
 * Cf. spec TDD : docs/archive/wip/srs-anti-fraud-spec-tdd.md §B7
 */

import { error, type RequestHandler } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { runAntiFraudJob } from '#lib/server/anti-fraud/index.ts';
import { runJobOptionsSchema } from '#lib/server/validation/anti-fraud.ts';

export const POST: RequestHandler = async ({ locals, request }) => {
	// ✅ SECURITY: admin elevation OR real admin login. Privileged ops run via the
	// returned admin-context client so RLS attributes them to the admin.
	const { supabase } = await requireAdmin(locals);

	// Body optionnel : si absent ou vide, on accepte.
	let bodyJson: unknown = {};
	const text = await request.text();
	if (text.trim().length > 0) {
		try {
			bodyJson = JSON.parse(text);
		} catch {
			throw error(400, 'Corps de requête illisible');
		}
	}

	const parsed = runJobOptionsSchema.safeParse(bodyJson);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	const report = await runAntiFraudJob(supabase, parsed.data);
	return Response.json(report);
};
