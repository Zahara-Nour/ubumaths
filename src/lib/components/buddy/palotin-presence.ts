/**
 * Présence du Palotin — où il est, quand il passe (chantier `palotins`)
 * ======================================================================
 *
 * Décisions de David du 2026-11-11 (docs/wip/palotins-progress.md) :
 *   - **maison** (accueil élève, Chatterie) : le Palotin y est toujours là ;
 *   - **passage** (reste de l'espace élève, révisions hors séance) : un écusson,
 *     et le Palotin entre, dit une réplique, repart ;
 *   - **séance** (Entraînement, révision en cours) : l'écusson seul, aucun
 *     passage (ils attendent la page suivante) ;
 *   - ailleurs : rien.
 * Un passage spontané au plus toutes les 10 minutes, tous onglets confondus
 * (mémoire du navigateur) ; les passages importants n'y comptent pas.
 *
 * Logique pure, testée sans navigateur.
 */

import { z } from 'zod';
import type { BuddyState } from '$lib/types/buddy';

// Types
export type PalotinZone = 'maison' | 'passage' | 'seance';

/** Mémoire du dernier passage spontané : navigateur, sinon page ouverte. */
export interface PassageClock {
	canPass(now: number): boolean;
	record(now: number): void;
}

/** Ce que rend `GET /api/student/buddy/presence`. */
export interface BuddyPresenceView {
	buddy: BuddyState | null;
	/** Retour après une pause à fêter (l'élève a travaillé depuis) */
	returnAfterPause: boolean;
}

// Constantes
/** Plafond des passages spontanés : un toutes les 10 minutes. */
export const PASSAGE_COOLDOWN = 10 * 60_000;

/** Clé du navigateur qui garde l'heure du dernier passage spontané. */
export const LAST_PASSAGE_KEY = 'chiphre:palotin:dernier-passage';

/** Séances : l'Entraînement, et les révisions en cours (paquet, chapitre). */
const SEANCE_PATTERNS = [
	/^\/automaths\/test(\/|$)/,
	/^\/dashboard\/revisions\/decks\/[^/]+\/study(\/|$)/,
	/^\/dashboard\/revisions\/chapitres\/[^/]+(\/|$)/
];

const nullableString = z.string().nullable();

/** Le Palotin tel que le serveur le rend ; un type inconnu est refusé (le serveur l'a déjà rétréci). */
const buddyStateSchema = z.object({
	student_id: z.string(),
	palotin_type: z.enum(['giron', 'pile', 'cotice']),
	xp: z.number(),
	level: z.number(),
	current_streak: z.number(),
	longest_streak: z.number(),
	last_activity_date: nullableString,
	xp_earned_today: z.number(),
	last_xp_date: nullableString,
	themes_explored: z.array(z.string()),
	change_count: z.number(),
	equipped_skin_id: nullableString,
	constance_week_start: nullableString,
	constance_days_this_week: z.number()
});

export const buddyPresenceSchema = z.object({
	buddy: buddyStateSchema.nullable(),
	returnAfterPause: z.boolean()
});

// Variables
/** Qui veut savoir que l'élève vient de travailler (la présence du Palotin) */
const activityListeners = new Set<() => void>();

// Functions
/** Zone de la page : `null` = le Palotin n'y apparaît pas. */
export function palotinZone(pathname: string): PalotinZone | null {
	if (pathname === '/dashboard' || pathname === '/dashboard/') return 'maison';
	if (/^\/dashboard\/student\/chatterie(\/|$)/.test(pathname)) return 'maison';
	if (SEANCE_PATTERNS.some((pattern) => pattern.test(pathname))) return 'seance';
	if (/^\/dashboard\/(student|revisions)(\/|$)/.test(pathname)) return 'passage';
	return null;
}

/**
 * Plafond des passages spontanés. Le stockage illisible (navigation privée,
 * stockage bloqué) ne lève jamais : le plafond tient alors pour la page ouverte.
 * Une heure enregistrée dans le futur (horloge changée) n'empêche rien.
 */
export function createPassageClock(getStorage: () => Storage | null): PassageClock {
	let memory: number | null = null;

	function readLast(): number | null {
		try {
			const raw = getStorage()?.getItem(LAST_PASSAGE_KEY);
			const stored = raw ? Number(raw) : NaN;
			if (Number.isFinite(stored)) {
				return memory === null ? stored : Math.max(stored, memory);
			}
		} catch {
			// Stockage illisible : la mémoire de la page suffit
		}
		return memory;
	}

	return {
		canPass(now) {
			const last = readLast();
			return last === null || last > now || now - last >= PASSAGE_COOLDOWN;
		},
		record(now) {
			memory = now;
			try {
				getStorage()?.setItem(LAST_PASSAGE_KEY, String(now));
			} catch {
				// Stockage plein ou bloqué : la mémoire de la page suffit
			}
		}
	};
}

/** `localStorage` du navigateur, ou `null` s'il est inaccessible. */
export function browserStorage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/** Réponse de l'API validée ; `null` si elle est mal formée. */
export function parseBuddyPresence(body: unknown): BuddyPresenceView | null {
	const parsed = buddyPresenceSchema.safeParse(body);
	return parsed.success ? parsed.data : null;
}

/**
 * S'inscrit pour savoir que l'élève vient de travailler (un gain de pansées) :
 * la présence du Palotin se relit alors à la page suivante, pour fêter un
 * retour après une pause sans recharger (R2, chantier `regularite`). Rend la
 * fonction de désinscription.
 */
export function registerBuddyActivityListener(listener: () => void): () => void {
	activityListeners.add(listener);
	return () => activityListeners.delete(listener);
}

/** L'élève vient de travailler : prévient les inscrits. */
export function notifyBuddyActivity(): void {
	for (const listener of activityListeners) listener();
}
