/**
 * Server-side Buddy Query Helpers
 * ================================
 *
 * Database access functions for the Palotin buddy system.
 * Used by API endpoints and +page.server.ts files.
 *
 * Écritures (PR 2 de docs/wip/palotin-boucle-progress.md) : TOUTES passent par
 * le client service, avec l'identifiant de l'élève tiré de la SESSION par
 * l'appelant. Aucune fonction d'écriture ne reçoit le client de l'élève : la
 * PR suivante lui retire le droit d'écrire sa ligne, et une écriture restée sur
 * son client échouerait alors en silence (0 ligne). Les lectures exposées
 * (`getStudentBuddy`) restent sur le client de l'appelant.
 *
 * Lire-modifier-écrire sans transaction : verrou optimiste sur `updated_at`
 * (mis à jour par le trigger `student_buddies_updated_at_trigger`). L'écriture
 * n'aboutit que si la ligne n'a pas bougé depuis sa lecture ; sinon (0 ligne),
 * relecture et nouvel essai, `MAX_WRITE_ATTEMPTS` fois au plus.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { StudentBuddy, StudentBuddyUpdate } from '$lib/types/database-helpers';
import type { PalotinType } from '$lib/config/buddy-messages';
import { toBuddyState, type BuddyState, type BuddyXpGainResult } from '$lib/types/buddy';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';
import {
	applyWorkedDay,
	constanceReset,
	utcDay,
	weekStartOf,
	type ConstanceReset
} from '$lib/utils/buddy-constance';
import { isLongAbsence, isWelcomeBackDue } from '$lib/utils/buddy-absence';

// Types
type ServiceClient = SupabaseClient<Database>;

/** Issue d'une écriture sous verrou optimiste. */
type GuardedWrite =
	| { status: 'missing' }
	| { status: 'unchanged'; row: StudentBuddy }
	| { status: 'written'; before: StudentBuddy; after: StudentBuddy }
	| { status: 'conflict' };

/** Issue d'un jour travaillé (`recordWorkedDay`). */
export type WorkedDayResult =
	| {
			status: 'counted';
			/** Vrai le jour où la semaine devient tenue (3e jour travaillé) */
			weekHeld: boolean;
			/** Constance Royale après ce jour, en semaines */
			newStreak: number;
			constanceWeekStart: string;
			constanceDaysThisWeek: number;
	  }
	| { status: 'already' }
	| { status: 'missing' }
	| { status: 'conflict' };

/** Issue d'un changement de Palotin. */
export type PalotinChangeResult =
	| { status: 'changed'; buddy: BuddyState; cost: number }
	| { status: 'missing' }
	| { status: 'same' }
	| { status: 'insufficient'; cost: number }
	| { status: 'conflict' };

// Constantes
const logger = createServerLogger('server/buddy-queries');

/** Essais d'une écriture sous verrou optimiste avant d'abandonner. */
export const MAX_WRITE_ATTEMPTS = 3;

/** Prix d'un changement de Palotin, le premier étant gratuit. */
export const PALOTIN_CHANGE_COST = 50;

/** Violation d'unicité Postgres (ligne déjà présente). */
const UNIQUE_VIOLATION = '23505';

// Functions

/** Jour UTC courant (`YYYY-MM-DD`), celui du plafond de `add_buddy_xp`. */
function todayUtc(): string {
	return utcDay(new Date());
}

/** Ligne complète (avec `updated_at`) lue au client service ; null si absente. */
async function readBuddyRow(
	service: ServiceClient,
	studentId: string
): Promise<StudentBuddy | null> {
	const { data, error } = await service
		.from('student_buddies')
		.select('*')
		.eq('student_id', studentId)
		.maybeSingle();

	if (error) {
		logger.error('❌ [buddy-queries] Error reading buddy row:', error);
		throw error;
	}
	return data;
}

/**
 * Lire-modifier-écrire la ligne de l'élève sous verrou optimiste.
 *
 * `compute` rend le changement à écrire d'après la ligne fraîchement lue, ou
 * null s'il n'y a rien à écrire. L'écriture porte `.eq('updated_at', lu)` et
 * `.select()` : 0 ligne = la ligne a bougé entre-temps (ou l'écriture a été
 * refusée) → relecture, nouvel essai. Rend `conflict` après
 * `MAX_WRITE_ATTEMPTS` essais, journalisé : jamais un succès silencieux.
 */
async function guardedBuddyWrite(
	studentId: string,
	compute: (row: StudentBuddy) => StudentBuddyUpdate | null,
	label: string
): Promise<GuardedWrite> {
	const service = createServiceRoleClient();

	for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
		const row = await readBuddyRow(service, studentId);
		if (!row) return { status: 'missing' };

		const patch = compute(row);
		if (!patch) return { status: 'unchanged', row };

		const { data, error } = await service
			.from('student_buddies')
			.update(patch)
			.eq('student_id', studentId)
			.eq('updated_at', row.updated_at)
			.select('*');

		if (error) {
			logger.error(`❌ [buddy-queries] Error writing buddy (${label}):`, error);
			throw error;
		}
		const after = data?.[0];
		if (after) return { status: 'written', before: row, after };
	}

	logger.error(
		`[buddy-queries] Écriture du Palotin abandonnée (${label}) : ligne modifiée à chaque essai`,
		{
			studentId,
			attempts: MAX_WRITE_ATTEMPTS
		}
	);
	return { status: 'conflict' };
}

/**
 * Get a student's buddy. Returns null if no buddy chosen yet.
 */
export async function getStudentBuddy(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<BuddyState | null> {
	const { data, error } = await supabase
		.from('student_buddies')
		.select('*')
		.eq('student_id', studentId)
		.maybeSingle();

	if (error) {
		logger.error('❌ [buddy-queries] Error fetching student buddy:', error);
		throw error;
	}

	return data as BuddyState | null;
}

/**
 * Crée le Palotin de l'élève après le quiz de choix (client service).
 * Rend null si l'élève en a déjà un (envoi simultané : violation d'unicité).
 */
export async function createStudentBuddy(
	studentId: string,
	palotinType: PalotinType
): Promise<BuddyState | null> {
	const { data, error } = await createServiceRoleClient()
		.from('student_buddies')
		.insert({
			student_id: studentId,
			palotin_type: palotinType
		})
		.select('*');

	if (error) {
		if (error.code === UNIQUE_VIOLATION) return null;
		logger.error('❌ [buddy-queries] Error creating student buddy:', error);
		throw error;
	}

	const row = data?.[0];
	if (!row) {
		// 0 ligne sans erreur : écriture refusée en silence
		throw new Error('Palotin non créé (0 ligne)');
	}
	return toBuddyState(row);
}

/**
 * Débite `cost` gidouilles, verrou optimiste sur le solde lu (client service).
 * 'insufficient' si le solde ne suffit pas ; 'conflict' si le solde a bougé à
 * chaque essai.
 */
async function debitGidouilles(
	service: ServiceClient,
	studentId: string,
	cost: number
): Promise<'debited' | 'insufficient' | 'conflict'> {
	for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
		const { data: profile, error: readError } = await service
			.from('profiles')
			.select('gidouilles')
			.eq('id', studentId)
			.single();
		if (readError) throw readError;

		const balance = profile.gidouilles;
		if (balance === null || balance < cost) return 'insufficient';

		const { data, error } = await service
			.from('profiles')
			.update({ gidouilles: balance - cost })
			.eq('id', studentId)
			.eq('gidouilles', balance)
			.select('id');
		if (error) throw error;
		if ((data?.length ?? 0) > 0) return 'debited';
	}

	logger.error(
		'[buddy-queries] Débit du changement de Palotin abandonné : solde modifié à chaque essai',
		{
			studentId
		}
	);
	return 'conflict';
}

/**
 * Annule un changement de Palotin dont le débit a échoué. Conditionnée sur les
 * champs écrits par CE changement (type et compteur), pas sur `updated_at` :
 * un gain d'XP simultané ne doit pas empêcher l'annulation.
 */
async function revertPalotinChange(
	service: ServiceClient,
	before: StudentBuddy,
	newType: PalotinType
): Promise<void> {
	const { data, error } = await service
		.from('student_buddies')
		.update({ palotin_type: before.palotin_type, change_count: before.change_count })
		.eq('student_id', before.student_id)
		.eq('palotin_type', newType)
		.eq('change_count', before.change_count + 1)
		.select('student_id');

	if (error || (data?.length ?? 0) === 0) {
		logger.error('❌ [buddy-queries] Changement de Palotin NON annulé après un débit manqué', {
			studentId: before.student_id,
			error
		});
	}
}

/**
 * Change le Palotin de l'élève (client service, identité de session).
 *
 * Premier changement gratuit, ensuite `PALOTIN_CHANGE_COST` gidouilles ; l'XP
 * est gardée. Le prix est celui de la ligne effectivement écrite : le
 * changement (type + `change_count` + 1) porte le verrou optimiste sur
 * `updated_at`, donc deux changements simultanés ne passent pas tous deux au
 * prix du premier, gratuit.
 *
 * Ordre : le changement d'abord, le débit ensuite ; si le débit échoue (solde
 * insuffisant, solde modifié à chaque essai, erreur), le changement est
 * annulé. Il n'y a jamais de débit sans changement. Ce n'est pas une
 * transaction : une coupure entre l'écriture et le débit, ou une annulation
 * qui échoue (requête concurrente qui a relu et réécrit la ligne changée),
 * peut laisser UN changement non payé, journalisé. C'est le côté le moins
 * grave : un changement gratuit plutôt qu'un élève débité sans changement.
 */
export async function changeStudentPalotin(
	studentId: string,
	newType: PalotinType
): Promise<PalotinChangeResult> {
	const service = createServiceRoleClient();

	for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
		const row = await readBuddyRow(service, studentId);
		if (!row) return { status: 'missing' };
		if (row.palotin_type === newType) return { status: 'same' };

		const cost = row.change_count > 0 ? PALOTIN_CHANGE_COST : 0;
		if (cost > 0) {
			const { data: profile, error: profileError } = await service
				.from('profiles')
				.select('gidouilles')
				.eq('id', studentId)
				.single();
			if (profileError) throw profileError;
			if ((profile.gidouilles ?? 0) < cost) return { status: 'insufficient', cost };
		}

		// 1. Le changement, au prix lu sur CETTE version de la ligne
		const { data, error } = await service
			.from('student_buddies')
			.update({ palotin_type: newType, change_count: row.change_count + 1 })
			.eq('student_id', studentId)
			.eq('updated_at', row.updated_at)
			.select('*');
		if (error) {
			logger.error('❌ [buddy-queries] Error changing palotin:', error);
			throw error;
		}
		const changed = data?.[0];
		if (!changed) continue; // ligne modifiée entre-temps : relire

		if (cost === 0) return { status: 'changed', buddy: toBuddyState(changed), cost };

		// 2. Le débit ; en cas d'échec, le changement est annulé
		let debit: 'debited' | 'insufficient' | 'conflict';
		try {
			debit = await debitGidouilles(service, studentId, cost);
		} catch (debitError) {
			await revertPalotinChange(service, row, newType);
			throw debitError;
		}
		if (debit === 'debited') return { status: 'changed', buddy: toBuddyState(changed), cost };

		await revertPalotinChange(service, row, newType);
		return debit === 'insufficient' ? { status: 'insufficient', cost } : { status: 'conflict' };
	}

	logger.error('[buddy-queries] Changement de Palotin abandonné : ligne modifiée à chaque essai', {
		studentId
	});
	return { status: 'conflict' };
}

/**
 * Add XP to a student's buddy via the add_buddy_xp RPC.
 * Handles daily cap and level calculation atomically in the database.
 *
 * Client service (lot 3, Q141) : la base refuse cette fonction aux comptes
 * connectés — sinon un élève créditerait n'importe quel compagnon, plafond
 * contourné. L'appelant fournit `studentId` depuis la SESSION, jamais depuis
 * le corps de la requête.
 */
export async function addBuddyXp(
	studentId: string,
	xp: number,
	isMilestone: boolean = false
): Promise<BuddyXpGainResult> {
	const { data, error } = await createServiceRoleClient().rpc('add_buddy_xp', {
		p_student_id: studentId,
		p_xp: xp,
		p_is_milestone: isMilestone
	});

	if (error) {
		logger.error('❌ [buddy-queries] Error adding buddy XP:', error);
		throw error;
	}

	// The RPC returns a JSON object; narrow it (Json is opaque at the type level).
	const result = data as unknown as BuddyXpGainResult & { error?: unknown };

	if (result?.error) {
		logger.error('❌ [buddy-queries] RPC error:', result.error);
		return { xp_gained: 0, new_xp: 0, new_level: 1, leveled_up: false, daily_cap_reached: false };
	}

	return result;
}

/**
 * Compte aujourd'hui (jour UTC) comme jour travaillé de la Constance Royale :
 * UNE écriture de `constance_week_start`, `constance_days_this_week`,
 * `current_streak`, `longest_streak` et `last_activity_date` (règle :
 * `applyWorkedDay`). Client service, verrou optimiste : de deux crédits
 * simultanés, un seul compte le jour, donc un seul touche la récompense de la
 * semaine tenue. L'appelant ne l'appelle qu'après un crédit de pansées > 0.
 *
 * `already` : jour déjà compté (y compris par un envoi simultané). `conflict`
 * (journalisé) : la ligne a bougé à chaque essai, rien n'est annoncé.
 */
export async function recordWorkedDay(studentId: string): Promise<WorkedDayResult> {
	const today = todayUtc();
	const result = await guardedBuddyWrite(
		studentId,
		(row) => applyWorkedDay(row, today)?.patch ?? null,
		'Constance Royale'
	);

	switch (result.status) {
		case 'written': {
			// La règle est rejouée sur la ligne effectivement écrite (déterministe)
			const weekHeld = applyWorkedDay(result.before, today)?.weekHeld ?? false;
			return {
				status: 'counted',
				weekHeld,
				newStreak: result.after.current_streak,
				constanceWeekStart: result.after.constance_week_start ?? weekStartOf(today),
				constanceDaysThisWeek: result.after.constance_days_this_week
			};
		}
		case 'unchanged':
			return { status: 'already' };
		case 'missing':
		case 'conflict':
			return { status: result.status };
	}
}

/**
 * Remet la Constance à 0 si la dernière semaine enregistrée est finie sans
 * être tenue (règle : `constanceReset`), ou si la ligne porte encore une
 * ancienne série en jours. Client service ; la règle est réévaluée sur la
 * ligne relue : un jour travaillé arrivé entre-temps n'est pas effacé. Rend la
 * remise à zéro ÉCRITE (et la ligne écrite), ou null.
 */
export async function resetLostConstance(
	studentId: string
): Promise<{ kind: ConstanceReset['kind']; buddy: StudentBuddy } | null> {
	const today = todayUtc();
	let kind: ConstanceReset['kind'] = 'lost';
	const result = await guardedBuddyWrite(
		studentId,
		(row) => {
			const reset = constanceReset(row, today);
			if (!reset) return null;
			kind = reset.kind;
			return reset.patch;
		},
		'Constance perdue'
	);
	return result.status === 'written' ? { kind, buddy: result.after } : null;
}

/**
 * Ajoute à la liste des thèmes explorés ceux d'une séance, en UNE écriture
 * (client service, identité de session).
 *
 * Rend les thèmes ajoutés par CET appel : verrou optimiste sur `updated_at`,
 * donc de deux envois simultanés, aucun thème n'est perdu et chaque thème
 * n'est rendu « nouveau » qu'à un seul des deux (un seul bonus). Écriture
 * refusée ou conflits répétés : ensemble vide (rien n'est annoncé nouveau).
 */
export async function addExploredThemes(studentId: string, themes: string[]): Promise<Set<string>> {
	const wanted = [...new Set(themes)];
	if (wanted.length === 0) return new Set();

	let fresh: string[] = [];
	const result = await guardedBuddyWrite(
		studentId,
		(row) => {
			const known = new Set(row.themes_explored);
			fresh = wanted.filter((theme) => !known.has(theme));
			return fresh.length > 0 ? { themes_explored: [...row.themes_explored, ...fresh] } : null;
		},
		'thèmes explorés'
	);

	if (result.status !== 'written') return new Set();
	const written = result.after.themes_explored;
	return new Set(fresh.filter((theme) => written.includes(theme)));
}

/**
 * Retire des thèmes explorés (compensation : thème réservé mais bonus non
 * crédité, il doit rester « nouveau »). Client service, verrou optimiste.
 */
export async function removeExploredThemes(studentId: string, themes: string[]): Promise<void> {
	if (themes.length === 0) return;
	const toRemove = new Set(themes);
	const result = await guardedBuddyWrite(
		studentId,
		(row) =>
			row.themes_explored.some((theme) => toRemove.has(theme))
				? { themes_explored: row.themes_explored.filter((theme) => !toRemove.has(theme)) }
				: null,
		'thèmes explorés (retrait)'
	);
	if (result.status === 'conflict') {
		logger.error('[buddy-queries] Thèmes réservés non retirés', { studentId, themes });
	}
}

/**
 * Ajoute un thème exploré (une réponse isolée). Rend vrai si CET appel l'a
 * ajouté.
 */
export async function addExploredTheme(studentId: string, theme: string): Promise<boolean> {
	return (await addExploredThemes(studentId, [theme])).has(theme);
}

/**
 * Note la présence du jour (toute page vue, docs/wip/palotins-presence-progress.md)
 * et, au retour d'une longue absence, le jour du retour à fêter.
 *
 * Client service seulement : `student_last_visits` n'est lisible par personne
 * d'autre que le serveur (décision du 2026-10-21). `studentId` vient de la
 * session, le jour est calculé ici. `record_student_visit` ne rend l'ancien
 * jour qu'à un seul de deux appels simultanés : le retour n'est noté qu'une
 * fois. Panne : journalisée, sans lever (la page s'affiche quand même).
 */
export async function recordStudentPresence(studentId: string): Promise<void> {
	const today = todayUtc();
	const service = createServiceRoleClient();
	const { data, error } = await service.rpc('record_student_visit', {
		p_student_id: studentId,
		p_today: today
	});
	if (error) {
		logger.error('❌ [buddy-queries] Présence non enregistrée :', error);
		return;
	}
	if (!isLongAbsence(data, today)) return;

	const { data: rows, error: welcomeError } = await service
		.from('student_last_visits')
		.update({ welcome_back_on: today })
		.eq('student_id', studentId)
		.select('student_id');
	if (welcomeError || rows?.length !== 1) {
		logger.error('❌ [buddy-queries] Retour à fêter non noté :', welcomeError ?? 'aucune ligne');
	}
}

/**
 * Vrai si le Palotin doit dire « tu m'as manqué » : un retour noté il y a
 * moins de `WELCOME_BACK_DAYS` jours, pas encore fêté. Lecture seule : un
 * préchargement ne consomme rien. Lecture en échec : faux.
 */
export async function isWelcomeBackPending(studentId: string): Promise<boolean> {
	const { data, error } = await createServiceRoleClient()
		.from('student_last_visits')
		.select('welcome_back_on')
		.eq('student_id', studentId)
		.maybeSingle();
	if (error) {
		logger.error('❌ [buddy-queries] Retour à fêter illisible :', error);
		return false;
	}
	return isWelcomeBackDue(data?.welcome_back_on ?? null, todayUtc());
}

/**
 * Le Palotin a dit « tu m'as manqué » : le retour est fêté, on l'efface.
 * Rend vrai si une ligne a été effacée (faux s'il n'y avait rien à fêter).
 */
export async function acknowledgeWelcomeBack(studentId: string): Promise<boolean> {
	const { data, error } = await createServiceRoleClient()
		.from('student_last_visits')
		.update({ welcome_back_on: null })
		.eq('student_id', studentId)
		.not('welcome_back_on', 'is', null)
		.select('student_id');
	if (error) throw new Error(`Retour à fêter non effacé : ${error.message}`);
	return (data?.length ?? 0) > 0;
}
