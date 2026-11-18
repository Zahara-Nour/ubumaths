/**
 * Carnet de liaison — le côté professeur, par classe (ADR 0040 ; D1-D3, A1-A5, Q28-Q30)
 * ====================================================================================
 *
 * - Réglages de la classe (D1) : activer, seuils des exceptions, message
 *   trimestriel. Le carnet part au geste du professeur (Q17) : « Activer »
 *   annonce d'abord le nombre de courriels (Q30), puis envoie les liens des
 *   consentements accordés (A1).
 * - Par élève (D2-D3) : état de chaque adresse, ajouter une adresse, renvoyer une
 *   confirmation, révoquer un lien, envoyer un nouveau lien, couper ou rétablir
 *   le partage.
 * - « Envoyer les liens manquants » rejoue l'activation (élève arrivé après,
 *   consentement accordé après ; Q29).
 *
 * Lectures par le client du professeur (RLS + droits par colonne : jamais les
 * empreintes). Écritures sur les adresses et les liens par le serveur
 * (`#lib/server/carnet/envois.ts`, service role), APRÈS la garde de rôle et la
 * vérification que l'élève visé est un membre actif de CETTE classe.
 */

import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { requireTeacherOfClass } from '#lib/server/stats/teacher-class-auth.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { isBrevoConfigured } from '#lib/server/email/brevo.ts';
import {
	addParentContact,
	missingLinksCount,
	planClassMissingLinks,
	removeParentContact,
	sendCarnetLink,
	sendClassMissingLinks,
	sendContactConfirmation,
	sendLinksToConfirmedContacts,
	type AddContactOutcome,
	type ConfirmationOutcome,
	type LinkOutcome
} from '#lib/server/carnet/envois.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types

export type ContactStatus = 'pending' | 'confirmed' | 'refused' | 'invalid' | 'removed';

export interface CarnetContactRow {
	id: string;
	email: string | null;
	status: ContactStatus;
	source: string;
	confirm_expires_at: string | null;
	confirm_sent_count: number;
	confirmed_at: string | null;
	emails_stopped_at: string | null;
	/** Lien actif (non révoqué, non échu) */
	link: { expires_at: string; last_accessed_at: string | null } | null;
	/** Dernier courriel envoyé à cette adresse a échoué (E6) */
	last_send_failed: boolean;
}

export interface CarnetStudentRow {
	id: string;
	name: string;
	opted_out: boolean;
	contacts: CarnetContactRow[];
}

// Constantes

const logger = createServerLogger(
	'(protected)/dashboard/teacher/classes/[classId]/carnet/+page.server'
);

const uuid = z.string().uuid();

/** Seuils par défaut (Q7), ceux de la table. */
const DEFAULT_CARNET_SETTINGS = {
	enabled: false,
	evaluation_missed_alert: true,
	overdue_reviews_days: 7,
	inactivity_days: 15,
	quarterly_message: true
};

const settingsSchema = z.object({
	evaluation_missed_alert: z.literal('on').optional(),
	overdue_reviews_days: z.coerce.number().int().min(1).max(60),
	inactivity_days: z.coerce.number().int().min(3).max(60),
	quarterly_message: z.literal('on').optional()
});

const studentFormSchema = z.object({ student_id: uuid });
const contactFormSchema = z.object({ contact_id: uuid });
const addFormSchema = z.object({ student_id: uuid, email: z.string().max(320) });

const ADD_MESSAGES: Record<AddContactOutcome, string> = {
	sent: 'Courriel de confirmation envoyé. Le lien du carnet partira après le clic du parent.',
	known: 'Cette adresse est déjà enregistrée pour cet élève.',
	already_confirmed: 'Cette adresse est déjà confirmée pour cet élève.',
	refused:
		'Le destinataire a répondu « Je ne suis pas le parent de cet élève » : cette adresse ne peut plus être saisie pour lui.',
	limit: 'Deux parents reçoivent déjà ce carnet.',
	quota: 'Trois courriels de confirmation sont déjà partis vers cette adresse.',
	send_failed: "Le courriel n'a pas pu partir (Brevo). Réessayez plus tard."
};

const CONFIRMATION_MESSAGES: Record<ConfirmationOutcome, string> = {
	sent: 'Confirmation renvoyée.',
	not_pending: "Cette adresse n'attend plus de confirmation.",
	quota: 'Trois courriels de confirmation sont déjà partis vers cette adresse.',
	send_failed: "Le courriel n'a pas pu partir (Brevo). Réessayez plus tard."
};

const LINK_MESSAGES: Record<LinkOutcome, string> = {
	sent: "Nouveau lien envoyé. L'ancien ne fonctionne plus.",
	not_confirmed: "Cette adresse n'est pas confirmée : aucun lien ne peut lui être envoyé.",
	not_issued: 'Le partage est coupé pour cet élève : aucun lien.',
	send_failed: "Le courriel n'a pas pu partir (Brevo) : aucun lien actif. Réessayez plus tard."
};

// Functions

function classIdOf(params: { classId: string }): string {
	const parsed = uuid.safeParse(params.classId);
	if (!parsed.success) throw error(400, 'Classe invalide');
	return parsed.data;
}

function studentName(p: { firstname: string | null; lastname: string | null } | null): string {
	return (
		[p?.firstname, p?.lastname].filter((x): x is string => !!x?.trim()).join(' ') ||
		'Élève sans nom'
	);
}

function readForm<T>(schema: z.ZodType<T>, formData: FormData): T | null {
	const parsed = schema.safeParse(Object.fromEntries(formData));
	return parsed.success ? parsed.data : null;
}

/** L'élève est-il un membre ACTIF de cette classe ? (garde de chaque geste par élève) */
async function isActiveMember(classId: string, studentId: string): Promise<boolean> {
	const { data, error: memberError } = await createServiceRoleClient()
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('student_id', studentId)
		.eq('status', 'active')
		.maybeSingle();
	if (memberError) {
		logger.error('[class_members] appartenance', memberError);
		throw error(500, 'Classe illisible');
	}
	return !!data;
}

/** L'adresse visée appartient-elle à un élève actif de cette classe ? */
async function contactOfClass(classId: string, contactId: string): Promise<boolean> {
	const { data, error: contactError } = await createServiceRoleClient()
		.from('parent_contacts')
		.select('student_id')
		.eq('id', contactId)
		.maybeSingle();
	if (contactError) {
		logger.error('[parent_contacts] appartenance', contactError);
		throw error(500, 'Adresse illisible');
	}
	return !!data && (await isActiveMember(classId, data.student_id));
}

async function carnetEnabled(event: RequestEvent, classId: string): Promise<boolean> {
	const { data, error: settingsError } = await event.locals.supabase
		.from('class_carnet_settings')
		.select('enabled')
		.eq('class_id', classId)
		.maybeSingle();
	if (settingsError) {
		logger.error('[class_carnet_settings]', settingsError);
		throw error(500, 'Réglages illisibles');
	}
	return data?.enabled === true;
}

function requireBrevo(): void {
	if (!isBrevoConfigured()) {
		throw error(503, "Le service d'envoi de courriels n'est pas configuré.");
	}
}

function teacherNameOf(profile: {
	firstname: string | null;
	lastname: string | null;
}): string | null {
	return [profile.firstname, profile.lastname].filter((x) => !!x?.trim()).join(' ') || null;
}

/** Garde commune des gestes par adresse : rôle, forme, appartenance à la classe. */
async function guardContact(
	event: RequestEvent
): Promise<{ classId: string; contactId: string; teacherName: string | null }> {
	const classId = classIdOf(event.params);
	const { profile } = await requireTeacherOfClass(event.locals, classId);
	const form = readForm(contactFormSchema, await event.request.formData());
	if (!form || !(await contactOfClass(classId, form.contact_id))) {
		throw error(404, 'Adresse introuvable dans cette classe');
	}
	return { classId, contactId: form.contact_id, teacherName: teacherNameOf(profile) };
}

/** Garde commune des gestes par élève. */
async function guardStudent(
	event: RequestEvent,
	formData?: FormData
): Promise<{ classId: string; studentId: string; userId: string; teacherName: string | null }> {
	const classId = classIdOf(event.params);
	const { user, profile } = await requireTeacherOfClass(event.locals, classId);
	const form = readForm(studentFormSchema, formData ?? (await event.request.formData()));
	if (!form || !(await isActiveMember(classId, form.student_id))) {
		throw error(404, 'Élève introuvable dans cette classe');
	}
	return {
		classId,
		studentId: form.student_id,
		userId: user.id,
		teacherName: teacherNameOf(profile)
	};
}

function sentMessage({ sent, failed }: { sent: number; failed: number }): string {
	const parts = [
		sent === 0
			? 'Aucun lien à envoyer.'
			: `${sent} lien${sent > 1 ? 's' : ''} envoyé${sent > 1 ? 's' : ''}.`
	];
	if (failed > 0) {
		parts.push(
			`${failed} envoi${failed > 1 ? 's' : ''} en échec : « Envoyer les liens manquants » les reprendra.`
		);
	}
	return parts.join(' ');
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const classId = classIdOf(params);
	const { classRow } = await requireTeacherOfClass(locals, classId);
	const supabase = locals.supabase;

	const [settingsRes, membersRes] = await Promise.all([
		supabase
			.from('class_carnet_settings')
			.select(
				'enabled, evaluation_missed_alert, overdue_reviews_days, inactivity_days, quarterly_message'
			)
			.eq('class_id', classId)
			.maybeSingle(),
		supabase
			.from('class_members')
			.select('student_id, profiles!class_members_student_id_fkey(firstname, lastname)')
			.eq('class_id', classId)
			.eq('status', 'active')
	]);
	if (settingsRes.error || membersRes.error) {
		logger.error('[carnet prof] lecture', settingsRes.error ?? membersRes.error);
		throw error(500, 'Impossible de charger le carnet de la classe');
	}

	type MemberRow = {
		student_id: string;
		profiles: { firstname: string | null; lastname: string | null } | null;
	};
	const members = (membersRes.data ?? []) as unknown as MemberRow[];
	const studentIds = members.map((m) => m.student_id);

	let contactRows: (Omit<CarnetContactRow, 'link' | 'last_send_failed'> & {
		student_id: string;
	})[] = [];
	let optedOut = new Set<string>();
	const links = new Map<string, CarnetContactRow['link']>();
	const lastFailed = new Set<string>();

	if (studentIds.length > 0) {
		const [contactsRes, optOutsRes, notificationsRes] = await Promise.all([
			supabase
				.from('parent_contacts')
				.select(
					'id, student_id, email, status, source, confirm_expires_at, confirm_sent_count, confirmed_at, emails_stopped_at, created_at'
				)
				.in('student_id', studentIds)
				.order('created_at', { ascending: true }),
			supabase.from('student_carnet_opt_outs').select('student_id').in('student_id', studentIds),
			supabase
				.from('parent_notifications')
				.select('contact_id, status, created_at')
				.in('student_id', studentIds)
				.in('kind', ['confirmation', 'link'])
				.order('created_at', { ascending: false })
				.limit(1000)
		]);
		if (contactsRes.error || optOutsRes.error || notificationsRes.error) {
			logger.error(
				'[carnet prof] adresses',
				contactsRes.error ?? optOutsRes.error ?? notificationsRes.error
			);
			throw error(500, 'Impossible de charger les adresses des parents');
		}
		contactRows = (contactsRes.data ?? []).map((c) => ({
			...c,
			status: c.status as ContactStatus
		}));
		optedOut = new Set((optOutsRes.data ?? []).map((o) => o.student_id));

		// Le DERNIER courriel de chaque adresse : en échec → le professeur le voit (E6).
		const seen = new Set<string>();
		for (const n of notificationsRes.data ?? []) {
			if (!n.contact_id || seen.has(n.contact_id)) continue;
			seen.add(n.contact_id);
			if (n.status === 'failed') lastFailed.add(n.contact_id);
		}

		const contactIds = contactRows.map((c) => c.id);
		if (contactIds.length > 0) {
			const { data: linkRows, error: linksError } = await supabase
				.from('parent_carnet_links')
				.select('contact_id, expires_at, last_accessed_at')
				.in('contact_id', contactIds)
				.is('revoked_at', null)
				.gt('expires_at', new Date().toISOString());
			if (linksError) {
				logger.error('[carnet prof] liens', linksError);
				throw error(500, 'Impossible de charger les liens');
			}
			for (const l of linkRows ?? []) {
				links.set(l.contact_id, { expires_at: l.expires_at, last_accessed_at: l.last_accessed_at });
			}
		}
	}

	const students: CarnetStudentRow[] = members
		.map((m) => ({
			id: m.student_id,
			name: studentName(m.profiles),
			opted_out: optedOut.has(m.student_id),
			contacts: contactRows
				.filter((c) => c.student_id === m.student_id)
				.map(({ student_id: _s, ...c }) => ({
					...c,
					link: links.get(c.id) ?? null,
					last_send_failed: lastFailed.has(c.id)
				}))
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

	// Q30 : ce que « Activer » ou « Envoyer les liens manquants » enverra.
	let missingLinks: number | null = null;
	try {
		missingLinks = missingLinksCount(await planClassMissingLinks(classId));
	} catch (e) {
		logger.error('[carnet prof] liens manquants', e);
	}

	return {
		classRow,
		settings: settingsRes.data ?? DEFAULT_CARNET_SETTINGS,
		students,
		missingLinks,
		brevoConfigured: isBrevoConfigured()
	};
};

export const actions: Actions = {
	/** D1 : seuils et message trimestriel. N'active ni ne désactive. */
	saveSettings: async (event) => {
		const classId = classIdOf(event.params);
		await requireTeacherOfClass(event.locals, classId);
		const form = readForm(settingsSchema, await event.request.formData());
		if (!form) return fail(400, { message: 'Réglages invalides.' });

		const { data, error: saveError } = await event.locals.supabase
			.from('class_carnet_settings')
			.upsert(
				{
					class_id: classId,
					evaluation_missed_alert: form.evaluation_missed_alert === 'on',
					overdue_reviews_days: form.overdue_reviews_days,
					inactivity_days: form.inactivity_days,
					quarterly_message: form.quarterly_message === 'on',
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'class_id' }
			)
			.select('class_id');
		if (saveError || !data?.length) {
			logger.error('[class_carnet_settings] enregistrement', saveError);
			return fail(500, { message: "Les réglages n'ont pas été enregistrés." });
		}
		return { message: 'Réglages enregistrés.' };
	},

	/** Q17, A1 : activer le carnet de la classe, puis envoyer les liens des consentements. */
	activate: async (event) => {
		const classId = classIdOf(event.params);
		await requireTeacherOfClass(event.locals, classId);
		requireBrevo();

		const { data, error: saveError } = await event.locals.supabase
			.from('class_carnet_settings')
			.upsert(
				{ class_id: classId, enabled: true, updated_at: new Date().toISOString() },
				{ onConflict: 'class_id' }
			)
			.select('class_id');
		if (saveError || !data?.length) {
			logger.error('[class_carnet_settings] activation', saveError);
			return fail(500, { message: "Le carnet n'a pas été activé." });
		}
		const result = await sendClassMissingLinks(classId);
		return { message: `Carnet activé. ${sentMessage(result)}` };
	},

	/** Désactiver : les carnets de la classe se ferment (B4), aucun courriel. */
	deactivate: async (event) => {
		const classId = classIdOf(event.params);
		await requireTeacherOfClass(event.locals, classId);
		const { data, error: saveError } = await event.locals.supabase
			.from('class_carnet_settings')
			.update({ enabled: false, updated_at: new Date().toISOString() })
			.eq('class_id', classId)
			.select('class_id');
		if (saveError || !data?.length) {
			logger.error('[class_carnet_settings] désactivation', saveError);
			return fail(500, { message: "Le carnet n'a pas été désactivé." });
		}
		return {
			message:
				'Carnet désactivé : les parents de cette classe voient « lien plus valide ». Le réactiver rouvre les mêmes liens.'
		};
	},

	/** Q29 : rejouer l'activation (élève arrivé après, consentement accordé après, échecs). */
	sendMissing: async (event) => {
		const classId = classIdOf(event.params);
		await requireTeacherOfClass(event.locals, classId);
		requireBrevo();
		if (!(await carnetEnabled(event, classId))) {
			return fail(409, { message: "Le carnet de cette classe n'est pas activé." });
		}
		return { message: sentMessage(await sendClassMissingLinks(classId)) };
	},

	/** A2 : le professeur saisit une adresse ; elle ne reçoit qu'une confirmation. */
	addContact: async (event) => {
		const formData = await event.request.formData();
		const form = readForm(addFormSchema, formData);
		if (!form) return fail(400, { message: 'Adresse invalide.' });
		const { classId, studentId, userId, teacherName } = await guardStudent(event, formData);
		requireBrevo();
		if (!(await carnetEnabled(event, classId))) {
			return fail(409, { message: "Activez d'abord le carnet de la classe." });
		}

		let outcome: AddContactOutcome;
		try {
			outcome = await addParentContact({
				studentId,
				email: form.email,
				source: 'teacher',
				createdBy: userId,
				teacherName
			});
		} catch (e) {
			if (e instanceof z.ZodError) return fail(400, { message: 'Adresse invalide.' });
			throw e;
		}
		const message = ADD_MESSAGES[outcome];
		return outcome === 'sent' ? { message } : fail(409, { message });
	},

	/** A4 : renvoyer la confirmation (3 envois au plus). */
	resendConfirmation: async (event) => {
		const { contactId, teacherName } = await guardContact(event);
		requireBrevo();
		const outcome = await sendContactConfirmation(contactId, teacherName);
		const message = CONFIRMATION_MESSAGES[outcome];
		return outcome === 'sent' ? { message } : fail(409, { message });
	},

	/** D2, Q31 : retirer une adresse — son lien meurt et ne revient pas tout seul. */
	removeContact: async (event) => {
		const { contactId } = await guardContact(event);
		const removed = await removeParentContact(contactId);
		if (!removed) return fail(409, { message: 'Cette adresse est déjà retirée.' });
		return {
			message:
				'Adresse retirée : son lien ne fonctionne plus et elle ne recevra plus rien. Vous seul pouvez la ressaisir. Les liens du cahier et du cours de la classe restent ouverts.'
		};
	},

	/** D2 : envoyer un nouveau lien (l'ancien est révoqué). */
	sendNewLink: async (event) => {
		const { classId, contactId } = await guardContact(event);
		requireBrevo();
		if (!(await carnetEnabled(event, classId))) {
			return fail(409, { message: "Le carnet de cette classe n'est pas activé." });
		}
		const outcome = await sendCarnetLink(contactId);
		const message = LINK_MESSAGES[outcome];
		return outcome === 'sent' ? { message } : fail(409, { message });
	},

	/** D3 : couper le partage (élève majeur, Q4) — révoque les liens, arrête les courriels. */
	stopSharing: async (event) => {
		const { studentId } = await guardStudent(event);
		// Déjà coupé → aucune ligne rendue, sans erreur : le résultat est le même.
		const { error: stopError } = await event.locals.supabase
			.from('student_carnet_opt_outs')
			.upsert({ student_id: studentId }, { onConflict: 'student_id', ignoreDuplicates: true })
			.select('student_id');
		if (stopError) {
			logger.error('[student_carnet_opt_outs] coupure', stopError);
			return fail(500, { message: "Le partage n'a pas été coupé." });
		}
		return {
			message:
				'Partage coupé : les liens des parents sont révoqués et aucun courriel ne partira. Les liens du cahier et du cours de la classe restent ouverts.'
		};
	},

	/** D3 : rétablir le partage — de NOUVEAUX liens partent (les anciens restent morts). */
	resumeSharing: async (event) => {
		const { classId, studentId } = await guardStudent(event);
		const { data, error: resumeError } = await event.locals.supabase
			.from('student_carnet_opt_outs')
			.delete()
			.eq('student_id', studentId)
			.select('student_id');
		if (resumeError || !data?.length) {
			logger.error('[student_carnet_opt_outs] rétablissement', resumeError);
			return fail(500, { message: "Le partage n'a pas été rétabli." });
		}
		if (!(await carnetEnabled(event, classId)) || !isBrevoConfigured()) {
			return { message: 'Partage rétabli. Les liens partiront quand le carnet sera activé.' };
		}
		return {
			message: `Partage rétabli. ${sentMessage(await sendLinksToConfirmedContacts(studentId))}`
		};
	}
};
