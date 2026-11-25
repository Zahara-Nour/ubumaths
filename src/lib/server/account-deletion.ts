/**
 * Suppression d'un compte élève (RGPD art. 17)
 * =============================================
 *
 * Le déroulé commun aux deux portes :
 * - l'élève lui-même, page Profil (`/api/account/delete`) ;
 * - l'admin, page Users (`/api/admin/users/[id]/delete`).
 *
 * 1. ligne `requested` dans `account_deletion_audit` (adresse hachée, jamais en clair) ;
 * 2. `delete_user_account` : efface messages et références sans ON DELETE, échoue d'un
 *    bloc si une référence reste, rend les chemins exacts des fichiers à retirer ;
 * 3. `auth.admin.deleteUser` : la cascade emporte le profil et le reste ;
 * 4. retrait des fichiers du storage, au mieux (le cron hebdomadaire reprend) ;
 * 5. ligne d'audit `completed`, `user_id` remis à null (anonymisée).
 *
 * Les gardes (identité, rôle, confirmation, limite de débit) restent dans les routes.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { removeAccountFiles } from '#lib/server/deleted-account-files.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface StudentAccountDeletion {
	userId: string;
	/** Adresse du compte supprimé : seul son hachage est gardé. */
	email: string;
	ipAddress: string | null;
	userAgent: string | null;
	/** Admin qui demande la suppression ; null = l'élève lui-même. */
	requestedBy: string | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const logger = createServerLogger('server/account-deletion');

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Hachage de l'adresse pour le journal (corrélation possible, aucune donnée en clair).
 */
export async function hashEmail(email: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(email.toLowerCase().trim());
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Supprime définitivement un compte élève. Lève une erreur SvelteKit 500 si la base
 * refuse le nettoyage ou la suppression du compte ; rien n'est alors perdu côté élève
 * (le nettoyage est atomique et précède la suppression du compte).
 */
export async function deleteStudentAccount(
	serviceClient: SupabaseClient<Database>,
	deletion: StudentAccountDeletion
): Promise<void> {
	const { userId, requestedBy } = deletion;
	const emailHash = await hashEmail(deletion.email);

	// 1. Journal : la demande
	const { data: auditEntry, error: auditError } = await serviceClient
		.from('account_deletion_audit')
		.insert({
			user_id: userId,
			email_hash: emailHash,
			ip_address: deletion.ipAddress,
			user_agent: deletion.userAgent,
			status: 'requested',
			requested_by: requestedBy
		})
		.select('id')
		.single();

	if (auditError) {
		logger.error('Failed to create audit entry', { userId, error: auditError });
		// Un journal en échec ne bloque pas la suppression demandée
	}

	const auditId = auditEntry?.id;

	try {
		// 2. Nettoyage en base (voir la migration 20261014100000_suppression_compte_art17)
		const { data: cleanupResult, error: cleanupError } = await serviceClient.rpc(
			'delete_user_account',
			{ p_user_id: userId }
		);

		if (cleanupError) {
			logger.error('Database cleanup failed', { userId, error: cleanupError });

			if (auditId) {
				await serviceClient
					.from('account_deletion_audit')
					.update({
						status: 'failed',
						error_message: cleanupError.message,
						completed_at: new Date().toISOString()
					})
					.eq('id', auditId);
			}

			throw error(500, 'Erreur lors du nettoyage des donnees');
		}

		logger.info('Database cleanup completed', { userId, result: cleanupResult });

		// 3. Le compte (cascade sur profiles)
		const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);

		if (authError) {
			logger.error('Auth user deletion failed', { userId, error: authError });

			if (auditId) {
				await serviceClient
					.from('account_deletion_audit')
					.update({
						status: 'failed',
						error_message: `Auth deletion failed: ${authError.message}`,
						cleanup_result: cleanupResult,
						completed_at: new Date().toISOString()
					})
					.eq('id', auditId);
			}

			throw error(500, 'Erreur lors de la suppression du compte');
		}

		// 4. Fichiers retirés seulement une fois le compte supprimé : si deleteUser
		// échoue, l'élève n'a pas perdu ses pièces jointes (jamais bloquant). Un retrait
		// incomplet laisse `storage_removed_at` nul : le cron hebdomadaire le reprendra
		// (`src/routes/api/cron/deleted-account-files`).
		const removal = await removeAccountFiles(serviceClient, cleanupResult);
		if (!removal.ok) {
			logger.error('Fichiers du compte non tous retirés, repris par le cron', { userId });
		}

		// 5. Journal : terminé. Une ligne restée sans `completed` ne serait jamais reprise
		// par le cron des fichiers : l'échec se journalise.
		if (auditId) {
			const { error: finalAuditError } = await serviceClient
				.from('account_deletion_audit')
				.update({
					user_id: null, // Anonymisée : le compte n'existe plus
					status: 'completed',
					cleanup_result: cleanupResult,
					completed_at: new Date().toISOString(),
					...(removal.ok ? { storage_removed_at: new Date().toISOString() } : {})
				})
				.eq('id', auditId);
			if (finalAuditError) {
				logger.error('Audit de suppression non finalisé', { auditId, error: finalAuditError });
			}
		}

		logger.info('Account deletion completed successfully', { userId, requestedBy });
	} catch (err) {
		// Erreur SvelteKit : statut conservé
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		if (auditId) {
			await serviceClient
				.from('account_deletion_audit')
				.update({
					status: 'failed',
					error_message: err instanceof Error ? err.message : 'Unknown error',
					completed_at: new Date().toISOString()
				})
				.eq('id', auditId);
		}

		logger.error('Unexpected error during account deletion', { userId, error: err });
		throw error(500, 'Une erreur inattendue est survenue');
	}
}
