/**
 * Question longtemps ratée enfin réussie (chantier `regularite`, PR B3)
 * ======================================================================
 *
 * Moment fêté par le Palotin sur la carte de fin de série (Saisie, Contrôle
 * blanc, Course aux nombres) : la 1re réussite d'un modèle **dans la série**
 * suit au moins 3 échecs sans réussite entre eux, le premier de ces échecs au
 * moins 7 jours avant (dates de Paris) (R5, U2).
 *
 * - Traces corrigées par l'appli seulement (`source = 'auto'`) : contrôles
 *   compris pour les échecs (U3) ; révision et flash-cards sont déclarées.
 * - « Déjà dit » sans stockage (U4) : une réussite plus tardive casse la règle
 *   d'elle-même ; seule une réussite postérieure au début de la série compte,
 *   pour qu'une 2e série du même jour ne refête pas.
 * - Lu en base avec les droits du serveur, jamais d'après le client : le client
 *   ne fait que désigner les modèles à relire et la durée de la série.
 */

import { schoolDay } from '$lib/server/course-card-attempts';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

// Types
/** Trace d'un modèle : instant et verdict (`null` = inconnu) */
export interface StruggleTrace {
	created_at: string;
	success: boolean | null;
}

// Constantes
const MIN_FAILURES = 3;
const MIN_DAYS = 7;
/** Traces relues par modèle, des plus récentes aux plus anciennes */
const TRACES_PER_TEMPLATE = 100;
/** Modèles relus au plus par série */
const MAX_TEMPLATES = 30;
const DAY_MS = 24 * 3600 * 1000;

// Functions

/** Écart en jours entre deux dates civiles AAAA-MM-JJ */
function daysBetween(from: string, to: string): number {
	return Math.round(
		(new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS
	);
}

/**
 * La 1re réussite postérieure à `since` suit-elle au moins 3 échecs sans
 * réussite entre eux, le premier au moins 7 jours avant (dates de Paris) ?
 * Traces d'un seul modèle, dans n'importe quel ordre.
 */
export function isLongStruggleWon(traces: StruggleTrace[], since: Date): boolean {
	const known = traces
		.filter((t): t is StruggleTrace & { success: boolean } => t.success !== null)
		.sort((a, b) => a.created_at.localeCompare(b.created_at));
	const sinceMs = since.getTime();
	const winIndex = known.findIndex((t) => t.success && new Date(t.created_at).getTime() >= sinceMs);
	if (winIndex === -1) return false;

	// Échecs d'affilée juste avant cette réussite
	let first = winIndex;
	while (first > 0 && !known[first - 1].success) first -= 1;
	const failures = winIndex - first;
	if (failures < MIN_FAILURES) return false;

	const firstFailDay = schoolDay(new Date(known[first].created_at));
	const winDay = schoolDay(new Date(known[winIndex].created_at));
	return daysBetween(firstFailDay, winDay) >= MIN_DAYS;
}

/**
 * Un des modèles réussis de la série est-il une question longtemps ratée ?
 * Une lecture par modèle (index `student_id, template_id, created_at`), en
 * parallèle. Lecture en échec → lève (l'appelant n'en fait pas un échec).
 */
export async function loadLongStruggleWon(
	studentId: string,
	templateIds: string[],
	since: Date
): Promise<boolean> {
	const ids = [...new Set(templateIds)].slice(0, MAX_TEMPLATES);
	if (ids.length === 0) return false;
	const service = createServiceRoleClient();
	const results = await Promise.all(
		ids.map(async (templateId) => {
			const { data, error } = await service
				.from('skill_attempts')
				.select('created_at, success')
				.eq('student_id', studentId)
				.eq('template_id', templateId)
				.eq('source', 'auto')
				.order('created_at', { ascending: false })
				.limit(TRACES_PER_TEMPLATE);
			if (error) throw new Error(`traces du modèle illisibles — ${error.message}`);
			return isLongStruggleWon(data ?? [], since);
		})
	);
	return results.some(Boolean);
}
