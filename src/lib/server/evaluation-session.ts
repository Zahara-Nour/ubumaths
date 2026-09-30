/**
 * À quelle évaluation rattacher une séance enregistrée (`/api/tests/save`, B16) ?
 *
 * - Pas d'assignation : entraînement libre, aucun rattachement.
 * - La forme de la séance doit être celle de l'évaluation (sinon 400) : une
 *   évaluation en Course aux nombres ne se « passe » pas en Entraînement.
 * - L'APERÇU du professeur (propriétaire, non destinataire) n'est JAMAIS
 *   rattaché : une séance rattachée verrouille la série (Q24).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getAssignmentWithEvaluation, isAssignmentRecipient } from '$lib/server/evaluations';

export type SessionEvaluationResolution =
	| { ok: true; evaluationId: string | null }
	| { ok: false; status: number; error: string };

export const FORM_MISMATCH_MESSAGE =
	"La forme de la séance ne correspond pas à celle de l'évaluation";

export async function resolveSessionEvaluation(
	supabase: SupabaseClient<Database>,
	assignmentId: string | undefined,
	mode: string,
	userId: string
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
	if (found.evaluation.form !== mode) {
		return { ok: false, status: 400, error: FORM_MISMATCH_MESSAGE };
	}

	const recipient = await isAssignmentRecipient(supabase, found.assignment, userId);
	return { ok: true, evaluationId: recipient ? found.evaluation.id : null };
}
