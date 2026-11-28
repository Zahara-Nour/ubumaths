/**
 * Carnet de liaison — adresses, confirmations et liens envoyés (ADR 0040 ; A1-A6, D2-D3, Q26)
 * ==========================================================================================
 *
 * Toutes les ÉCRITURES sur les adresses et les liens passent ici, par le service
 * role : aucun compte connecté n'a de droit d'écriture sur `parent_contacts` ni
 * sur `parent_carnet_links` (ajouter une adresse envoie un courriel). Les
 * appelants (pages du professeur, de l'élève, page « J'ai perdu mon lien ») font
 * leurs gardes AVANT : rôle, élève visé, limite de débit.
 *
 * Invariants :
 *  - rien ne part vers une adresse non confirmée, sauf le courriel de
 *    confirmation lui-même (A2, E7) ;
 *  - trois courriels de confirmation au plus par adresse (A4) ; un envoi que
 *    Brevo refuse ne compte pas ;
 *  - un lien neuf révoque le précédent (Q22) ; si son courriel ne part pas, le
 *    lien neuf est révoqué aussi : il compte alors comme « manquant » (Q29) ;
 *  - chaque courriel (parti ou non) laisse une ligne dans `parent_notifications`
 *    (C2, E6), sans l'adresse.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { schoolYearExpiry } from '#lib/server/school-year.ts';
import { sendCarnetConfirmationEmail, sendCarnetLinkEmail } from '#lib/server/email/brevo.ts';
import { CARNET_CONFIRM_DAYS } from '#lib/email-templates/carnet.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { carnetTokenSchema, generateCarnetToken, hashCarnetToken } from './carnet';

// Types

type SB = SupabaseClient<Database>;

export type ContactSource = 'teacher' | 'student';

/** Issue de l'ajout d'une adresse (A2-A5). */
export type AddContactOutcome =
	| 'sent'
	/** Adresse déjà connue, saisie par l'élève : rien ne part (il ne relance pas un quota) */
	| 'known'
	| 'already_confirmed'
	| 'refused'
	| 'limit'
	| 'quota'
	| 'send_failed';

/** Issue d'un courriel de confirmation (A2, A4). */
export type ConfirmationOutcome = 'sent' | 'not_pending' | 'quota' | 'send_failed';

/** Issue d'un lien envoyé (A1, A6, D2, Q26). */
export type LinkOutcome = 'sent' | 'not_confirmed' | 'not_issued' | 'send_failed';

export interface GrantedConsent {
	id: string;
	student_id: string;
	parent_email: string;
}

export interface KnownContact {
	id: string;
	student_id: string;
	email_hash: string;
	status: string;
}

/** Ce que « Envoyer les liens manquants » fera (Q29) — calculé sans rien écrire. */
export interface MissingLinksPlan {
	/** Consentements accordés sans adresse : à créer, confirmées (A1) */
	create: { student_id: string; email: string; consent_id: string }[];
	/** Adresses en attente qu'un consentement accordé confirme déjà */
	promote: { contact_id: string; consent_id: string }[];
	/** Adresses confirmées sans lien actif */
	link: string[];
}

// Constantes

const logger = createServerLogger('server/carnet/envois');

/** A3 : deux adresses actives (en attente ou confirmées) au plus par élève. */
export const MAX_ACTIVE_CONTACTS = 2;

/** A4 : trois courriels de confirmation au plus par adresse. */
export const MAX_CONFIRM_SENDS = 3;

/** Envois Brevo simultanés pendant un passage de classe. */
const SEND_CONCURRENCY = 4;

/** Une adresse saisie : normalisée comme le fait le trigger de la base. */
export const parentEmailSchema = z.string().trim().toLowerCase().max(254).email();

const confirmedSchema = z.object({ contact_id: z.string().uuid() });

// Functions

/** Même empreinte que le trigger `parent_contacts_normalize` (adresse déjà normalisée). */
export function hashParentEmail(normalizedEmail: string): string {
	return createHash('sha256').update(normalizedEmail).digest('hex');
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function studentFirstname(service: SB, studentId: string): Promise<string> {
	const { data, error } = await service
		.from('profiles')
		.select('firstname')
		.eq('id', studentId)
		.maybeSingle();
	if (error) logger.error('[profiles] prénom illisible', error);
	return data?.firstname?.trim() || 'votre enfant';
}

/** Fin de l'année scolaire de l'école de l'élève : expiration de son lien. */
async function studentLinkExpiry(service: SB, studentId: string): Promise<Date> {
	const { data, error } = await service
		.from('profiles')
		.select('school_id')
		.eq('id', studentId)
		.maybeSingle();
	if (error) {
		logger.error('[profiles] école illisible', error);
		throw new Error('Carnet illisible');
	}
	return schoolYearExpiry(service, data?.school_id ?? null);
}

/** Trace d'un courriel (C2, E6). Une trace perdue ne fait pas échouer l'envoi. */
async function logNotification(
	service: SB,
	row: {
		student_id: string;
		contact_id: string;
		kind: 'confirmation' | 'link';
		status: 'sent' | 'failed';
	}
): Promise<void> {
	const { error } = await service.from('parent_notifications').insert(row);
	if (error) logger.error('[parent_notifications] trace perdue', error);
}

/**
 * Courriel de confirmation (A2, A4). Le jeton précédent est remplacé : seul le
 * dernier courriel confirme. Réservation du quota par mise à jour conditionnelle
 * (deux envois simultanés ne dépassent pas 3), rendue si Brevo refuse.
 */
export async function sendContactConfirmation(
	contactId: string,
	teacherName: string | null,
	service: SB = createServiceRoleClient()
): Promise<ConfirmationOutcome> {
	const { data: contact, error } = await service
		.from('parent_contacts')
		.select('id, student_id, email, status, confirm_sent_count')
		.eq('id', contactId)
		.maybeSingle();
	if (error) {
		logger.error('[parent_contacts] lecture', error);
		throw new Error('Adresse illisible');
	}
	if (!contact || contact.status !== 'pending' || !contact.email) return 'not_pending';
	const count = contact.confirm_sent_count;
	if (count >= MAX_CONFIRM_SENDS) return 'quota';

	const token = generateCarnetToken();
	const now = new Date();
	const { data: reserved, error: reserveError } = await service
		.from('parent_contacts')
		.update({
			confirm_token_hash: hashCarnetToken(token),
			confirm_expires_at: addDays(now, CARNET_CONFIRM_DAYS).toISOString(),
			confirm_sent_count: count + 1,
			confirm_last_sent_at: now.toISOString()
		})
		.eq('id', contactId)
		.eq('status', 'pending')
		.eq('confirm_sent_count', count)
		.select('id');
	if (reserveError) {
		logger.error('[parent_contacts] réservation', reserveError);
		throw new Error('Confirmation impossible');
	}
	// Zéro ligne : un autre envoi est passé entre la lecture et la réservation.
	if (!reserved || reserved.length === 0) return 'quota';

	const sent = await sendCarnetConfirmationEmail(contact.email, {
		studentFirstname: await studentFirstname(service, contact.student_id),
		teacherName,
		token
	});
	await logNotification(service, {
		student_id: contact.student_id,
		contact_id: contactId,
		kind: 'confirmation',
		status: sent.success ? 'sent' : 'failed'
	});
	if (sent.success) return 'sent';

	// Brevo a refusé : l'envoi ne compte pas dans le quota.
	const { data: released, error: releaseError } = await service
		.from('parent_contacts')
		.update({ confirm_sent_count: count })
		.eq('id', contactId)
		.eq('confirm_sent_count', count + 1)
		.select('id');
	if (releaseError || !released?.length) {
		logger.error('[parent_contacts] quota non rendu', releaseError ?? 'aucune ligne');
	}
	return 'send_failed';
}

/**
 * Émettre un lien neuf pour une adresse CONFIRMÉE et l'envoyer (A1, A6, D2,
 * Q26). Le lien précédent est révoqué par la base. Si le courriel ne part pas,
 * le lien neuf est révoqué : personne ne le connaît, il compte comme manquant.
 */
export async function sendCarnetLink(
	contactId: string,
	service: SB = createServiceRoleClient()
): Promise<LinkOutcome> {
	const { data: contact, error } = await service
		.from('parent_contacts')
		.select('id, student_id, email, status')
		.eq('id', contactId)
		.maybeSingle();
	if (error) {
		logger.error('[parent_contacts] lecture', error);
		throw new Error('Adresse illisible');
	}
	if (!contact || contact.status !== 'confirmed' || !contact.email) return 'not_confirmed';

	// Carnet fermé (classe désactivée ou archivée, élève sorti) : un lien
	// n'ouvrirait que « lien plus valide ». La fonction SQL ne regarde que la
	// coupure du partage ; cette porte-ci regarde tout (B4).
	const { data: shared, error: sharedError } = await service.rpc('carnet_student_is_shared', {
		p_student_id: contact.student_id
	});
	if (sharedError) {
		logger.error('[carnet_student_is_shared]', sharedError);
		throw new Error('Carnet illisible');
	}
	if (shared !== true) return 'not_issued';

	const expiresAt = await studentLinkExpiry(service, contact.student_id);
	const token = generateCarnetToken();
	const tokenHash = hashCarnetToken(token);
	const { data: issued, error: issueError } = await service.rpc('issue_parent_carnet_link', {
		p_contact_id: contactId,
		p_token_hash: tokenHash,
		p_expires_at: expiresAt.toISOString()
	});
	if (issueError) {
		logger.error('[issue_parent_carnet_link]', issueError);
		throw new Error('Lien du carnet impossible');
	}
	// Partage coupé entre-temps (opt-out, revérifié sous verrou) : aucun lien.
	if (issued !== true) return 'not_issued';

	const sent = await sendCarnetLinkEmail(contact.email, {
		studentFirstname: await studentFirstname(service, contact.student_id),
		token,
		expiresAt
	});
	await logNotification(service, {
		student_id: contact.student_id,
		contact_id: contactId,
		kind: 'link',
		status: sent.success ? 'sent' : 'failed'
	});
	if (sent.success) return 'sent';

	// Sans cette révocation, un lien que personne ne connaît masquerait
	// l'adresse dans le plan des liens manquants.
	const { data: revoked, error: revokeError } = await service
		.from('parent_carnet_links')
		.update({ revoked_at: new Date().toISOString() })
		.eq('token_hash', tokenHash)
		.is('revoked_at', null)
		.select('id');
	if (revokeError || !revoked?.length) {
		logger.error('[parent_carnet_links] lien non remis non révoqué', revokeError ?? 'aucune ligne');
	}
	return 'send_failed';
}

/**
 * Confirmer une adresse puis lui ENVOYER le lien du carnet (A2, Q26). La page de
 * confirmation n'affiche plus le carnet : un antivirus qui « clique » sur
 * « Confirmer » ne l'emporte pas. `null` = confirmation refusée (déjà utilisée,
 * échue, inconnue) ; `linkSent: false` = adresse confirmée, lien non parti
 * (partage coupé, Brevo en échec) — le professeur l'enverra (D2).
 */
export async function confirmContactAndSendLink(
	token: string,
	service: SB = createServiceRoleClient()
): Promise<{ linkSent: boolean } | null> {
	if (!carnetTokenSchema.safeParse(token).success) return null;

	const { data, error } = await service.rpc('confirm_parent_contact', { p_token: token });
	if (error) {
		logger.error('[confirm_parent_contact]', error);
		throw new Error('Confirmation indisponible');
	}
	if (data === null) return null;
	const parsed = confirmedSchema.safeParse(data);
	if (!parsed.success) {
		logger.error('[confirm_parent_contact] réponse mal formée', parsed.error.issues);
		throw new Error('Confirmation indisponible');
	}

	// L'adresse est DÉJÀ confirmée (jeton consommé) : une erreur ici laisserait le
	// parent devant « lien déjà utilisé » au second essai. On dit « confirmée ».
	try {
		return { linkSent: (await sendCarnetLink(parsed.data.contact_id, service)) === 'sent' };
	} catch (err) {
		logger.error('[confirmContactAndSendLink] lien non envoyé', err);
		return { linkSent: false };
	}
}

/**
 * Ajouter une adresse (A2) et lui envoyer la confirmation. Une adresse déjà
 * connue de cet élève n'est pas recréée (unicité élève × empreinte) : en
 * attente → nouvelle confirmation ; invalide → remise en attente ; refusée →
 * jamais (A5) ; confirmée → rien.
 */
export async function addParentContact(
	input: {
		studentId: string;
		email: string;
		source: ContactSource;
		createdBy: string;
		teacherName: string | null;
	},
	service: SB = createServiceRoleClient()
): Promise<AddContactOutcome> {
	const email = parentEmailSchema.parse(input.email);
	const emailHash = hashParentEmail(email);

	const findExisting = () =>
		service
			.from('parent_contacts')
			.select('id, status, confirm_sent_count')
			.eq('student_id', input.studentId)
			.eq('email_hash', emailHash)
			.maybeSingle();

	let { data: existing, error } = await findExisting();
	let isNew = false;
	if (error) {
		logger.error('[parent_contacts] recherche', error);
		throw new Error('Adresses illisibles');
	}

	if (!existing) {
		const { data: created, error: insertError } = await service
			.from('parent_contacts')
			.insert({
				student_id: input.studentId,
				email,
				email_hash: emailHash,
				status: 'pending',
				source: input.source,
				created_by: input.createdBy
			})
			.select('id, status, confirm_sent_count')
			.single();
		if (insertError?.code === 'UBP01') return 'limit';
		if (insertError?.code === '23505') {
			// Ajout simultané de la même adresse : on reprend la ligne gagnante.
			({ data: existing, error } = await findExisting());
			if (error || !existing) {
				logger.error('[parent_contacts] relecture après 23505', error);
				throw new Error('Adresses illisibles');
			}
		} else if (insertError || !created) {
			logger.error('[parent_contacts] création', insertError);
			throw new Error('Adresse non enregistrée');
		} else {
			existing = created;
			isNew = true;
		}
	}

	// L'élève ne relance pas une adresse déjà connue : chaque ressaisie
	// consommerait une des 3 confirmations (A4), et la réponse lui dirait l'état
	// d'une adresse de ses parents. Seul l'ajout d'une adresse NEUVE envoie.
	if (input.source === 'student' && !isNew) return 'known';

	switch (existing.status) {
		case 'refused':
			return 'refused';
		case 'confirmed':
			return 'already_confirmed';
		case 'removed': {
			// Retirée par le professeur, ressaisie par lui (l'élève a reçu « known »
			// plus haut) : un geste délibéré, quota remis à zéro.
			const { data: reset, error: resetError } = await service
				.from('parent_contacts')
				.update({
					status: 'pending',
					email,
					confirm_sent_count: 0,
					confirmed_at: null,
					emails_stopped_at: null,
					consent_id: null,
					source: 'teacher'
				})
				.eq('id', existing.id)
				.eq('status', 'removed')
				.select('id');
			if (resetError?.code === 'UBP01') return 'limit';
			if (resetError || !reset?.length) {
				logger.error(
					'[parent_contacts] remise d’une adresse retirée',
					resetError ?? 'aucune ligne'
				);
				throw new Error('Adresse non enregistrée');
			}
			break;
		}
		case 'invalid': {
			// Quota épuisé : la remettre en attente lui ferait occuper une des deux
			// places sans qu'aucun courriel puisse partir.
			if (existing.confirm_sent_count >= MAX_CONFIRM_SENDS) return 'quota';
			const { error: resetError } = await service
				.from('parent_contacts')
				.update({ status: 'pending' })
				.eq('id', existing.id)
				.eq('status', 'invalid');
			if (resetError?.code === 'UBP01') return 'limit';
			if (resetError) {
				logger.error('[parent_contacts] remise en attente', resetError);
				throw new Error('Adresse non enregistrée');
			}
			break;
		}
	}

	const outcome = await sendContactConfirmation(existing.id, input.teacherName, service);
	// L'adresse a quitté « en attente » entre-temps (confirmée par un autre geste).
	return outcome === 'not_pending' ? 'already_confirmed' : outcome;
}

/**
 * Ce que « Envoyer les liens manquants » fera (A1, Q29) : fonction pure, sans
 * écriture, partagée par l'annonce « Activer enverra N courriels » (Q30) et par
 * l'envoi lui-même.
 *
 * - un consentement accordé dont l'adresse n'est pas connue → adresse créée,
 *   confirmée, dans la limite de deux adresses actives par élève ;
 * - une adresse en attente qu'un consentement accordé couvre → confirmée ;
 * - une adresse refusée ou invalide → jamais rien ;
 * - toute adresse confirmée sans lien actif → un lien.
 */
export function planMissingLinks(
	studentIds: readonly string[],
	consents: readonly GrantedConsent[],
	contacts: readonly KnownContact[],
	contactsWithActiveLink: ReadonlySet<string>
): MissingLinksPlan {
	const plan: MissingLinksPlan = { create: [], promote: [], link: [] };
	const students = new Set(studentIds);

	for (const studentId of students) {
		const own = contacts.filter((c) => c.student_id === studentId);
		let active = own.filter((c) => c.status === 'pending' || c.status === 'confirmed').length;
		const known = new Map(own.map((c) => [c.email_hash, c]));
		const promoted = new Set<string>();

		for (const consent of consents) {
			if (consent.student_id !== studentId) continue;
			const parsed = parentEmailSchema.safeParse(consent.parent_email);
			if (!parsed.success) continue;
			const hash = hashParentEmail(parsed.data);
			const contact = known.get(hash);
			if (contact) {
				if (contact.status === 'pending' && !promoted.has(contact.id)) {
					plan.promote.push({ contact_id: contact.id, consent_id: consent.id });
					promoted.add(contact.id);
				}
				continue;
			}
			if (active >= MAX_ACTIVE_CONTACTS) continue;
			plan.create.push({ student_id: studentId, email: parsed.data, consent_id: consent.id });
			// Deux consentements à la même adresse : une seule adresse.
			known.set(hash, { id: '', student_id: studentId, email_hash: hash, status: 'planned' });
			active += 1;
		}

		for (const contact of own) {
			if (contact.status === 'confirmed' && !contactsWithActiveLink.has(contact.id)) {
				plan.link.push(contact.id);
			}
		}
	}

	return plan;
}

/** Nombre de courriels que le plan enverra (Q30). */
export function missingLinksCount(plan: MissingLinksPlan): number {
	return plan.create.length + plan.promote.length + plan.link.length;
}

/**
 * Lire, pour une classe, ce que `planMissingLinks` demande : élèves actifs dont
 * le partage n'est pas coupé, consentements accordés, adresses et liens actifs.
 */
export async function planClassMissingLinks(
	classId: string,
	service: SB = createServiceRoleClient()
): Promise<MissingLinksPlan> {
	const { data: members, error: membersError } = await service
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('status', 'active');
	if (membersError) {
		logger.error('[class_members]', membersError);
		throw new Error('Élèves illisibles');
	}
	const memberIds = (members ?? []).map((m) => m.student_id);
	if (memberIds.length === 0) return { create: [], promote: [], link: [] };

	const [optOuts, consents, contacts] = await Promise.all([
		service.from('student_carnet_opt_outs').select('student_id').in('student_id', memberIds),
		service
			.from('parental_consents')
			.select('id, student_id, parent_email')
			.in('student_id', memberIds)
			.eq('status', 'granted'),
		service
			.from('parent_contacts')
			.select('id, student_id, email_hash, status')
			.in('student_id', memberIds)
	]);
	for (const result of [optOuts, consents, contacts]) {
		if (result.error) {
			logger.error('[planClassMissingLinks]', result.error);
			throw new Error('Carnet de la classe illisible');
		}
	}

	const confirmedIds = (contacts.data ?? [])
		.filter((c) => c.status === 'confirmed')
		.map((c) => c.id);
	let activeLinks = new Set<string>();
	if (confirmedIds.length > 0) {
		const { data: links, error: linksError } = await service
			.from('parent_carnet_links')
			.select('contact_id')
			.in('contact_id', confirmedIds)
			.is('revoked_at', null)
			.gt('expires_at', new Date().toISOString());
		if (linksError) {
			logger.error('[parent_carnet_links]', linksError);
			throw new Error('Liens illisibles');
		}
		activeLinks = new Set((links ?? []).map((l) => l.contact_id));
	}

	const stopped = new Set((optOuts.data ?? []).map((o) => o.student_id));
	return planMissingLinks(
		memberIds.filter((id) => !stopped.has(id)),
		consents.data ?? [],
		contacts.data ?? [],
		activeLinks
	);
}

/** Lance `task` sur chaque élément, `limit` à la fois. */
async function eachLimited<T, R>(
	items: readonly T[],
	limit: number,
	task: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const index = next++;
			results[index] = await task(items[index]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/**
 * Envoyer les liens manquants d'une classe (A1, Q29) : crée ou confirme les
 * adresses des consentements accordés, puis envoie un lien à chaque adresse
 * confirmée qui n'en a pas. L'appelant a vérifié que le carnet de la classe est
 * activé. Rejouable sans doublon : une adresse qui a reçu son lien n'est plus
 * « manquante ». `maxLinks` borne les liens envoyés (passage quotidien, Q36).
 */
export async function sendClassMissingLinks(
	classId: string,
	service: SB = createServiceRoleClient(),
	maxLinks = Number.POSITIVE_INFINITY
): Promise<{ sent: number; failed: number }> {
	const plan = await planClassMissingLinks(classId, service);
	const now = new Date().toISOString();
	const toLink = [...plan.link];
	let failed = 0;

	for (const row of plan.create) {
		const { data, error } = await service
			.from('parent_contacts')
			.insert({
				student_id: row.student_id,
				email: row.email,
				email_hash: hashParentEmail(row.email),
				status: 'confirmed',
				source: 'consent',
				consent_id: row.consent_id,
				confirmed_at: now
			})
			.select('id')
			.single();
		// UBP01 (deux adresses déjà) ou 23505 (ajout simultané) : rien à envoyer.
		if (error) {
			if (error.code !== 'UBP01' && error.code !== '23505') {
				logger.error('[parent_contacts] adresse du consentement', error);
				failed += 1;
			}
			continue;
		}
		toLink.push(data.id);
	}

	for (const row of plan.promote) {
		const { data, error } = await service
			.from('parent_contacts')
			.update({
				status: 'confirmed',
				confirmed_at: now,
				consent_id: row.consent_id,
				confirm_token_hash: null,
				confirm_expires_at: null
			})
			.eq('id', row.contact_id)
			.eq('status', 'pending')
			.select('id');
		if (error) {
			logger.error('[parent_contacts] confirmation par le consentement', error);
			failed += 1;
			continue;
		}
		if (data && data.length > 0) toLink.push(row.contact_id);
	}

	// Plafond du passage quotidien (Q36) : le reste est encore « manquant »
	// demain (une adresse confirmée ici sans lien l'est aussi).
	const outcomes = await eachLimited(
		toLink.slice(0, maxLinks),
		SEND_CONCURRENCY,
		async (contactId) => {
			try {
				return await sendCarnetLink(contactId, service);
			} catch (err) {
				logger.error('[sendClassMissingLinks] lien', err);
				return 'send_failed' as const;
			}
		}
	);
	const sent = outcomes.filter((o) => o === 'sent').length;
	failed += outcomes.filter((o) => o === 'send_failed').length;
	return { sent, failed };
}

/**
 * Retirer une adresse (D2, Q31) : adresse effacée (son empreinte reste), liens
 * révoqués par trigger, place libérée. Elle ne revient ni par l'élève, ni par
 * un consentement, ni par « lien perdu » ; le professeur seul peut la
 * ressaisir. Rend `false` si l'adresse était déjà retirée ou refusée.
 */
export async function removeParentContact(
	contactId: string,
	service: SB = createServiceRoleClient()
): Promise<boolean> {
	const { data, error } = await service
		.from('parent_contacts')
		.update({
			status: 'removed',
			email: null,
			confirm_token_hash: null,
			confirm_expires_at: null
		})
		.eq('id', contactId)
		.in('status', ['pending', 'confirmed', 'invalid'])
		.select('id');
	if (error) {
		logger.error('[parent_contacts] retrait', error);
		throw new Error('Retrait impossible');
	}
	return (data?.length ?? 0) > 0;
}

/**
 * Rétablir le partage (D3) : le professeur a retiré l'opt-out ; chaque adresse
 * confirmée reçoit un lien NEUF (les anciens restent morts).
 */
export async function sendLinksToConfirmedContacts(
	studentId: string,
	service: SB = createServiceRoleClient()
): Promise<{ sent: number; failed: number }> {
	const { data, error } = await service
		.from('parent_contacts')
		.select('id')
		.eq('student_id', studentId)
		.eq('status', 'confirmed');
	if (error) {
		logger.error('[parent_contacts] adresses confirmées', error);
		throw new Error('Adresses illisibles');
	}
	const outcomes = await eachLimited(data ?? [], SEND_CONCURRENCY, (c) =>
		sendCarnetLink(c.id, service).catch((err: unknown) => {
			logger.error('[sendLinksToConfirmedContacts]', err);
			return 'send_failed' as const;
		})
	);
	return {
		sent: outcomes.filter((o) => o === 'sent').length,
		failed: outcomes.filter((o) => o === 'send_failed').length
	};
}

/**
 * « J'ai perdu mon lien » (A6) : chaque élève dont cette adresse est confirmée
 * et le carnet ouvert reçoit un lien neuf (frères et sœurs : un courriel par
 * élève). Ne rend RIEN : l'appelant répond la même chose dans tous les cas, et
 * lance ce travail après la réponse (sa durée trahirait une adresse connue).
 */
export async function resendLostLinks(
	rawEmail: string,
	service: SB = createServiceRoleClient()
): Promise<void> {
	const parsed = parentEmailSchema.safeParse(rawEmail);
	if (!parsed.success) return;

	const { data, error } = await service
		.from('parent_contacts')
		.select('id, student_id')
		.eq('email', parsed.data)
		.eq('status', 'confirmed');
	if (error) {
		logger.error('[parent_contacts] lien perdu', error);
		return;
	}

	// Carnet fermé : `sendCarnetLink` ne fait rien (« not_issued »).
	for (const contact of data ?? []) {
		try {
			await sendCarnetLink(contact.id, service);
		} catch (err) {
			logger.error('[resendLostLinks]', err);
		}
	}
}
