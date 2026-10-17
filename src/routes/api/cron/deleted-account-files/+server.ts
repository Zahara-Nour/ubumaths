/**
 * GET|POST /api/cron/deleted-account-files
 * =========================================
 * Retire du storage les fichiers des comptes supprimés que la suppression n'a pas pu
 * retirer : purge de conservation C11 (le SQL ne peut pas toucher au storage) et retraits
 * échoués de la route de suppression. Voir `src/lib/server/deleted-account-files.ts`.
 * Retire aussi les pièces jointes de la messagerie restées sans ligne en base
 * (`sweepOrphanMessageAttachments`, `src/lib/server/message-attachments.ts`).
 *
 * Appelée chaque semaine par le cron Vercel (GET, `vercel.json`) et à la demande depuis
 * `/dashboard/admin/cron` (POST). AUTH : `Bearer CRON_SECRET` seulement.
 * Journal : `background_job_runs` (job `deleted_account_files`).
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCronAuth } from '$lib/server/auth/cron';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { sweepDeletedAccountFiles } from '$lib/server/deleted-account-files';
import { sweepOrphanMessageAttachments } from '$lib/server/message-attachments';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/cron/deleted-account-files/+server');

const JOB_NAME = 'deleted_account_files';

const handler: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	const { data: runId, error: startError } = await serviceClient.rpc('start_job_run', {
		p_job_name: JOB_NAME
	});
	// Le journal sert à l'admin ; son absence ne doit pas empêcher le retrait.
	if (startError) logger.error('[CRON] Journal de la tâche non ouvert :', startError);

	try {
		const result = await sweepDeletedAccountFiles(serviceClient);
		// Même passage : pièces jointes de la messagerie restées sans ligne (message purgé,
		// pièce jointe retirée, envoi inachevé).
		const orphanFiles = await sweepOrphanMessageAttachments(serviceClient);
		const success = result.failed === 0 && !orphanFiles.failed;
		const problems = [
			result.failed > 0 ? `${result.failed} suppression(s) de compte non traitée(s)` : null,
			orphanFiles.failed
				? `${orphanFiles.listed} pièce(s) jointe(s) orpheline(s) non retirée(s)`
				: null
		].filter((p): p is string => p !== null);
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: success ? 'success' : 'failed',
				p_error_message: success
					? undefined
					: `${problems.join(' ; ')}, reprise au prochain passage`,
				p_metadata: { ...result, orphan_files: orphanFiles }
			});
		}
		return json({ success, ...result, orphan_files: orphanFiles });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Erreur inconnue';
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: message
			});
		}
		logger.error('[CRON] Fichiers des comptes supprimés :', err);
		throw error(500, 'Retrait des fichiers des comptes supprimés impossible');
	}
};

export const GET = handler;
export const POST = handler;
