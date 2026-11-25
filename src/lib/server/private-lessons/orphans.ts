/**
 * Invitation de cours particulier : comptes orphelins
 * ===================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 4. Une fonction tuée en route (délai de Vercel, panne) entre la création du compte et
 * « invitation utilisée » laisse un compte approuvé et sa classe, que personne ne connaît :
 * l'identifiant ne s'affiche qu'à la fin. Le parent recommence et obtient un second compte.
 *
 * - À la création, `redeemInvitation` pose sur le compte la marque serveur
 *   `app_metadata.private_lesson_invitation_id` ; elle tombe au succès.
 * - Chaque nuit (cron `invitations-cours-particulier`), un compte encore marqué depuis plus
 *   d'une heure est regardé :
 *   - invitation utilisée par CE compte → succès dont la marque n'est pas tombée : on la retire ;
 *   - invitation présente, pas utilisée par lui → **orphelin** : supprimé avec sa classe
 *     (décision de David, 2026-11-25 : suppression automatique) ;
 *   - par prudence, jamais supprimé : un compte qui s'est déjà connecté, ou dont l'invitation a
 *     disparu (purgée) — journalisé « à vérifier ».
 * Seuls les comptes marqués sont regardés : aucun autre élève ne peut être touché.
 *
 * Journal : nombres et identifiants techniques seulement, jamais un prénom ni une adresse.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { deleteChildAccount } from '#lib/server/child-registration.ts';
import { childLoginIdOf } from '#lib/utils/child-account.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types

type Client = SupabaseClient<Database>;

/** Type (pas interface) : écrit tel quel dans le journal `background_job_runs` (Json). */
export type OrphanReport = {
	/** Comptes marqués depuis plus d'une heure. */
	checked: number;
	/** Succès dont la marque est retirée. */
	cleared: number;
	/** Orphelins supprimés (compte et classe). */
	deleted: number;
	/** Gardés par prudence (connecté, invitation disparue) ou suppression en échec. */
	kept: number;
};

// Constantes

/** Clé de la marque dans `app_metadata` (réservé au serveur). */
export const INVITATION_MARK = 'private_lesson_invitation_id';

/** Un compte plus jeune peut être en cours de création : jamais touché. */
const MIN_AGE_MS = 60 * 60_000;
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

const logger = createServerLogger('server/private-lessons/orphans');

// Functions

function markOf(user: User): string | null {
	const value = user.app_metadata?.[INVITATION_MARK];
	return typeof value === 'string' && value !== '' ? value : null;
}

/** Retire la marque d'un compte créé avec succès. Rend `false` en cas d'échec (journalisé). */
export async function clearInvitationMark(service: Client, userId: string): Promise<boolean> {
	try {
		const { error } = await service.auth.admin.updateUserById(userId, {
			app_metadata: { [INVITATION_MARK]: null }
		});
		if (!error) return true;
		logger.warn(
			`Compte ${userId} : marque d'invitation non retirée : ${error.code ?? 'sans code'}`
		);
	} catch {
		logger.warn(`Compte ${userId} : marque d'invitation non retirée : exception`);
	}
	return false;
}

/** Tous les comptes portant la marque. */
async function markedUsers(service: Client): Promise<User[]> {
	const marked: User[] = [];
	for (let page = 1; page <= MAX_PAGES; page++) {
		const { data, error } = await service.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
		if (error) throw new Error(`Comptes illisibles : ${error.code ?? 'sans code'}`);
		marked.push(...data.users.filter((u) => markOf(u) !== null));
		if (data.users.length < PAGE_SIZE) return marked;
	}
	throw new Error(`Plus de ${MAX_PAGES * PAGE_SIZE} comptes : liste non parcourue en entier`);
}

/**
 * Supprime la classe de l'orphelin : nommée d'après son identifiant, dans l'école de
 * l'invitation, sans autre élève que lui. Rend `false` si une suppression échoue.
 */
async function deleteOrphanClasses(
	service: Client,
	userId: string,
	loginId: string,
	schoolId: string
): Promise<boolean> {
	const { data: classes, error } = await service
		.from('classes')
		.select('id, class_members(student_id)')
		.eq('school_id', schoolId)
		.eq('name', loginId.toUpperCase());
	if (error) {
		logger.error(`Orphelin ${userId} : classes illisibles : ${error.code ?? 'sans code'}`);
		return false;
	}
	let ok = true;
	for (const cls of classes ?? []) {
		const others = (cls.class_members ?? []).filter((m) => m.student_id !== userId);
		// Une classe qui a d'autres élèves n'est pas celle de l'orphelin.
		if (others.length > 0) continue;
		const { data, error: delError } = await service
			.from('classes')
			.delete()
			.eq('id', cls.id)
			.select('id');
		if (delError || data?.length !== 1) {
			logger.error(`Classe ${cls.id} de l'orphelin ${userId} NON supprimée (à retirer)`);
			ok = false;
		}
	}
	return ok;
}

/** Tâche de nuit : retire les marques des succès, supprime les orphelins. */
export async function cleanupOrphanAccounts(
	service: Client,
	now: Date = new Date()
): Promise<OrphanReport> {
	const report: OrphanReport = { checked: 0, cleared: 0, deleted: 0, kept: 0 };
	const users = await markedUsers(service);

	for (const user of users) {
		const invitationId = markOf(user);
		if (!invitationId) continue;
		if (new Date(user.created_at).getTime() > now.getTime() - MIN_AGE_MS) continue;
		report.checked += 1;

		const { data: invitation, error } = await service
			.from('private_lesson_invitations')
			.select('id, school_id, used_at, student_id')
			.eq('id', invitationId)
			.maybeSingle();
		if (error) throw new Error(`Invitation illisible : ${error.code ?? 'sans code'}`);

		// Succès dont la marque n'est pas tombée.
		if (invitation?.used_at && invitation.student_id === user.id) {
			if (await clearInvitationMark(service, user.id)) report.cleared += 1;
			else report.kept += 1;
			continue;
		}

		// Prudence : invitation disparue, ou compte qui a déjà servi.
		const loginId = childLoginIdOf(user.email);
		if (!invitation || user.last_sign_in_at || !loginId) {
			logger.warn(`Compte marqué ${user.id} gardé (à vérifier) : invitation ${invitationId}`);
			report.kept += 1;
			continue;
		}

		const classesGone = await deleteOrphanClasses(service, user.id, loginId, invitation.school_id);
		const accountGone = await deleteChildAccount(service, user.id);
		if (classesGone && accountGone) {
			logger.info(`Orphelin ${user.id} supprimé (invitation ${invitationId})`);
			report.deleted += 1;
		} else {
			report.kept += 1;
		}
	}

	return report;
}
