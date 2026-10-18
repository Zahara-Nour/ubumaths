/**
 * Gain du Palotin en fin de séance
 * ================================
 *
 * `POST /api/tests/save` (Entraînement, Course aux nombres) et
 * `POST /api/srs/review/submit` (fin d'une séance de révision) renvoient le
 * gain du Palotin dans le champ `buddy_xp` (forme `BuddyXpFromExerciseResult`
 * du serveur), ou `null`. Ce module :
 *
 * - lit ce champ sans faire confiance à la réponse (Zod) : absent, `null` ou
 *   mal formé → aucun gain, sans erreur ;
 * - met à jour le cache du widget sans recharger la page ;
 * - prépare ce que montre `BuddyGainCard` (Palotin, expression, réplique).
 */

import { z } from 'zod';
import { lore } from '$lib/config/lore';
import type { PalotinType } from '$lib/config/buddy-messages';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import { toBuddyState, type BuddyExpression, type BuddyState } from '$lib/types/buddy';
import { buddyMessageEngine } from './buddy-message-engine';

// Types
/** Gain lu dans la réponse du serveur. */
export interface BuddyGain {
	xpGained: number;
	newLevel: number;
	leveledUp: boolean;
	dailyCapReached: boolean;
	/** Constance Royale (semaines) mise à jour par la séance (absente si le jour n'a pas été compté) */
	newStreak?: number;
	/** Semaine et jours travaillés de la Constance, présents avec `newStreak` */
	constanceWeekStart?: string;
	constanceDaysThisWeek?: number;
}

/** Ce que `BuddyGainCard` affiche : le gain, le Palotin et sa réplique. */
export interface BuddyGainView extends BuddyGain {
	palotin: PalotinType;
	expression: BuddyExpression;
	message: string;
}

// Constantes
const buddyXpSchema = z.object({
	xpResult: z.object({
		xp_gained: z.number().int().min(0).max(100_000),
		new_level: z.number().int().min(1).max(1000),
		leveled_up: z.boolean(),
		daily_cap_reached: z.boolean()
	}),
	streakUpdated: z.boolean().optional(),
	newStreak: z.number().int().min(0).max(100_000).optional(),
	constanceWeekStart: z.iso.date().optional(),
	constanceDaysThisWeek: z.number().int().min(0).max(7).optional()
});

/** `GET /api/student/buddy` : `{ buddy }` (ligne `student_buddies` ou `null`). */
const buddyRowSchema = z.object({
	buddy: z
		.object({
			student_id: z.string(),
			palotin_type: z.string(),
			xp: z.number(),
			level: z.number(),
			current_streak: z.number(),
			longest_streak: z.number(),
			last_activity_date: z.string().nullable(),
			xp_earned_today: z.number(),
			last_xp_date: z.string().nullable(),
			themes_explored: z.array(z.string()),
			change_count: z.number(),
			equipped_skin_id: z.string().nullable(),
			constance_week_start: z.iso.date().nullable(),
			constance_days_this_week: z.number().int().min(0).max(7)
		})
		.nullable()
});

const PALOTIN_NAMES: Record<PalotinType, string> = {
	giron: 'Giron',
	pile: 'Pile',
	cotice: 'Cotice'
};

// Functions

/**
 * Gain contenu dans une réponse du serveur. `null` si le champ `buddy_xp`
 * manque, vaut `null`, est mal formé, ou si rien n'a été gagné SANS plafond.
 * Plafond du jour déjà atteint (0 gagné) : rendu quand même, pour que la
 * carte dise « panse pleine » plutôt que de se taire.
 */
export function parseBuddyGain(payload: unknown): BuddyGain | null {
	if (typeof payload !== 'object' || payload === null || !('buddy_xp' in payload)) return null;
	const parsed = buddyXpSchema.safeParse(payload.buddy_xp);
	if (!parsed.success) return null;
	const { xpResult, streakUpdated, newStreak, constanceWeekStart, constanceDaysThisWeek } =
		parsed.data;
	if (xpResult.xp_gained <= 0 && !xpResult.daily_cap_reached) return null;
	return {
		xpGained: xpResult.xp_gained,
		newLevel: xpResult.new_level,
		leveledUp: xpResult.leveled_up,
		dailyCapReached: xpResult.daily_cap_reached,
		newStreak: streakUpdated ? newStreak : undefined,
		constanceWeekStart: streakUpdated ? constanceWeekStart : undefined,
		constanceDaysThisWeek: streakUpdated ? constanceDaysThisWeek : undefined
	};
}

/** « 1 pansée », « 12 pansées » (mots du lore, jamais « XP »). */
export function formatXpAmount(amount: number): string {
	const word = amount === 1 ? lore.buddy.xpSingular : lore.buddy.xp;
	return `${amount} ${word.toLowerCase()}`;
}

/** Nom affiché du Palotin. */
export function palotinName(palotin: PalotinType): string {
	return PALOTIN_NAMES[palotin];
}

/** Réplique et expression du Palotin pour ce gain. */
export function toBuddyGainView(gain: BuddyGain, palotin: PalotinType): BuddyGainView {
	const message =
		(gain.leveledUp ? buddyMessageEngine.getLevelUpMessage(palotin, gain.newLevel) : null) ??
		buddyMessageEngine.getMessage(palotin, gain.dailyCapReached ? 'daily_cap' : 'session_gain') ??
		'';
	return {
		...gain,
		palotin,
		expression: gain.leveledUp ? 'excited' : 'happy',
		message
	};
}

/**
 * Lit le gain d'une réponse, met le widget à jour et rend ce qu'il faut
 * afficher (ou `null`).
 *
 * Cache du Palotin présent (élève venu du tableau de bord) : mise à jour
 * optimiste. Cache absent : on relit le Palotin, qui inclut déjà le gain —
 * pas d'ajout optimiste, il serait compté deux fois.
 */
export async function receiveBuddyGain(payload: unknown): Promise<BuddyGainView | null> {
	// La séance est déjà enregistrée quand on arrive ici : une panne du Palotin
	// ne doit jamais remonter à l'appelant comme un échec d'enregistrement
	try {
		return await applyBuddyGain(payload);
	} catch (error) {
		console.error('Gain du Palotin ignoré :', error);
		return null;
	}
}

async function applyBuddyGain(payload: unknown): Promise<BuddyGainView | null> {
	const gain = parseBuddyGain(payload);
	if (!gain) return null;

	const cached = studentCache.getBuddySync();
	if (cached) {
		// Plafond déjà atteint : rien à ajouter au widget
		if (gain.xpGained > 0) {
			const newLevel = gain.leveledUp ? gain.newLevel : undefined;
			studentCache.updateBuddyXpOptimistic(gain.xpGained, newLevel, gain.newStreak);
			if (gain.constanceWeekStart !== undefined && gain.constanceDaysThisWeek !== undefined) {
				studentCache.updateBuddyConstanceOptimistic(
					gain.constanceWeekStart,
					gain.constanceDaysThisWeek
				);
			}
		}
		return toBuddyGainView(gain, cached.palotin_type);
	}

	const fresh = await fetchBuddy();
	if (!fresh) return null;
	studentCache.hydrateBuddy(fresh);
	return toBuddyGainView(gain, fresh.palotin_type);
}

/** Palotin de l'élève depuis le serveur (`null` en cas d'échec). */
async function fetchBuddy(): Promise<BuddyState | null> {
	try {
		const response = await fetch('/api/student/buddy');
		if (!response.ok) return null;
		const body: unknown = await response.json();
		const parsed = buddyRowSchema.safeParse(body);
		return parsed.success && parsed.data.buddy ? toBuddyState(parsed.data.buddy) : null;
	} catch {
		return null;
	}
}
