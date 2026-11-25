/**
 * GET|POST /api/cron/invitations-cours-particulier
 * ================================================
 * Décision 8 du chantier `invitation-cours-particulier` : une invitation de cours
 * particulier expirée, annulée ou utilisée est effacée 30 jours après sa fin
 * (`purgeEndedInvitations`, `src/lib/server/private-lessons/invitations.ts`).
 *
 * Appelée chaque nuit par le cron Vercel (GET, `vercel.json`) et à la demande depuis
 * `/dashboard/admin/cron` (POST). AUTH : `Bearer CRON_SECRET` seulement.
 * Journal : `background_job_runs` (job `private_lesson_invitations_purge`), avec les
 * nombres seulement — jamais un prénom ni une adresse.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCronAuth } from '#lib/server/auth/cron.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { purgeEndedInvitations } from '#lib/server/private-lessons/invitations.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/cron/invitations-cours-particulier/+server');

const JOB_NAME = 'private_lesson_invitations_purge';

const handler: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	const { data: runId, error: startError } = await serviceClient.rpc('start_job_run', {
		p_job_name: JOB_NAME
	});
	// Le journal sert à l'admin ; son absence ne doit pas empêcher la purge.
	if (startError) logger.error('[CRON] Journal de la tâche non ouvert :', startError);

	try {
		const report = await purgeEndedInvitations(serviceClient);
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'success',
				p_metadata: { ...report }
			});
		}
		return Response.json({ success: true, report });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Erreur inconnue';
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: message
			});
		}
		logger.error('[CRON] Purge des invitations de cours particulier :', err);
		throw error(500, 'Purge des invitations impossible');
	}
};

export const GET = handler;
export const POST = handler;
