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
 * (`getStudentBuddy`, `getClassBuddies`) restent sur le client de l'appelant.
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

// Types
type ServiceClient = SupabaseClient<Database>;

/** Issue d'une écriture sous verrou optimiste. */
type GuardedWrite =
	| { status: 'missing' }
	| { status: 'unchanged'; row: StudentBuddy }
	| { status: 'written'; before: StudentBuddy; after: StudentBuddy }
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
	return new Date().toISOString().split('T')[0];
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
 * Série : première activité du jour (jour UTC). Client service, verrou
 * optimiste : de deux envois simultanés, un seul fait avancer la série (et
 * donc un seul touche le bonus de série). `wasUpdated` est faux si rien n'a été
 * écrit, y compris après des conflits répétés (journalisés).
 */
export async function updateStreak(
	studentId: string
): Promise<{ newStreak: number; wasUpdated: boolean }> {
	const today = todayUtc();
	const result = await guardedBuddyWrite(
		studentId,
		(row) => {
			// Déjà actif aujourd'hui : la série ne bouge pas
			if (row.last_activity_date === today) return null;
			const newStreak = row.current_streak + 1;
			return {
				current_streak: newStreak,
				longest_streak: Math.max(row.longest_streak, newStreak),
				last_activity_date: today
			};
		},
		'série'
	);

	switch (result.status) {
		case 'written':
			return { newStreak: result.after.current_streak, wasUpdated: true };
		case 'unchanged':
			return { newStreak: result.row.current_streak, wasUpdated: false };
		case 'missing':
		case 'conflict':
			return { newStreak: 0, wasUpdated: false };
	}
}

/**
 * La série est-elle perdue (dernière activité il y a plus d'un jour, série en
 * cours) ? Règle d'origine du tableau de bord élève, inchangée.
 */
export function isStreakLost(
	buddy: { current_streak: number; last_activity_date: string | null },
	now: Date = new Date()
): boolean {
	if (buddy.current_streak <= 0 || !buddy.last_activity_date) return false;
	const lastActivity = new Date(buddy.last_activity_date);
	const today = new Date(now);
	// Comparaison au jour près
	lastActivity.setHours(0, 0, 0, 0);
	today.setHours(0, 0, 0, 0);
	const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / 86400000);
	return daysDiff > 1;
}

/**
 * Remet la série à 0 si elle est perdue (client service). La règle est
 * réévaluée sur la ligne relue : une activité arrivée entre-temps n'est pas
 * effacée. Rend vrai si la remise à zéro a été ÉCRITE.
 */
export async function resetLostStreak(studentId: string): Promise<boolean> {
	const result = await guardedBuddyWrite(
		studentId,
		(row) => (isStreakLost(row) ? { current_streak: 0 } : null),
		'série perdue'
	);
	return result.status === 'written';
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
 * Get all buddies for students in a given class (teacher dashboard).
 */
export async function getClassBuddies(
	supabase: SupabaseClient<Database>,
	classId: string
): Promise<
	(BuddyState & { full_name: string | null; firstname: string | null; lastname: string | null })[]
> {
	const { data, error } = await supabase
		.from('class_members')
		.select(
			`
			student_id,
			profiles:student_id (
				full_name,
				firstname,
				lastname
			),
			student_buddies:student_id (
				student_id,
				palotin_type,
				xp,
				level,
				current_streak,
				longest_streak,
				last_activity_date,
				xp_earned_today,
				themes_explored,
				change_count
			)
		`
		)
		.eq('class_id', classId)
		.eq('status', 'active');

	if (error) {
		logger.error('❌ [buddy-queries] Error fetching class buddies:', error);
		throw error;
	}

	return (data || [])
		.filter((m) => m.student_buddies)
		.map((m) => {
			const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
			const buddy = Array.isArray(m.student_buddies) ? m.student_buddies[0] : m.student_buddies;
			return {
				...buddy,
				full_name: profile?.full_name ?? null,
				firstname: profile?.firstname ?? null,
				lastname: profile?.lastname ?? null
			};
		}) as (BuddyState & {
		full_name: string | null;
		firstname: string | null;
		lastname: string | null;
	})[];
}
