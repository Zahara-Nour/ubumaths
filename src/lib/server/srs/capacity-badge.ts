/**
 * Calcul du badge FSRS agrégé pour une capacité famille A.
 *
 * Le badge dérive des états FSRS (`srs_card_stats`) des templates tagués sur
 * une `skill` (capacité). Règle d'agrégation par priorité décroissante :
 *
 *   1. 🆘 a_remedier        — ≥ 1 template due ET state ∈ {learning, relearning}
 *   2. 🔁 a_renforcer       — ≥ 1 template due ET state = 'review'
 *   3. ✅ acquise_en_memoire — ≥ 1 template pas due ET state = 'review'
 *   4. ⏳ en_apprentissage  — ≥ 1 template pas due ET state ∈ {learning, relearning}
 *   5. ◯ non_commencee      — aucun template avec srs_card_stats
 *
 * Cf. `docs/wip/srs-fsrs-spec-tdd.md` §5 + `docs/wip/srs-fsrs-architecture-cible.md` §5.1.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type SB = SupabaseClient<Database>;

export type CapacityBadge =
	| 'a_remedier'
	| 'a_renforcer'
	| 'acquise_en_memoire'
	| 'en_apprentissage'
	| 'non_commencee';

type CardState = 'new' | 'learning' | 'review' | 'relearning';

interface FsrsStateRow {
	card_reference_id: string;
	state: CardState;
	next_review: string;
}

/**
 * Récupère et agrège les badges FSRS pour une liste de skill_ids et un élève.
 *
 * Retourne une Map skill_id → badge. Les capacités sans aucun template tagué
 * (ou sans srs_card_stats sur leurs templates) reçoivent `non_commencee`.
 */
export async function computeCapacityBadges(
	supabase: SB,
	studentId: string,
	skillIds: string[]
): Promise<Map<string, CapacityBadge>> {
	const result = new Map<string, CapacityBadge>();
	if (skillIds.length === 0) return result;

	// 1. Mapping skill → templates (M2M)
	const { data: tagMappings, error: tagErr } = await supabase
		.from('question_template_skills')
		.select('skill_id, template_id')
		.in('skill_id', skillIds);

	if (tagErr) {
		console.error('[capacity-badge] tag lookup failed:', tagErr);
		for (const id of skillIds) result.set(id, 'non_commencee');
		return result;
	}

	const tagsBySkill = new Map<string, string[]>();
	for (const row of tagMappings ?? []) {
		const list = tagsBySkill.get(row.skill_id) ?? [];
		list.push(row.template_id);
		tagsBySkill.set(row.skill_id, list);
	}

	// 2. États FSRS pour tous les templates concernés
	const allTemplateIds = [...new Set((tagMappings ?? []).map((r) => r.template_id))];

	if (allTemplateIds.length === 0) {
		for (const id of skillIds) result.set(id, 'non_commencee');
		return result;
	}

	const { data: fsrsRows, error: fsrsErr } = await supabase
		.from('srs_card_stats')
		.select('card_reference_id, state, next_review')
		.eq('user_id', studentId)
		.eq('card_reference_type', 'template')
		.in('card_reference_id', allTemplateIds);

	if (fsrsErr) {
		console.error('[capacity-badge] fsrs lookup failed:', fsrsErr);
		for (const id of skillIds) result.set(id, 'non_commencee');
		return result;
	}

	const stateByTemplate = new Map<string, FsrsStateRow>();
	for (const row of (fsrsRows ?? []) as FsrsStateRow[]) {
		stateByTemplate.set(row.card_reference_id, row);
	}

	// 3. Agrégation par skill
	const now = Date.now();
	for (const skillId of skillIds) {
		const templateIds = tagsBySkill.get(skillId) ?? [];
		const states = templateIds
			.map((tid) => stateByTemplate.get(tid))
			.filter((s): s is FsrsStateRow => Boolean(s));

		result.set(skillId, aggregateBadge(states, now));
	}

	return result;
}

/**
 * Agrège une liste d'états FSRS en badge unique selon les règles de priorité.
 *
 * Exporté pour testabilité (pure function).
 */
export function aggregateBadge(states: FsrsStateRow[], nowMs: number): CapacityBadge {
	if (states.length === 0) return 'non_commencee';

	let hasRemediation = false;
	let hasReinforcement = false;
	let hasAcquired = false;
	let hasLearning = false;

	for (const s of states) {
		const nextReviewMs = new Date(s.next_review).getTime();
		const isDue = nextReviewMs <= nowMs;
		const isLearningState = s.state === 'learning' || s.state === 'relearning';
		const isReviewState = s.state === 'review';

		if (isDue && isLearningState) hasRemediation = true;
		else if (isDue && isReviewState) hasReinforcement = true;
		else if (!isDue && isReviewState) hasAcquired = true;
		else if (!isDue && isLearningState) hasLearning = true;
		// state='new' : pas pris en compte (jamais reviewée → en apprentissage implicite)
		else if (s.state === 'new') hasLearning = true;
	}

	if (hasRemediation) return 'a_remedier';
	if (hasReinforcement) return 'a_renforcer';
	if (hasAcquired) return 'acquise_en_memoire';
	if (hasLearning) return 'en_apprentissage';
	return 'non_commencee';
}

/**
 * Libellé court pour affichage UI.
 */
export const BADGE_LABEL: Record<CapacityBadge, string> = {
	a_remedier: 'À remédier',
	a_renforcer: 'À renforcer',
	acquise_en_memoire: 'Acquise',
	en_apprentissage: 'En apprentissage',
	non_commencee: 'Non commencée'
};

/**
 * Visuel emoji court pour badge inline.
 */
export const BADGE_VISUAL: Record<CapacityBadge, string> = {
	a_remedier: '🆘',
	a_renforcer: '🔁',
	acquise_en_memoire: '✅',
	en_apprentissage: '⏳',
	non_commencee: '◯'
};
