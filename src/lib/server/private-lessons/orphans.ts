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
	/** Gardés par prudence : déjà connecté, ou invitation disparue (« à vérifier »). */
	kept: number;
	/** Échecs (lecture, suppression) : la marque reste, la nuit suivante recommence. */
	failed: number;
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

/** Tous les comptes portant la marque (pages de `listUsers` suivies par `nextPage`). */
async function markedUsers(service: Client): Promise<User[]> {
	const marked: User[] = [];
	let page: number | null = 1;
	for (let n = 0; page !== null; n++) {
		if (n >= MAX_PAGES) {
			throw new Error(`Plus de ${MAX_PAGES} pages de comptes : liste non parcourue en entier`);
		}
		const { data, error } = await service.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
		if (error) throw new Error(`Comptes illisibles : ${error.code ?? 'sans code'}`);
		marked.push(...data.users.filter((u) => markOf(u) !== null));
		page = 'nextPage' in data && typeof data.nextPage === 'number' ? data.nextPage : null;
	}
	return marked;
}

/**
 * Supprime la classe de l'orphelin : nommée d'après son identifiant, dans l'école de
 * l'invitation, dont il est le seul élève — ou, sans aucun élève (adhésion jamais
 * écrite), née dans l'heure qui suit le compte. Rend `false` si une suppression échoue.
 */
async function deleteOrphanClasses(
	service: Client,
	user: User,
	loginId: string,
	schoolId: string
): Promise<boolean> {
	const { data: classes, error } = await service
		.from('classes')
		.select('id, created_at, class_members(student_id)')
		.eq('school_id', schoolId)
		.eq('name', loginId.toUpperCase())
		// La classe d'un orphelin naît fermée, après son compte : une classe plus ancienne
		// de même nom (identifiant libéré puis redonné) n'est jamais la sienne.
		.eq('registration_open', false)
		.gte('created_at', user.created_at);
	if (error) {
		logger.error(`Orphelin ${user.id} : classes illisibles : ${error.code ?? 'sans code'}`);
		return false;
	}
	const userCreated = new Date(user.created_at).getTime();
	let ok = true;
	for (const cls of classes ?? []) {
		const members = (cls.class_members ?? []).map((m) => m.student_id);
		const onlyHim = members.length > 0 && members.every((id) => id === user.id);
		const classCreated = new Date(cls.created_at).getTime();
		const bornWithHim =
			members.length === 0 &&
			classCreated >= userCreated &&
			classCreated - userCreated < MIN_AGE_MS;
		// Toute autre classe de ce nom n'est pas celle de l'orphelin.
		if (!onlyHim && !bornWithHim) continue;
		const { data, error: delError } = await service
			.from('classes')
			.delete()
			.eq('id', cls.id)
			.select('id');
		if (delError || data?.length !== 1) {
			logger.error(`Classe ${cls.id} de l'orphelin ${user.id} NON supprimée (à retirer)`);
			ok = false;
		}
	}
	return ok;
}

type Verdict = 'cleared' | 'deleted' | 'kept' | 'failed';

/** Un compte marqué depuis plus d'une heure. */
async function handleMarkedUser(
	service: Client,
	user: User,
	invitationId: string
): Promise<Verdict> {
	const { data: invitation, error } = await service
		.from('private_lesson_invitations')
		.select('id, school_id, used_at, student_id')
		.eq('id', invitationId)
		.maybeSingle();
	if (error) {
		logger.error(`Compte marqué ${user.id} : invitation illisible : ${error.code ?? 'sans code'}`);
		return 'failed';
	}

	// Succès dont la marque n'est pas tombée.
	if (invitation?.used_at && invitation.student_id === user.id) {
		return (await clearInvitationMark(service, user.id)) ? 'cleared' : 'failed';
	}

	// Prudence : invitation disparue, ou compte qui a déjà servi.
	const loginId = childLoginIdOf(user.email);
	if (!invitation || user.last_sign_in_at || !loginId) {
		logger.warn(`Compte marqué ${user.id} gardé (à vérifier) : invitation ${invitationId}`);
		return 'kept';
	}

	// La classe d'abord : si elle reste, le compte (et sa marque) aussi, et la nuit suivante
	// recommence ; sans classe trouvée, l'étape passe.
	if (!(await deleteOrphanClasses(service, user, loginId, invitation.school_id))) return 'failed';
	if (!(await deleteChildAccount(service, user.id))) return 'failed';
	logger.info(`Orphelin ${user.id} supprimé (invitation ${invitationId})`);
	return 'deleted';
}

/** Tâche de nuit : retire les marques des succès, supprime les orphelins. */
export async function cleanupOrphanAccounts(
	service: Client,
	now: Date = new Date()
): Promise<OrphanReport> {
	const report: OrphanReport = { checked: 0, cleared: 0, deleted: 0, kept: 0, failed: 0 };
	const users = await markedUsers(service);

	for (const user of users) {
		const invitationId = markOf(user);
		if (!invitationId) continue;
		if (new Date(user.created_at).getTime() > now.getTime() - MIN_AGE_MS) continue;
		report.checked += 1;
		// Un compte en échec n'arrête pas les suivants.
		try {
			report[await handleMarkedUser(service, user, invitationId)] += 1;
		} catch {
			logger.error(`Compte marqué ${user.id} : exception`);
			report.failed += 1;
		}
	}

	return report;
}
