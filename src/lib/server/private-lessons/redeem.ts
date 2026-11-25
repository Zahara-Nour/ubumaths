/**
 * Invitation de cours particulier : le parent crée l'espace de son enfant
 * =======================================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 3. Page `/auth/register/invitation/[token]` : le parent choisit le mot de passe, accepte
 * les CGU et donne son consentement ; le serveur crée tout en service role, sans session.
 *
 * DÉROULÉ (phase 0, « Nominal ») :
 * 1. RÉSERVATION du lien : `claimed_at` posé par un `update` atomique gardé (encore valable,
 *    pas déjà réservé depuis moins de 5 min). Deux validations simultanées : une seule
 *    réserve, donc un seul compte.
 * 2. Compte de l'enfant (identifiant `prenom` + 3 chiffres, domaine fictif) : sans code de
 *    classe, le trigger `handle_new_user` le crée EN ATTENTE ; le serveur le complète
 *    (approuvé, école, niveau). Pourquoi pas un code de classe : la classe naît inscriptions
 *    fermées (phase 0), et le trigger n'inscrit que dans une classe ouverte.
 * 3. Classe nommée d'après l'identifiant (`JADE123`), de l'école de cours particuliers, du
 *    niveau de l'invitation, année en cours, inscriptions fermées ; l'enfant y est inscrit.
 * 4. CGU notées ; demande au parent créée puis accordée par `grant_parental_consent`, avec
 *    l'IP et le navigateur de la requête (même preuve que le lien de consentement).
 * 5. Invitation « utilisée » (`used_at` + `student_id` + `class_id` ensemble), gardée sur
 *    NOTRE réservation et sur `cancelled_at is null` : une annulation passée entre-temps
 *    fait échouer la création.
 * 6. Courriel final au parent : identifiant + adresse de connexion. Son échec n'annule rien.
 *
 * ÉCHEC au milieu (phase 0, « Erreurs ») : tout est défait (classe, compte — le profil, la
 * classe, les CGU et le consentement partent avec lui), la réservation est retirée, le lien
 * reste valable.
 *
 * L'adresse du parent ne quitte jamais le serveur : elle n'est ni rendue à la page ni écrite
 * au journal.
 */
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { EmailSendResult } from '#lib/server/email/brevo.ts';
import type { PrivateLessonWelcomeEmailData } from '#lib/email-templates/private-lesson-welcome.ts';
import {
	createChildAuthUser,
	createParentRequest,
	deleteChildAccount
} from '#lib/server/child-registration.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { clearInvitationMark, INVITATION_MARK } from '#lib/server/private-lessons/orphans.ts';

// Types

type Client = SupabaseClient<Database>;

export type WelcomeEmailSender = (
	to: string,
	data: PrivateLessonWelcomeEmailData
) => Promise<EmailSendResult>;

export interface RedeemInput {
	/** Jeton en clair, tel que dans l'adresse de la page. */
	token: string;
	password: string;
	termsVersion: string;
	/** Preuve du consentement : la requête reçue par le serveur. */
	ip: string | null;
	userAgent: string | null;
}

/**
 * - `invalid` : lien inconnu, expiré, annulé ou utilisé (aussi : annulé pendant la création) ;
 * - `in_use` : une autre validation de ce lien est en cours (moins de 5 min) ;
 * - `weak_password` : refusé par l'authentification ;
 * - `server_error` : échec en route (tout est défait, le lien reste valable).
 */
export type RedeemRefusal = 'invalid' | 'in_use' | 'weak_password' | 'server_error';

export type RedeemOutcome =
	| {
			ok: true;
			loginId: string;
			childFirstname: string;
			studentId: string;
			classId: string;
			emailSent: boolean;
	  }
	| { ok: false; reason: RedeemRefusal };

export interface RedeemOptions {
	now?: Date;
	/**
	 * Appelé juste avant de marquer l'invitation utilisée. Pour les tests seulement : y
	 * simuler une annulation par l'admin pendant la création. Jamais passé par la page.
	 */
	beforeFinalize?: () => Promise<void>;
}

interface ClaimedInvitation {
	id: string;
	school_id: string;
	firstname: string;
	parent_email: string;
	grade: string;
}

/** Ce qui a été créé, pour le défaire en cas d'échec. */
interface Created {
	userId?: string;
	classId?: string;
}

// Constantes

/** Même fenêtre que `#lib/server/private-lessons/invitations.ts` (réservation de 5 min). */
const CLAIM_WINDOW_MS = 5 * 60_000;

const logger = createServerLogger('server/private-lessons/redeem');

// Functions

function sha256Hex(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

class RedeemStepError extends Error {
	constructor(
		step: string,
		readonly reason: RedeemRefusal = 'server_error',
		code?: string | null
	) {
		// Le code seul : le détail d'une erreur PostgREST peut citer la ligne (prénom, adresse).
		super(`${step} : ${code ?? 'sans code'}`);
	}
}

/**
 * Étape 1 : réserve le lien. `null` si aucune ligne ne l'est : on dit alors pourquoi
 * (réservé par une autre validation, ou plus valable).
 */
async function claim(
	service: Client,
	tokenHash: string,
	claimedAt: string,
	now: Date
): Promise<ClaimedInvitation | RedeemRefusal> {
	const staleBefore = new Date(now.getTime() - CLAIM_WINDOW_MS).toISOString();
	const { data, error } = await service
		.from('private_lesson_invitations')
		.update({ claimed_at: claimedAt })
		.eq('token_hash', tokenHash)
		.is('used_at', null)
		.is('cancelled_at', null)
		.gt('expires_at', now.toISOString())
		.or(`claimed_at.is.null,claimed_at.lt.${staleBefore}`)
		.select('id, school_id, firstname, parent_email, grade');
	if (error) throw new RedeemStepError('Réservation', 'server_error', error.code);
	if (data && data.length === 1) return data[0];

	// Aucune ligne : réservée par une autre validation, ou plus valable.
	const { data: row, error: readError } = await service
		.from('private_lesson_invitations')
		.select('used_at, cancelled_at, expires_at, claimed_at')
		.eq('token_hash', tokenHash)
		.maybeSingle();
	if (readError) throw new RedeemStepError('Relecture', 'server_error', readError.code);
	const stillValid =
		row !== null &&
		row.used_at === null &&
		row.cancelled_at === null &&
		new Date(row.expires_at).getTime() > now.getTime();
	return stillValid && row.claimed_at !== null ? 'in_use' : 'invalid';
}

/** Retire NOTRE réservation : le lien redevient utilisable. Sans retrait, il se libère seul au bout de 5 min. */
async function release(service: Client, invitationId: string, claimedAt: string): Promise<void> {
	try {
		const { error } = await service
			.from('private_lesson_invitations')
			.update({ claimed_at: null })
			.eq('id', invitationId)
			.eq('claimed_at', claimedAt)
			.is('used_at', null)
			.select('id');
		if (error) logger.error(`[Invitation ${invitationId}] Réservation non retirée : ${error.code}`);
	} catch {
		logger.error(`[Invitation ${invitationId}] Réservation non retirée : exception`);
	}
}

/** Supprime la classe créée (adhésion et conversation de classe partent avec elle). */
async function deleteClass(service: Client, classId: string): Promise<boolean> {
	try {
		const { data, error } = await service.from('classes').delete().eq('id', classId).select('id');
		if (!error && data?.length === 1) return true;
		logger.error(`Classe ${classId} NON supprimée (à retirer) : ${error?.code ?? 'aucune ligne'}`);
	} catch {
		logger.error(`Classe ${classId} NON supprimée (à retirer) : exception`);
	}
	return false;
}

/**
 * Défait ce qui a été créé : la classe, puis le compte (profil, CGU, consentement partent
 * avec lui). Chaque suppression est tentée même si l'autre échoue. Rend `true` si tout est
 * défait.
 */
async function undo(service: Client, created: Created): Promise<boolean> {
	const classGone = created.classId ? await deleteClass(service, created.classId) : true;
	const accountGone = created.userId ? await deleteChildAccount(service, created.userId) : true;
	return classGone && accountGone;
}

/** Étapes 2 à 5, sur une invitation réservée. Toute erreur lève : l'appelant défait. */
async function createEverything(
	service: Client,
	invitation: ClaimedInvitation,
	input: RedeemInput,
	claimedAt: string,
	created: Created,
	options: RedeemOptions
): Promise<{ loginId: string; studentId: string; classId: string }> {
	// Année en cours de l'école : la classe y est rattachée (phase 0).
	const { data: year, error: yearError } = await service
		.rpc('current_school_year', { p_school_id: invitation.school_id })
		.maybeSingle();
	if (yearError) throw new RedeemStepError('Année scolaire', 'server_error', yearError.code);
	if (!year) throw new RedeemStepError('Année scolaire absente');

	// 2. Compte (profil en attente, complété ci-dessous)
	const account = await createChildAuthUser(service, {
		childFirstname: invitation.firstname,
		password: input.password,
		userMetadata: { firstname: invitation.firstname, lastname: '' },
		// Marque « en cours de création » : un compte resté marqué est un orphelin si
		// l'invitation n'est pas utilisée par lui (fonction tuée en route, `orphans.ts`).
		appMetadata: { [INVITATION_MARK]: invitation.id }
	});
	if (!account.ok) {
		throw new RedeemStepError(
			'Compte',
			account.reason === 'weak_password' ? 'weak_password' : 'server_error'
		);
	}
	created.userId = account.userId;
	const { userId, loginId } = account;

	const { data: profile, error: profileError } = await service
		.from('profiles')
		.update({
			firstname: invitation.firstname,
			lastname: '',
			status: 'approved',
			school_id: invitation.school_id,
			grade: invitation.grade
		})
		.eq('id', userId)
		.select('id');
	if (profileError || profile?.length !== 1) {
		throw new RedeemStepError('Profil', 'server_error', profileError?.code ?? 'aucune ligne');
	}

	// 3. Classe, inscriptions fermées : son code ne sert jamais.
	const { data: joinCode, error: codeError } = await service.rpc('generate_join_code');
	if (codeError || !joinCode)
		throw new RedeemStepError('Code de classe', 'server_error', codeError?.code);

	const { data: cls, error: classError } = await service
		.from('classes')
		.insert({
			name: loginId.toUpperCase(),
			school_id: invitation.school_id,
			grade: invitation.grade,
			join_code: joinCode,
			school_year_id: year.id,
			is_active: true,
			registration_open: false
		})
		.select('id')
		.single();
	if (classError || !cls) throw new RedeemStepError('Classe', 'server_error', classError?.code);
	created.classId = cls.id;

	const { error: memberError } = await service
		.from('class_members')
		.insert({ class_id: cls.id, student_id: userId });
	if (memberError) throw new RedeemStepError('Adhésion', 'server_error', memberError.code);

	// 4. CGU, puis consentement (dernier : il retire le délai de grâce que les règles de
	// niveau et d'adhésion ont pu poser).
	const { error: termsError } = await service
		.from('terms_acceptances')
		.insert({ user_id: userId, terms_version: input.termsVersion });
	if (termsError) throw new RedeemStepError('CGU', 'server_error', termsError.code);

	const request = await createParentRequest(service, userId, invitation.parent_email);
	if (!request) throw new RedeemStepError('Demande au parent');

	const { data: grant, error: grantError } = await service.rpc('grant_parental_consent', {
		p_token: request.token,
		p_ip: input.ip ?? undefined,
		p_user_agent: input.userAgent ?? undefined
	});
	const granted =
		typeof grant === 'object' && grant !== null && 'success' in grant && grant.success === true;
	if (grantError || !granted) {
		throw new RedeemStepError('Consentement', 'server_error', grantError?.code ?? 'refusé');
	}

	// 5. Invitation utilisée, sur NOTRE réservation, si personne ne l'a annulée entre-temps.
	await options.beforeFinalize?.();
	const { data: used, error: usedError } = await service
		.from('private_lesson_invitations')
		.update({
			used_at: (options.now ?? new Date()).toISOString(),
			student_id: userId,
			class_id: cls.id
		})
		.eq('id', invitation.id)
		.eq('claimed_at', claimedAt)
		.is('used_at', null)
		.is('cancelled_at', null)
		.select('id');
	if (usedError) throw new RedeemStepError('Utilisation', 'server_error', usedError.code);
	if (!used || used.length !== 1) throw new RedeemStepError('Utilisation', 'invalid', 'annulée');

	return { loginId, studentId: userId, classId: cls.id };
}

/** Crée l'espace de l'enfant à partir du lien. Voir l'en-tête du fichier. */
export async function redeemInvitation(
	service: Client,
	send: WelcomeEmailSender,
	input: RedeemInput,
	options: RedeemOptions = {}
): Promise<RedeemOutcome> {
	const now = options.now ?? new Date();
	const claimedAt = now.toISOString();

	const claimed = await claim(service, sha256Hex(input.token), claimedAt, now);
	if (typeof claimed === 'string') return { ok: false, reason: claimed };

	const created: Created = {};
	let result: { loginId: string; studentId: string; classId: string };
	try {
		result = await createEverything(service, claimed, input, claimedAt, created, options);
	} catch (err) {
		const reason = err instanceof RedeemStepError ? err.reason : 'server_error';
		logger.error(
			`[Invitation ${claimed.id}] Création défaite : ${err instanceof Error ? err.message : 'exception'}`
		);
		// Tout défait → le lien redevient utilisable. Défait en partie → la réservation reste
		// (5 min) : un compte prêt à l'emploi peut encore exister, à retirer à la main d'après
		// le journal ; retenter tout de suite en créerait un second.
		if (await undo(service, created)) {
			await release(service, claimed.id, claimedAt);
		} else {
			logger.error(
				`[Invitation ${claimed.id}] Défaite en partie (à retirer) : compte ${created.userId ?? '-'}, classe ${created.classId ?? '-'}`
			);
		}
		return { ok: false, reason };
	}

	// 6. Courriel final : son échec n'annule rien (l'écran a déjà l'identifiant).
	let emailSent = false;
	try {
		const sent = await send(claimed.parent_email, {
			childFirstname: claimed.firstname,
			loginId: result.loginId
		});
		emailSent = sent.success;
		if (!sent.success) logger.warn(`[Invitation ${claimed.id}] Courriel final refusé`);
	} catch {
		logger.error(`[Invitation ${claimed.id}] Courriel final : exception`);
	}

	// Succès : la marque tombe. Un échec ici ne gêne pas : la tâche de nuit la retirera en
	// voyant l'invitation utilisée par ce compte.
	await clearInvitationMark(service, result.studentId);

	return { ok: true, childFirstname: claimed.firstname, emailSent, ...result };
}
