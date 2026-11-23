/**
 * GET|POST /api/cron/carnet-de-liaison
 * ====================================
 * Le passage quotidien du carnet de liaison (ADR 0040) : effacement des adresses
 * orphelines et du journal des courriels de plus d'un an, liens manquants,
 * courriels d'exception, message trimestriel (`src/lib/server/carnet/courriels.ts`).
 *
 * Appelée chaque jour par le cron Vercel (GET, `vercel.json`, 16 h UTC : 17 h à
 * Paris l'hiver, 18 h l'été) et à la demande depuis `/dashboard/admin/cron`
 * (POST). AUTH : `Bearer CRON_SECRET` seulement. Client service : les adresses
 * des parents ne s'écrivent que par lui.
 * Journal : `background_job_runs` (job `carnet_de_liaison`), avec les nombres
 * d'envois seulement — jamais une adresse. Un passage en cours (moins de
 * 30 min) bloque le suivant : 409.
 */
import type { RequestHandler } from './$types';
import { verifyCronAuth } from '#lib/server/auth/cron.ts';
import { runCarnetDaily } from '#lib/server/carnet/courriels.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/cron/carnet-de-liaison');

const JOB_NAME = 'carnet_de_liaison';

/** Un passage plus vieux que ça est mort (délai de la fonction dépassé) : on n'attend plus. */
const RUNNING_WINDOW_MS = 30 * 60_000;

const handler: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();

	// Cron et bouton de l'admin : jamais deux passages ensemble, sinon les deux
	// lisent le même plan et chaque parent reçoit deux courriels.
	const { data: running, error: runningError } = await serviceClient
		.from('background_job_runs')
		.select('id')
		.eq('job_name', JOB_NAME)
		.eq('status', 'running')
		.gte('started_at', new Date(Date.now() - RUNNING_WINDOW_MS).toISOString())
		.limit(1);
	if (runningError) {
		logger.error('[CRON] Passages en cours illisibles :', runningError);
		return Response.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
	}
	if ((running?.length ?? 0) > 0) {
		return Response.json({ success: false, message: 'Passage déjà en cours' }, { status: 409 });
	}

	const { data: runId, error: startError } = await serviceClient.rpc('start_job_run', {
		p_job_name: JOB_NAME
	});
	// Le journal sert à l'admin ; son absence ne doit pas empêcher le passage.
	if (startError) logger.error('[CRON] Journal de la tâche non ouvert :', startError);

	try {
		const report = await runCarnetDaily(serviceClient);
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'success',
				p_metadata: { ...report }
			});
		}
		return Response.json({ success: true, report });
	} catch (err) {
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: err instanceof Error ? err.message : 'Erreur inconnue'
			});
		}
		logger.error('[CRON] Carnet de liaison :', err);
		return Response.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
	}
};

export const GET = handler;
export const POST = handler;
