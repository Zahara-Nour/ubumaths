/**
 * API Route: POST /api/skill-attempts
 *
 * Crée une row `skill_attempts` (régime per-template) à chaque réponse d'une
 * série libre, envoyée dès la réponse : Flash-cards, Contrôle blanc, Course aux
 * nombres, Saisie (`series-trace.ts`).
 * Source : `student_self` (déclaré) pour une carte de cours ou le lieu
 * `flash_cards`, `auto` (corrigé par l'application) sinon.
 *
 * Effets cumulés (Phase 2 refonte 2026-06-10) :
 *   1. UPSERT `srs_card_stats` via FSRS-6 (le grade est dérivé de `success` ;
 *      réussite « en QCM » = demi-réussite, idée 4 du chantier `idees-format`).
 *   2. INSERT 1 row dans `skill_attempts` (au lieu de N comme avant).
 *   3. Si template tagué sur un point du programme : auto-ajout au deck Programme.
 *   4. Le trigger PG recalcule `student_point_state` pour chaque point tagué.
 *
 * Famille B : non gérée ici (passe par evaluation_tasks côté prof).
 *
 * Contenu d'une trace (ADR 0038) : lieu exigé (flash_cards, typing, mock_test,
 * number_race — jamais `evaluation` ni `review`), graine, durées et fin (formes
 * chronométrées), réponse et verdict par case (formes où l'on tape). Les règles
 * du Zod reprennent les CHECK de la base. `answer_parts` est du texte libre
 * écrit par un mineur : toujours affiché échappé.
 *
 * Réponse :
 *   200 { inserted: 1, point_ids: [...points tagués...] }
 *   200 { success: true, recorded: false } — compte non élève (admin, prof) :
 *       rien n'est écrit (aperçu admin, pages de démo).
 *
 * Codes d'erreur :
 *   400 — JSON ou Zod invalide
 *   401 — non authentifié
 *   404 — template_id inexistant
 *   500 — INSERT ou UPSERT échoue
 *
 * Spec : docs/archive/wip/srs-fsrs-spec-tdd.md §1
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { skillAttemptInputSchema } from '#lib/server/validation/skill-attempts.ts';
import { recordStudentAttempt } from '#lib/server/skill-attempts/record-attempt.ts';

// ============================================================================
// POST /api/skill-attempts
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);

	// Parse et validation Zod
	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = skillAttemptInputSchema.safeParse(bodyRaw);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const {
		template_id,
		success,
		with_help,
		phase_blocage,
		place,
		seed,
		response_ms,
		allotted_ms,
		end_reason,
		answer_parts,
		part_verdicts,
		answered_as_choice
	} = validation.data;

	// Seul un élève laisse une trace. L'aperçu admin d'un modèle et les pages de
	// démo passent par la même `FlashCard` : un admin ou un professeur y répond
	// sans polluer les statistiques (ni tentative, ni fiche FSRS, ni deck).
	if (profile.role !== 'student') {
		return Response.json({ success: true, recorded: false });
	}

	// Modèle, FSRS, trace et deck Programme : cœur commun avec la Descente
	const result = await recordStudentAttempt(locals.supabase, {
		studentId: user.id,
		templateId: template_id,
		success,
		withHelp: with_help,
		phaseBlocage: phase_blocage,
		place,
		seed,
		responseMs: response_ms,
		allottedMs: allotted_ms,
		endReason: end_reason,
		answerParts: answer_parts,
		partVerdicts: part_verdicts,
		answeredAsChoice: answered_as_choice
	});

	if (!result.ok) {
		if (result.reason === 'template_check_failed') throw error(500, 'Failed to verify template');
		if (result.reason === 'template_not_found') throw error(404, 'template_not_found');
		return Response.json({ error: result.reason }, { status: 500 });
	}

	return Response.json({ inserted: 1, point_ids: result.pointIds });
};
