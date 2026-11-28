/**
 * Carnet de liaison — le passage quotidien (ADR 0040 ; E1-E7, Q19, Q21, Q29, Q33-Q38)
 * ==================================================================================
 *
 * Appelé une fois par jour par le cron Vercel (`/api/cron/carnet-de-liaison`).
 * Dans cet ordre :
 *
 *  1. **Effacement** (Q21, Q35) : adresses d'un élève sans classe active depuis
 *     90 jours (`carnet_erase_orphan_contacts`), puis lignes du journal des
 *     courriels de plus d'un an (Q42, `carnet_erase_old_notifications`).
 *  2. **Liens manquants** (Q29, Q36) : pour chaque classe au carnet activé, le
 *     même passage que le bouton du professeur (élève arrivé après, consentement
 *     accordé après, rentrée, envoi précédent en échec).
 *  3. **Exceptions** (E1-E3, E7) : épisodes ouverts et fermés
 *     (`carnet_sync_exception_episodes`), puis un courriel par adresse qui a des
 *     épisodes non signalés, dans la limite d'un par semaine (`carnet_exception_plan`).
 *  4. **Message trimestriel** (E4, Q34) : lu APRÈS l'envoi des exceptions (une
 *     adresse qui vient d'en recevoir un est sous le plafond, Q19).
 *
 * Au plus `MAX_EMAILS_PER_RUN` courriels par passage (la moitié du quota Brevo,
 * partagé avec tous les autres courriels) ; le reste part le lendemain (Q36).
 *
 * Chaque courriel d'exception ou trimestriel porte son PROPRE jeton (Q38) :
 * 32 octets aléatoires, haché sur sa ligne de `parent_notifications`, qui ouvre
 * le carnet et arrête les courriels tant que le lien actif au moment de l'envoi
 * vit. La ligne est écrite AVANT l'envoi, en « sent », et repassée en « failed »
 * si Brevo refuse : un courriel parti a toujours un jeton valable, et le
 * plafond hebdomadaire le compte même si le passage est coupé juste après.
 *
 * Deux passages ne tournent jamais ensemble (cron + bouton de l'admin) : le
 * second voit le premier dans `background_job_runs` et s'arrête.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { sendCarnetExceptionEmail, sendCarnetQuarterlyEmail } from '#lib/server/email/brevo.ts';
import type { EmailSendResult } from '#lib/server/email/brevo.ts';
import type { CarnetExceptionReason } from '#lib/email-templates/carnet.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { generateCarnetToken, hashCarnetToken } from './carnet';
import { sendClassMissingLinks } from './envois';

// Types

type SB = SupabaseClient<Database>;

export interface CarnetDailyReport {
	/** Adresses effacées (Q35) */
	erased: number;
	/** Lignes du journal des courriels effacées, plus d'un an (Q42) */
	erasedNotifications: number;
	links: { sent: number; failed: number };
	exceptions: { sent: number; failed: number };
	quarterly: { sent: number; failed: number };
	/** Le plafond du passage a été atteint : il reste des envois pour demain */
	capped: boolean;
}

// Constantes

const logger = createServerLogger('server/carnet/courriels');

/** Q36 : la moitié du quota Brevo de 300 courriels par jour. */
export const MAX_EMAILS_PER_RUN = 150;

const reasonSchema = z.enum(['evaluation_missed', 'reviews_overdue', 'inactivity']);

const exceptionPlanSchema = z.array(
	z.object({
		contact_id: z.string().uuid(),
		student_id: z.string().uuid(),
		email: z.string().min(3).max(254),
		firstname: z.string().nullable(),
		reasons: z.array(reasonSchema).min(1).max(3),
		episode_ids: z.array(z.string().uuid()).min(1).max(50),
		overdue_days: z.number().int().min(1).max(60).nullable(),
		inactivity_days: z.number().int().min(1).max(60).nullable()
	})
);

const quarterlyPlanSchema = z.array(
	z.object({
		contact_id: z.string().uuid(),
		student_id: z.string().uuid(),
		email: z.string().min(3).max(254),
		firstname: z.string().nullable(),
		period_id: z.string().uuid(),
		regular: z.boolean(),
		reviews_up_to_date: z.boolean()
	})
);

/** Seuils par défaut des réglages (migration 20261116133453), si la classe a disparu entre-temps. */
const DEFAULT_OVERDUE_DAYS = 7;
const DEFAULT_INACTIVITY_DAYS = 15;

// Functions

function firstnameOr(firstname: string | null): string {
	return firstname?.trim() || 'votre enfant';
}

/**
 * Écrit la ligne du journal AVANT l'envoi, avec l'empreinte du jeton, puis
 * l'envoie. Rend l'issue de l'envoi, ou `null` si la ligne n'a pas pu être
 * écrite (rien n'est parti : un jeton sans ligne n'ouvrirait rien).
 */
async function sendWithToken(
	service: SB,
	row: {
		student_id: string;
		contact_id: string;
		kind: 'exception' | 'quarterly';
		reasons: CarnetExceptionReason[];
	},
	send: (token: string) => Promise<EmailSendResult>
): Promise<boolean | null> {
	const token = generateCarnetToken();
	const { data: inserted, error } = await service
		.from('parent_notifications')
		.insert({ ...row, status: 'sent', access_token_hash: hashCarnetToken(token) })
		.select('id')
		.single();
	if (error || !inserted) {
		logger.error('[parent_notifications] ligne non écrite, courriel non envoyé', error);
		return null;
	}

	const sent = await send(token);
	if (sent.success) return true;

	const { data: updated, error: updateError } = await service
		.from('parent_notifications')
		.update({ status: 'failed' })
		.eq('id', inserted.id)
		.select('id');
	if (updateError || !updated?.length) {
		// Reste « sent » : le plafond retient une semaine de trop, rien ne part en double.
		logger.error('[parent_notifications] échec non marqué', updateError ?? 'aucune ligne');
	}
	return false;
}

/** 1. Effacement des adresses orphelines (Q35). */
async function eraseOrphans(service: SB): Promise<number> {
	const { data, error } = await service.rpc('carnet_erase_orphan_contacts');
	if (error) {
		logger.error('[carnet_erase_orphan_contacts]', error);
		throw new Error('Effacement des adresses impossible');
	}
	return data ?? 0;
}

/** 1 bis. Effacement du journal des courriels de plus d'un an (Q42). */
async function eraseOldNotifications(service: SB): Promise<number> {
	const { data, error } = await service.rpc('carnet_erase_old_notifications');
	if (error) {
		logger.error('[carnet_erase_old_notifications]', error);
		throw new Error('Effacement du journal des courriels impossible');
	}
	return data ?? 0;
}

/** 2. Liens manquants de chaque classe au carnet activé (Q29, Q36). */
async function sendMissingLinks(
	service: SB,
	budget: number
): Promise<{ sent: number; failed: number }> {
	const total = { sent: 0, failed: 0 };
	const { data: classes, error } = await service
		.from('class_carnet_settings')
		.select('class_id, classes!inner(is_active)')
		.eq('enabled', true)
		.eq('classes.is_active', true);
	if (error) {
		logger.error('[class_carnet_settings]', error);
		throw new Error('Classes au carnet illisibles');
	}

	for (const { class_id } of classes ?? []) {
		const left = budget - total.sent;
		if (left <= 0) break;
		try {
			const result = await sendClassMissingLinks(class_id, service, left);
			total.sent += result.sent;
			total.failed += result.failed;
		} catch (err) {
			logger.error('[sendClassMissingLinks]', err);
			total.failed += 1;
		}
	}
	return total;
}

/**
 * 3. Exceptions (E1-E3, E7, Q19, Q33).
 *
 * Un épisode non marqué après son courriel serait reproposé par le plan une
 * semaine plus tard : le parent recevrait deux fois le même avertissement
 * (écart L80). L'erreur va dans `errors` plutôt que d'être levée : les
 * courriels suivants partent, et le compte des courriels partis reste juste
 * (il borne le budget du message trimestriel).
 */
async function sendExceptions(
	service: SB,
	budget: number,
	errors: unknown[]
): Promise<{ sent: number; failed: number }> {
	const { error: syncError } = await service.rpc('carnet_sync_exception_episodes');
	if (syncError) {
		logger.error('[carnet_sync_exception_episodes]', syncError);
		throw new Error('Exceptions du carnet illisibles');
	}

	const { data, error } = await service.rpc('carnet_exception_plan');
	if (error) {
		logger.error('[carnet_exception_plan]', error);
		throw new Error("Plan des courriels d'exception illisible");
	}
	const plan = exceptionPlanSchema.safeParse(data ?? []);
	if (!plan.success) {
		logger.error('[carnet_exception_plan] réponse mal formée', plan.error.issues);
		throw new Error("Plan des courriels d'exception illisible");
	}

	const total = { sent: 0, failed: 0 };
	for (const row of plan.data.slice(0, Math.max(0, budget))) {
		const outcome = await sendWithToken(
			service,
			{
				student_id: row.student_id,
				contact_id: row.contact_id,
				kind: 'exception',
				reasons: row.reasons
			},
			(token) =>
				sendCarnetExceptionEmail(row.email, {
					studentFirstname: firstnameOr(row.firstname),
					token,
					reasons: row.reasons,
					overdueDays: row.overdue_days ?? DEFAULT_OVERDUE_DAYS,
					inactivityDays: row.inactivity_days ?? DEFAULT_INACTIVITY_DAYS
				})
		);
		if (outcome !== true) {
			// Épisodes laissés non signalés : nouvel essai demain, sans doublon (E6).
			total.failed += 1;
			continue;
		}
		total.sent += 1;

		const { data: marked, error: markError } = await service
			.from('parent_exception_episodes')
			.update({ notified_at: new Date().toISOString() })
			.in('id', row.episode_ids)
			.is('notified_at', null)
			.select('id');
		if (markError || (marked?.length ?? 0) !== row.episode_ids.length) {
			logger.error(
				'[parent_exception_episodes] épisodes non marqués',
				markError ?? `${marked?.length ?? 0}/${row.episode_ids.length}`
			);
			errors.push(new Error("Épisodes d'exception non marqués après leur courriel"));
		}
	}
	return total;
}

/** 4. Message trimestriel (E4, Q34), APRÈS les exceptions. */
async function sendQuarterly(
	service: SB,
	budget: number
): Promise<{ sent: number; failed: number }> {
	const { data, error } = await service.rpc('carnet_quarterly_plan');
	if (error) {
		logger.error('[carnet_quarterly_plan]', error);
		throw new Error('Plan des messages trimestriels illisible');
	}
	const plan = quarterlyPlanSchema.safeParse(data ?? []);
	if (!plan.success) {
		logger.error('[carnet_quarterly_plan] réponse mal formée', plan.error.issues);
		throw new Error('Plan des messages trimestriels illisible');
	}

	const total = { sent: 0, failed: 0 };
	// Rien de vrai à dire : rien ne part (la fonction SQL l'écarte déjà).
	const rows = plan.data.filter((row) => row.regular || row.reviews_up_to_date);
	for (const row of rows.slice(0, Math.max(0, budget))) {
		const outcome = await sendWithToken(
			service,
			{ student_id: row.student_id, contact_id: row.contact_id, kind: 'quarterly', reasons: [] },
			(token) =>
				sendCarnetQuarterlyEmail(row.email, {
					studentFirstname: firstnameOr(row.firstname),
					token,
					regular: row.regular,
					reviewsUpToDate: row.reviews_up_to_date
				})
		);
		if (outcome === true) total.sent += 1;
		else total.failed += 1;
	}
	return total;
}

/**
 * Le passage quotidien. Une étape en échec n'empêche pas les suivantes ; la
 * première erreur est relancée à la fin (le cron la journalise).
 */
export async function runCarnetDaily(
	service: SB = createServiceRoleClient(),
	maxEmails = MAX_EMAILS_PER_RUN
): Promise<CarnetDailyReport> {
	const report: CarnetDailyReport = {
		erased: 0,
		erasedNotifications: 0,
		links: { sent: 0, failed: 0 },
		exceptions: { sent: 0, failed: 0 },
		quarterly: { sent: 0, failed: 0 },
		capped: false
	};
	const errors: unknown[] = [];
	// Courriels tentés. Les échecs des liens manquants mêlent des erreurs de
	// base (aucun courriel) : seuls les liens partis comptent.
	const used = () =>
		report.links.sent +
		report.exceptions.sent +
		report.exceptions.failed +
		report.quarterly.sent +
		report.quarterly.failed;
	const remaining = () => Math.max(0, maxEmails - used());

	try {
		report.erased = await eraseOrphans(service);
	} catch (err) {
		errors.push(err);
	}
	try {
		report.erasedNotifications = await eraseOldNotifications(service);
	} catch (err) {
		errors.push(err);
	}
	try {
		report.links = await sendMissingLinks(service, maxEmails);
	} catch (err) {
		errors.push(err);
	}
	try {
		report.exceptions = await sendExceptions(service, remaining(), errors);
	} catch (err) {
		errors.push(err);
	}
	try {
		report.quarterly = await sendQuarterly(service, remaining());
	} catch (err) {
		errors.push(err);
	}
	report.capped = remaining() === 0;

	if (errors.length > 0) {
		logger.error('[runCarnetDaily] étapes en échec', errors.length, report);
		throw errors[0];
	}
	return report;
}
