/**
 * Fichiers des comptes supprimés : retrait du storage
 * ===================================================
 *
 * `delete_user_account` rend les chemins EXACTS des fichiers d'un compte
 * (`cleanup_result.storage_paths`, par bucket), collectés avant que la cascade n'efface
 * les lignes qui les portent. Le SQL ne peut pas les retirer lui-même (déclencheur
 * `protect_objects_delete` de Supabase) : la purge de conservation (C11) ne fait que les
 * consigner dans `account_deletion_audit`, et la route de suppression les retire au mieux.
 *
 * `sweepDeletedAccountFiles`, appelée chaque semaine par
 * `src/routes/api/cron/deleted-account-files/+server.ts`, reprend les suppressions
 * terminées dont `storage_removed_at` est nul. Retirer un fichier déjà absent ne fait
 * rien : la reprise est sans danger.
 */
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RemoveAccountFilesResult {
	/** Tous les buckets ont été traités sans erreur. */
	ok: boolean;
	removed: number;
}

export interface SweepResult {
	checked: number;
	cleared: number;
	failed: number;
	files: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const logger = createServerLogger('server/deleted-account-files');

/** Suppressions reprises par passage : la table compte au plus quelques lignes par an. */
const SWEEP_LIMIT = 100;

/** Chemins de fichiers rendus par `delete_user_account`, par bucket. */
const storagePathsSchema = z.object({
	storage_paths: z.record(z.string(), z.array(z.string()))
});

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Retire du storage les fichiers d'un compte supprimé, par leurs chemins exacts.
 * Un bucket en erreur n'empêche pas les autres ; le résultat dit si TOUT a été retiré.
 */
export async function removeAccountFiles(
	serviceClient: SupabaseClient<Database>,
	cleanupResult: unknown
): Promise<RemoveAccountFilesResult> {
	const parsed = storagePathsSchema.safeParse(cleanupResult);
	if (!parsed.success) {
		logger.error('Chemins de fichiers illisibles, fichiers du compte non retirés');
		return { ok: false, removed: 0 };
	}

	let ok = true;
	let removed = 0;
	for (const [bucket, paths] of Object.entries(parsed.data.storage_paths)) {
		if (paths.length === 0) continue;
		try {
			const { error: removeError } = await serviceClient.storage.from(bucket).remove(paths);
			if (removeError) {
				ok = false;
				logger.error('Fichiers du compte non retirés', { bucket, error: removeError });
			} else {
				removed += paths.length;
			}
		} catch (err) {
			ok = false;
			logger.error('Fichiers du compte non retirés', { bucket, error: err });
		}
	}
	return { ok, removed };
}

/**
 * Reprend les suppressions de compte terminées dont les fichiers ne sont pas encore
 * retirés. Une ligne n'est datée que si tous ses fichiers ont été retirés ; sinon elle
 * revient au passage suivant.
 */
export async function sweepDeletedAccountFiles(
	serviceClient: SupabaseClient<Database>
): Promise<SweepResult> {
	const { data: rows, error: readError } = await serviceClient
		.from('account_deletion_audit')
		.select('id, cleanup_result')
		.eq('status', 'completed')
		.is('storage_removed_at', null)
		.not('cleanup_result', 'is', null)
		.order('completed_at', { ascending: true })
		.limit(SWEEP_LIMIT);

	// Une lecture en panne ne doit pas passer pour « rien à retirer ».
	if (readError) {
		throw new Error(`Suppressions de compte illisibles : ${readError.message}`);
	}

	const result: SweepResult = { checked: 0, cleared: 0, failed: 0, files: 0 };
	for (const row of rows ?? []) {
		result.checked += 1;
		const removal = await removeAccountFiles(serviceClient, row.cleanup_result);
		result.files += removal.removed;
		if (!removal.ok) {
			result.failed += 1;
			continue;
		}

		// La RLS et les erreurs muettes rendent zéro ligne : seule la ligne rendue prouve
		// que la date est écrite.
		const { data: updated, error: updateError } = await serviceClient
			.from('account_deletion_audit')
			.update({ storage_removed_at: new Date().toISOString() })
			.eq('id', row.id)
			.is('storage_removed_at', null)
			.select('id');
		if (updateError || !updated || updated.length === 0) {
			result.failed += 1;
			logger.error('Date de retrait des fichiers non écrite', { id: row.id, error: updateError });
			continue;
		}
		result.cleared += 1;
	}

	logger.info('Fichiers des comptes supprimés : passage terminé', result);
	return result;
}
