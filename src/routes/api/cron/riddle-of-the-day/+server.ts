/**
 * GET|POST /api/cron/riddle-of-the-day
 * ====================================
 * Choisit l'énigme du jour quand le professeur n'en a pas programmé : une énigme publiée,
 * absente des 30 derniers jours, en faisant tourner la difficulté
 * (`src/lib/server/riddle-auto-select.ts`). Une énigme choisie à la main n'est jamais
 * remplacée.
 *
 * Appelée chaque jour par le cron Vercel (GET, `vercel.json`) et à la demande depuis
 * `/dashboard/admin/cron` (POST). AUTH : `Bearer CRON_SECRET` seulement.
 * Écrit avec le client service : la policy d'INSERT de `riddle_of_the_day` exige
 * `selected_by = auth.uid()`, qu'un automate sans compte ne peut pas remplir.
 * Journal : `background_job_runs` (job `auto_select_daily_riddle`).
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCronAuth } from '$lib/server/auth/cron';
import { checkAndAutoSelectToday } from '$lib/server/riddle-auto-select';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/cron/riddle-of-the-day');

const JOB_NAME = 'auto_select_daily_riddle';

const handler: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	const { data: runId, error: startError } = await serviceClient.rpc('start_job_run', {
		p_job_name: JOB_NAME
	});
	// Le journal sert à l'admin ; son absence ne doit pas empêcher la sélection.
	if (startError) logger.error('[CRON] Journal de la tâche non ouvert :', startError);

	try {
		const result = await checkAndAutoSelectToday(serviceClient);
		// Message : « Énigme du jour sélectionnée automatiquement: <riddle_id> »
		const riddleId = result.message.match(/: ([a-f0-9-]{36})/)?.[1] ?? null;
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: result.success ? 'success' : 'failed',
				p_error_message: result.success ? undefined : result.message,
				p_metadata: riddleId
					? { riddle_id: riddleId, message: result.message }
					: { message: result.message }
			});
		}
		return json(
			{ success: result.success, message: result.message },
			{ status: result.success ? 200 : 500 }
		);
	} catch (err) {
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: err instanceof Error ? err.message : 'Erreur inconnue'
			});
		}
		logger.error('[CRON] Énigme du jour :', err);
		return json({ success: false, message: 'Erreur serveur' }, { status: 500 });
	}
};

export const GET = handler;
export const POST = handler;
