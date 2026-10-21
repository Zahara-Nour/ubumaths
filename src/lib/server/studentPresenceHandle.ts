/**
 * Présence de l'élève, notée sur toute page vue
 * =============================================
 *
 * Décidé par David le 2026-10-21 (docs/wip/palotins-presence-progress.md) : le
 * Palotin dit « tu m'as manqué » après 21 jours d'absence. Est PRÉSENT l'élève
 * connecté qui voit une page, quelle qu'elle soit (lien de cours partagé,
 * Automaths…), préchargement compris — pas seulement son tableau de bord.
 *
 * - Élèves au compte approuvé seulement (le prof et l'admin n'ont pas de Palotin ;
 *   rien à noter pour un compte en attente ou refusé).
 * - Hors `/api/*` : un onglet resté ouvert qui interroge le serveur seul ne doit
 *   pas faire passer pour présent un élève parti.
 * - Au plus une écriture par jour et par instance du serveur : mémoire locale,
 *   SANS cookie (un cookie de plus serait à déclarer, et laisserait l'identifiant
 *   de l'élève sur un poste partagé). Une instance neuve réécrit une fois :
 *   `record_student_visit` est sans effet le même jour. Mémorisé même si
 *   l'écriture échoue : une panne ne relance pas l'écriture à chaque page, et
 *   n'empêche jamais la page de s'afficher.
 */

import type { Handle } from '@sveltejs/kit';
import { recordStudentPresence } from '$lib/server/buddy-queries';
import { utcDay } from '$lib/utils/buddy-constance';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/studentPresenceHandle');

// Constantes

/** Au-delà, la mémoire repart de zéro (bornée, quel que soit le trafic). */
const MAX_REMEMBERED = 10_000;

// Variables

/**
 * Élève → jour UTC et écriture de sa présence par cette instance. La PROMESSE est
 * gardée : deux requêtes simultanées du même jour (document et `__data.json`)
 * attendent la même écriture, et le layout lit toujours après elle.
 */
const notedToday = new Map<string, { day: string; written: Promise<void> }>();

// Functions

/** Vide la mémoire (tests). */
export function forgetPresences(): void {
	notedToday.clear();
}

/** Écrit la présence ; une panne (même une exception) est journalisée, jamais levée. */
async function writePresence(studentId: string): Promise<void> {
	try {
		await recordStudentPresence(studentId);
	} catch (err) {
		logger.error('Présence non enregistrée :', err);
	}
}

// Handle

export const studentPresenceHandle: Handle = async ({ event, resolve }) => {
	const { user, profile } = event.locals;
	const routeId = event.route.id;
	if (
		!user ||
		profile?.role !== 'student' ||
		profile.status !== 'approved' ||
		!routeId ||
		routeId.startsWith('/api/')
	) {
		return resolve(event);
	}

	const today = utcDay();
	let noted = notedToday.get(user.id);
	if (noted?.day !== today) {
		if (notedToday.size >= MAX_REMEMBERED) notedToday.clear();
		noted = { day: today, written: writePresence(user.id) };
		notedToday.set(user.id, noted);
	}
	// Ne lève pas : une panne est journalisée, la page s'affiche quand même
	await noted.written;

	return resolve(event);
};
