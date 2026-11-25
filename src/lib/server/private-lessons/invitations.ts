/**
 * Invitations de cours particulier : envoi, renvoi, annulation, purge
 * ===================================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 2. La table `private_lesson_invitations` (PR 1) n'est écrite que par le serveur, en
 * service role : ces fonctions reçoivent le client service d'un appelant qui a DÉJÀ passé
 * sa garde (`requireAdmin` de la page admin, `verifyCronAuth` du cron de purge).
 *
 * - Le jeton n'existe en clair que dans le courriel ; la base garde son sha256.
 * - `email_sent_at` et `sent_count` ne bougent que si Brevo accepte le courriel : la liste
 *   ne dit jamais « envoyée » à tort (phase 0, « Erreurs »).
 * - « Renvoyer » pose une nouvelle empreinte : l'ancien lien ne marche plus.
 * - Décision 8 : une invitation finie (expirée, annulée, utilisée) est effacée 30 jours
 *   après sa fin.
 *
 * Lectures : colonnes nommées, jamais `select('*')` (l'empreinte n'est lisible que par le
 * service role ; un client connecté recevrait 42501).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { GradeCode } from '#lib/types/grades.ts';
import type { EmailSendResult } from '#lib/server/email/brevo.ts';
import type { PrivateLessonInvitationEmailData } from '#lib/email-templates/private-lesson-invitation.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types

type Client = SupabaseClient<Database>;

export type InvitationEmailSender = (
	to: string,
	data: PrivateLessonInvitationEmailData
) => Promise<EmailSendResult>;

/** Ce que la page admin montre d'une invitation : jamais l'empreinte du lien. */
export interface PrivateLessonInvitation {
	id: string;
	firstname: string;
	parent_email: string;
	grade: string;
	expires_at: string;
	email_sent_at: string | null;
	sent_count: number;
	cancelled_at: string | null;
	claimed_at: string | null;
	used_at: string | null;
	created_at: string;
}

export interface PrivateLessonsSchool {
	id: string;
	name: string;
	/** Une année scolaire commencée (`current_school_year`) : sans elle, pas d'envoi. */
	hasSchoolYear: boolean;
}

export type SendOutcome =
	| { ok: true; invitation: PrivateLessonInvitation; emailSent: boolean }
	| { ok: false; reason: 'not_found' | 'ended' | 'in_use' | 'cap' };

export type CancelOutcome = { ok: true } | { ok: false; reason: 'not_found' | 'ended' };

export interface PurgeReport {
	used: number;
	cancelled: number;
	expired: number;
}

// Constantes

/** Décision 2 : 7 jours. */
export const INVITATION_VALIDITY_DAYS = 7;
/** Décision 8 : effacée 30 jours après sa fin. */
export const INVITATION_RETENTION_DAYS = 30;
/** Même plafond que la contrainte `private_lesson_invitations_sent_count`. */
export const INVITATION_MAX_SENDS = 5;
/** Réservation du lien pendant la création du compte (PR 3) ; se périme au bout de 5 min. */
const CLAIM_WINDOW_MS = 5 * 60_000;
const DAY_MS = 86_400_000;

export const INVITATION_COLUMNS =
	'id, firstname, parent_email, grade, expires_at, email_sent_at, sent_count, cancelled_at, claimed_at, used_at, created_at';

const logger = createServerLogger('server/private-lessons/invitations');

// Functions

function sha256Hex(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

/** 32 octets au hasard, base64url : 43 caractères, dans les bornes de la lecture par lien. */
function newToken(): string {
	return randomBytes(32).toString('base64url');
}

function inDays(days: number, now: Date): string {
	return new Date(now.getTime() + days * DAY_MS).toISOString();
}

/** Réservation absente ou périmée : le parent n'est pas en train de créer le compte. */
function claimFreeFilter(now: Date): string {
	return `claimed_at.is.null,claimed_at.lt.${new Date(now.getTime() - CLAIM_WINDOW_MS).toISOString()}`;
}

/**
 * L'école de cours particuliers (Akadada, réglage `is_private_lessons`), avec la présence
 * d'une année scolaire. Null si aucune école n'est réglée.
 */
export async function getPrivateLessonsSchool(
	client: Client
): Promise<PrivateLessonsSchool | null> {
	const { data: school, error: schoolError } = await client
		.from('schools')
		.select('id, name')
		.eq('is_private_lessons', true)
		.maybeSingle();
	if (schoolError)
		throw new Error(`École de cours particuliers illisible : ${schoolError.message}`);
	if (!school) return null;

	const { data: year, error: yearError } = await client
		.rpc('current_school_year', { p_school_id: school.id })
		.maybeSingle();
	if (yearError) throw new Error(`Année scolaire illisible : ${yearError.message}`);

	return { id: school.id, name: school.name, hasSchoolYear: year !== null };
}

/**
 * Invitations encore ouvertes de l'école : ni utilisées ni annulées. Une expirée reste
 * jusqu'à sa purge et peut être renvoyée (décision 8).
 */
export async function listOpenInvitations(
	client: Client,
	schoolId: string
): Promise<PrivateLessonInvitation[]> {
	const { data, error } = await client
		.from('private_lesson_invitations')
		.select(INVITATION_COLUMNS)
		.eq('school_id', schoolId)
		.is('used_at', null)
		.is('cancelled_at', null)
		.order('created_at', { ascending: false })
		.limit(200);
	if (error) throw new Error(`Invitations illisibles : ${error.message}`);
	return data ?? [];
}

/**
 * Envoie le courriel du lien ACTUEL, puis note l'envoi si Brevo l'accepte. L'empreinte et
 * le compteur lus servent de garde : un renvoi concurrent ne se fait pas écraser.
 */
async function sendAndRecord(
	service: Client,
	send: InvitationEmailSender,
	invitation: PrivateLessonInvitation,
	token: string,
	schoolName: string
): Promise<SendOutcome> {
	const result = await send(invitation.parent_email, {
		childFirstname: invitation.firstname,
		schoolName,
		token,
		expiresAt: new Date(invitation.expires_at)
	});
	if (!result.success) {
		logger.warn(`[Invitation ${invitation.id}] Courriel refusé : ${result.error ?? 'sans motif'}`);
		return { ok: true, invitation, emailSent: false };
	}

	const { data, error } = await service
		.from('private_lesson_invitations')
		.update({ email_sent_at: new Date().toISOString(), sent_count: invitation.sent_count + 1 })
		.eq('id', invitation.id)
		.eq('token_hash', sha256Hex(token))
		.eq('sent_count', invitation.sent_count)
		.select(INVITATION_COLUMNS);
	if (error || !data || data.length === 0) {
		// Le courriel est parti : on ne le dit pas raté. Seule la liste reste en retard.
		logger.error(`[Invitation ${invitation.id}] Envoi non noté :`, error ?? 'aucune ligne');
		return { ok: true, invitation, emailSent: true };
	}
	return { ok: true, invitation: data[0], emailSent: true };
}

/** « Envoyer l'invitation » : nouvelle ligne, puis le courriel. */
export async function createInvitation(
	service: Client,
	send: InvitationEmailSender,
	input: {
		school: { id: string; name: string };
		firstname: string;
		parentEmail: string;
		grade: GradeCode;
		createdBy: string;
	},
	now: Date = new Date()
): Promise<SendOutcome> {
	const token = newToken();
	const { data, error } = await service
		.from('private_lesson_invitations')
		.insert({
			school_id: input.school.id,
			firstname: input.firstname,
			parent_email: input.parentEmail,
			grade: input.grade,
			token_hash: sha256Hex(token),
			expires_at: inDays(INVITATION_VALIDITY_DAYS, now),
			created_by: input.createdBy
		})
		.select(INVITATION_COLUMNS)
		.single();
	if (error || !data) throw new Error(`Invitation non créée : ${error?.message ?? 'aucune ligne'}`);

	return sendAndRecord(service, send, data, token, input.school.name);
}

/**
 * « Renvoyer » : nouveau lien de 7 jours, l'ancien ne marche plus ; l'envoi n'est compté
 * que si le courriel part. Refusé si l'invitation a servi ou été annulée, si le parent est
 * en train de créer le compte, ou après 5 courriels.
 */
export async function resendInvitation(
	service: Client,
	send: InvitationEmailSender,
	input: { id: string; school: { id: string; name: string } },
	now: Date = new Date()
): Promise<SendOutcome> {
	const { data: current, error: readError } = await service
		.from('private_lesson_invitations')
		.select(INVITATION_COLUMNS)
		.eq('id', input.id)
		.eq('school_id', input.school.id)
		.maybeSingle();
	if (readError) throw new Error(`Invitation illisible : ${readError.message}`);
	if (!current) return { ok: false, reason: 'not_found' };
	if (current.used_at || current.cancelled_at) return { ok: false, reason: 'ended' };
	if (
		current.claimed_at &&
		new Date(current.claimed_at).getTime() > now.getTime() - CLAIM_WINDOW_MS
	) {
		return { ok: false, reason: 'in_use' };
	}
	if (current.sent_count >= INVITATION_MAX_SENDS) return { ok: false, reason: 'cap' };

	const token = newToken();
	const { data, error } = await service
		.from('private_lesson_invitations')
		.update({
			token_hash: sha256Hex(token),
			expires_at: inDays(INVITATION_VALIDITY_DAYS, now),
			email_sent_at: null
		})
		.eq('id', current.id)
		.eq('sent_count', current.sent_count)
		.is('used_at', null)
		.is('cancelled_at', null)
		.or(claimFreeFilter(now))
		.select(INVITATION_COLUMNS);
	if (error) throw new Error(`Invitation non renouvelée : ${error.message}`);
	// Changée entre la lecture et l'écriture (utilisée, annulée, renvoyée ailleurs).
	if (!data || data.length === 0) return { ok: false, reason: 'ended' };

	return sendAndRecord(service, send, data[0], token, input.school.name);
}

/** « Annuler » : le lien ne marche plus ; l'invitation quitte la liste. */
export async function cancelInvitation(
	service: Client,
	input: { id: string; schoolId: string },
	now: Date = new Date()
): Promise<CancelOutcome> {
	const { data, error } = await service
		.from('private_lesson_invitations')
		.update({ cancelled_at: now.toISOString() })
		.eq('id', input.id)
		.eq('school_id', input.schoolId)
		.is('used_at', null)
		.is('cancelled_at', null)
		.select('id');
	if (error) throw new Error(`Invitation non annulée : ${error.message}`);
	if (data && data.length > 0) return { ok: true };

	// Zéro ligne : inconnue, ou déjà finie (utilisée, annulée).
	const { data: existing, error: readError } = await service
		.from('private_lesson_invitations')
		.select('id')
		.eq('id', input.id)
		.eq('school_id', input.schoolId)
		.maybeSingle();
	if (readError) throw new Error(`Invitation illisible : ${readError.message}`);
	return { ok: false, reason: existing ? 'ended' : 'not_found' };
}

/**
 * Décision 8 : efface les invitations finies depuis plus de 30 jours. La fin est la date
 * d'utilisation, d'annulation, ou à défaut d'expiration. Une invitation en cours n'est
 * jamais touchée (son échéance est dans le futur, ou passée depuis moins de 30 jours).
 */
export async function purgeEndedInvitations(
	service: Client,
	now: Date = new Date()
): Promise<PurgeReport> {
	const cutoff = new Date(now.getTime() - INVITATION_RETENTION_DAYS * DAY_MS).toISOString();
	const table = () => service.from('private_lesson_invitations');

	const used = await table().delete().lt('used_at', cutoff).select('id');
	if (used.error) throw new Error(`Purge des utilisées : ${used.error.message}`);

	const cancelled = await table().delete().lt('cancelled_at', cutoff).select('id');
	if (cancelled.error) throw new Error(`Purge des annulées : ${cancelled.error.message}`);

	const expired = await table()
		.delete()
		.is('used_at', null)
		.is('cancelled_at', null)
		.lt('expires_at', cutoff)
		.select('id');
	if (expired.error) throw new Error(`Purge des expirées : ${expired.error.message}`);

	return {
		used: used.data?.length ?? 0,
		cancelled: cancelled.data?.length ?? 0,
		expired: expired.data?.length ?? 0
	};
}
