/**
 * API Route: POST /api/skill-attempts
 *
 * Crée une row `skill_attempts` (régime per-template famille A) à chaque réponse
 * d'un quiz interactif (Monde 1 — `FlashCard.svelte`).
 *
 * Effets cumulés (Phase 2 refonte 2026-06-10) :
 *   1. UPSERT `srs_card_stats` via FSRS-6 (le grade est dérivé de `success`).
 *   2. INSERT 1 row dans `skill_attempts` (au lieu de N comme avant).
 *   3. Si template tagué famille A : auto-ajout au deck Programme.
 *   4. Le trigger PG recalcule `student_skill_state_a` pour chaque skill tagué.
 *
 * Famille B : non gérée ici (passe par evaluation_tasks côté prof).
 *
 * Réponse :
 *   200 { inserted: 1, skill_ids: [...skill_ids tagués...] }
 *
 * Codes d'erreur :
 *   400 — JSON ou Zod invalide
 *   401 — non authentifié
 *   404 — template_id inexistant
 *   500 — INSERT ou UPSERT échoue
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §1
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { skillAttemptInputSchema } from '$lib/server/validation/skill-attempts';
import { FSRS } from '$lib/srs/fsrs';
import { Grade, type CardStats } from '$lib/srs/types';
import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';

// ============================================================================
// POST /api/skill-attempts
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);

	// Parse et validation Zod
	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = skillAttemptInputSchema.safeParse(bodyRaw);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { template_id, success, with_help, phase_blocage } = validation.data;

	// Vérification existence du template
	const { data: templateRow, error: templateError } = await locals.supabase
		.from('question_templates')
		.select('id')
		.eq('id', template_id)
		.maybeSingle();

	if (templateError) {
		console.error('[skill-attempts] Failed to verify template:', templateError);
		throw error(500, 'Failed to verify template');
	}

	if (!templateRow) {
		throw error(404, 'template_not_found');
	}

	// Mapping success → grade (cf. spec §1.1)
	const grade: Grade = success ? Grade.GOOD : Grade.AGAIN;

	// ----- FSRS update synchrone côté TS (AVANT l'INSERT skill_attempts) -----
	// Fail-loud : si FSRS UPSERT échoue, on n'insère PAS skill_attempts pour
	// éviter une désynchro durable srs_card_stats ↔ student_skill_state_a.
	// Le client peut retenter ; un échec persistant signale un vrai bug à fixer.
	try {
		await applyFsrsUpdate(locals.supabase, user.id, template_id, grade);
	} catch (fsrsErr) {
		console.error('[skill-attempts] FSRS update failed (fail-loud):', {
			userId: user.id,
			templateId: template_id,
			grade,
			err: fsrsErr
		});
		return json({ error: 'fsrs_update_failed' }, { status: 500 });
	}

	// ----- INSERT skill_attempts (per-template) -----
	// 1 row par attempt. Le trigger boucle ensuite sur question_template_skills
	// pour recalculer chaque student_skill_state_a impactée.
	const attemptRow: Record<string, unknown> = {
		student_id: user.id,
		template_id,
		success,
		grade,
		with_help,
		source: 'auto'
	};
	if (phase_blocage !== undefined) {
		attemptRow.phase_blocage = phase_blocage;
	}

	const { error: insertError } = await locals.supabase
		.from('skill_attempts')
		.insert(attemptRow as never);

	if (insertError) {
		console.error('[skill-attempts] INSERT failed:', insertError);
		return json({ error: 'insert_failed', detail: insertError.message }, { status: 500 });
	}

	// ----- Récupération des skill_ids tagués (pour réponse + auto-Programme) -----
	const { data: taggedSkills, error: skillsError } = await locals.supabase
		.from('question_template_skills')
		.select('skill_id, skills!inner(family)')
		.eq('template_id', template_id)
		.eq('skills.family', 'knowledge');

	if (skillsError) {
		console.error('[skill-attempts] Tagged skills lookup failed:', skillsError);
		// Pas bloquant — la trigger a déjà fait son travail.
	}

	const skillIds = (taggedSkills ?? []).map((row) => row.skill_id as string);

	// ----- Auto-ajout au deck Programme si template tagué -----
	if (skillIds.length > 0) {
		try {
			await ensureProgrammeDeckCard(locals.supabase, user.id, template_id);
		} catch (progErr) {
			console.error('[skill-attempts] Programme deck add failed:', progErr);
			// Non bloquant : le skill_attempts est déjà enregistré.
		}
	}

	return json({ inserted: 1, skill_ids: skillIds });
};

// ============================================================================
// Helpers internes
// ============================================================================

/**
 * Met à jour `srs_card_stats` côté FSRS de manière synchrone pour
 * (user, template). Initialise la row si absente.
 *
 * Cohabite avec `srs_card_stats` partagés entre tous les decks de l'élève
 * contenant ce template (UNIQUE `(user_id, card_reference_type, card_reference_id)`).
 */
async function applyFsrsUpdate(
	supabase: import('@supabase/supabase-js').SupabaseClient,
	userId: string,
	templateId: string,
	grade: Grade
): Promise<void> {
	const fsrs = new FSRS();

	// Lecture stats existants
	const { data: existing } = await supabase
		.from('srs_card_stats')
		.select('*')
		.eq('user_id', userId)
		.eq('card_reference_type', 'template')
		.eq('card_reference_id', templateId)
		.maybeSingle();

	let stats: CardStats;
	if (existing) {
		stats = {
			id: existing.id,
			userId: existing.user_id,
			cardReferenceType: existing.card_reference_type,
			cardReferenceId: existing.card_reference_id,
			difficulty: existing.difficulty,
			stability: existing.stability,
			state: existing.state,
			lastReview: existing.last_review,
			nextReview: existing.next_review,
			totalReviews: existing.total_reviews,
			reviewHistory: existing.review_history || [],
			createdAt: existing.created_at,
			updatedAt: existing.updated_at
		};
	} else {
		const init = fsrs.initCard(userId, 'template', templateId);
		stats = {
			id: crypto.randomUUID(),
			...init,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	}

	const updated = fsrs.reviewCard(stats, grade);

	const { error: upsertErr } = await supabase.from('srs_card_stats').upsert(
		{
			id: stats.id,
			user_id: userId,
			card_reference_type: 'template',
			card_reference_id: templateId,
			difficulty: updated.difficulty,
			stability: updated.stability,
			state: updated.state,
			last_review: updated.lastReview,
			next_review: updated.nextReview,
			total_reviews: updated.totalReviews,
			review_history: updated.reviewHistory
		},
		{ onConflict: 'user_id,card_reference_type,card_reference_id' }
	);

	if (upsertErr) throw upsertErr;
}
