/**
 * À quelle évaluation rattacher une séance enregistrée (`/api/tests/save`, B16) ?
 *
 * - Pas d'assignation : entraînement libre, aucun rattachement.
 * - Destinataire vérifié EN PREMIER. L'APERÇU du professeur (propriétaire, non
 *   destinataire) n'est JAMAIS rattaché : une séance rattachée verrouille la
 *   série (Q24).
 * - Pour un destinataire :
 *   · la forme de la séance doit être celle de l'évaluation (sinon 400) ;
 *   · les catégories envoyées doivent être celles de la série (sinon 400) :
 *     comparées par composition, jamais par JSON brut (jsonb réordonne les clés) ;
 *   · date limite et tentatives revérifiées (sinon 403) : la vérification du
 *     démarrage ne suffit pas, la sauvegarde est l'écriture qui compte.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	getAssignmentWithEvaluation,
	isAssignmentRecipient,
	validateAttempt
} from '$lib/server/evaluations';

export type SessionEvaluationResolution =
	| { ok: true; evaluationId: string | null }
	| { ok: false; status: number; error: string };

export const FORM_MISMATCH_MESSAGE =
	"La forme de la séance ne correspond pas à celle de l'évaluation";
export const CATEGORIES_MISMATCH_MESSAGE =
	"Les questions de la séance ne correspondent pas à celles de l'évaluation";

/** Clé de composition d'une catégorie ; null si la forme est illisible */
function compositionKey(item: unknown): string | null {
	if (!item || typeof item !== 'object') return null;
	const { category, quantity, delay } = item as {
		category?: { theme?: unknown; domain?: unknown; subdomain?: unknown; level?: unknown };
		quantity?: unknown;
		delay?: unknown;
	};
	if (!category || typeof category !== 'object') return null;
	return JSON.stringify([
		String(category.theme),
		String(category.domain),
		// Même règle que la couverture : sous-domaine absent = chaîne vide
		category.subdomain == null ? '' : String(category.subdomain),
		String(category.level),
		String(quantity),
		String(delay)
	]);
}

/**
 * Deux listes de catégories ont-elles la même composition (thème, domaine,
 * sous-domaine, niveau, quantité, durée), quel que soit l'ordre ?
 */
export function sameComposition(a: unknown[], b: unknown[]): boolean {
	if (a.length !== b.length) return false;
	const keysA = a.map(compositionKey);
	const keysB = b.map(compositionKey);
	if (keysA.includes(null) || keysB.includes(null)) return false;
	keysA.sort();
	keysB.sort();
	return keysA.every((key, index) => key === keysB[index]);
}

export async function resolveSessionEvaluation(
	supabase: SupabaseClient<Database>,
	assignmentId: string | undefined,
	mode: string,
	userId: string,
	categories: unknown[]
): Promise<SessionEvaluationResolution> {
	if (!assignmentId) return { ok: true, evaluationId: null };

	if (mode !== 'interactive' && mode !== 'course') {
		return {
			ok: false,
			status: 400,
			error: 'Une évaluation se passe en Entraînement ou en Course aux nombres'
		};
	}

	const found = await getAssignmentWithEvaluation(supabase, assignmentId);
	if (!found) {
		return { ok: false, status: 404, error: 'Évaluation introuvable' };
	}

	// Aperçu (propriétaire non destinataire) : enregistré, jamais rattaché
	const recipient = await isAssignmentRecipient(supabase, found.assignment, userId);
	if (!recipient) return { ok: true, evaluationId: null };

	const { evaluation } = found;
	if (evaluation.form !== mode) {
		return { ok: false, status: 400, error: FORM_MISMATCH_MESSAGE };
	}
	if (!sameComposition(categories, evaluation.series.categories)) {
		return { ok: false, status: 400, error: CATEGORIES_MISMATCH_MESSAGE };
	}

	const validation = await validateAttempt(supabase, evaluation, userId);
	if (!validation.can_attempt) {
		return {
			ok: false,
			status: 403,
			error: validation.reason ?? 'Vous ne pouvez plus passer cette évaluation'
		};
	}

	return { ok: true, evaluationId: evaluation.id };
}
