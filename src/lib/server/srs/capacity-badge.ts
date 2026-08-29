/**
 * Calcul du badge FSRS agrégé pour une capacité famille A.
 *
 * Le badge dérive des états FSRS (`srs_card_stats`) des templates tagués sur
 * un `curriculum_point`. Règle d'agrégation par priorité décroissante :
 *
 *   1. 🆘 a_remedier        — ≥ 1 template due ET state ∈ {learning, relearning}
 *   2. 🔁 a_renforcer       — ≥ 1 template due ET state = 'review'
 *   3. ⏳ en_apprentissage  — ≥ 1 template avec state = 'new' OU (pas due
 *                              ET state ∈ {learning, relearning})
 *   4. ✅ acquise_en_memoire — ≥ 1 template pas due ET state = 'review'
 *   5. ◯ non_commencee      — aucun template avec srs_card_stats
 *
 * Cas particulier `state='new'` : un template jamais reviewed est classé
 * `en_apprentissage` quel que soit `nextReview` (le `state='new'` arrive
 * avant la 1ère review, sa date next_review n'a pas de sens). Cf. `templateToBadge`.
 *
 * Cf. `docs/wip/srs-fsrs-spec-tdd.md` §5 + `docs/ref/srs/architecture.md` §5.1.
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
 * Récupère et agrège les badges FSRS pour une liste de point_ids et un élève.
 *
 * Retourne une Map point_id → badge. Les capacités sans aucun template tagué
 * (ou sans srs_card_stats sur leurs templates) reçoivent `non_commencee`.
 */
export async function computePointBadges(
	supabase: SB,
	studentId: string,
	pointIds: string[]
): Promise<Map<string, CapacityBadge>> {
	const result = new Map<string, CapacityBadge>();
	if (pointIds.length === 0) return result;

	// 1. Mapping point → templates (M2M)
	const { data: tagMappings, error: tagErr } = await supabase
		.from('question_template_points')
		.select('point_id, template_id')
		.in('point_id', pointIds);

	if (tagErr) {
		console.error('[capacity-badge] tag lookup failed:', tagErr);
		for (const id of pointIds) result.set(id, 'non_commencee');
		return result;
	}

	const tagsByPoint = new Map<string, string[]>();
	for (const row of tagMappings ?? []) {
		const list = tagsByPoint.get(row.point_id) ?? [];
		list.push(row.template_id);
		tagsByPoint.set(row.point_id, list);
	}

	// 2. États FSRS pour tous les templates concernés
	const allTemplateIds = [...new Set((tagMappings ?? []).map((r) => r.template_id))];

	if (allTemplateIds.length === 0) {
		for (const id of pointIds) result.set(id, 'non_commencee');
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
		for (const id of pointIds) result.set(id, 'non_commencee');
		return result;
	}

	const stateByTemplate = new Map<string, FsrsStateRow>();
	for (const row of (fsrsRows ?? []) as FsrsStateRow[]) {
		stateByTemplate.set(row.card_reference_id, row);
	}

	// 3. Agrégation par point
	const now = Date.now();
	for (const pointId of pointIds) {
		const templateIds = tagsByPoint.get(pointId) ?? [];
		const states = templateIds
			.map((tid) => stateByTemplate.get(tid))
			.filter((s): s is FsrsStateRow => Boolean(s));

		result.set(pointId, aggregateBadge(states, now));
	}

	return result;
}

/**
 * Calcule le badge d'un SEUL template depuis son état FSRS.
 *
 * Source de vérité unique de la règle de mapping (state, nextReview) → badge,
 * utilisée à la fois par :
 *   - le calcul de section dans la page deck Programme (per-template)
 *   - l'agrégation montante par capacité dans la page objectifs
 *
 * Convention `state='new'` : la carte n'a jamais été reviewed (cas exotique
 * où une carte a été créée mais aucun skill_attempt ne lui correspond encore).
 * On la classe en `en_apprentissage` quel que soit `nextReview` — "à remédier"
 * implique un échec, "non commencée" implique l'absence de carte.
 */
export function templateToBadge(
	state: CardState,
	nextReview: string | null,
	nowMs: number
): CapacityBadge {
	if (state === 'new') return 'en_apprentissage';
	if (!nextReview) return 'en_apprentissage';

	const nextReviewMs = new Date(nextReview).getTime();
	const isDue = nextReviewMs <= nowMs;
	const isLearningState = state === 'learning' || state === 'relearning';
	const isReviewState = state === 'review';

	if (isDue && isLearningState) return 'a_remedier';
	if (isDue && isReviewState) return 'a_renforcer';
	if (!isDue && isReviewState) return 'acquise_en_memoire';
	return 'en_apprentissage';
}

/**
 * Ordre de priorité descendant des badges. Source unique de vérité utilisée
 * par `worstBadge()`, `aggregateBadge()` et les consumers UI qui veulent
 * trier ou comparer 2 badges.
 *
 * Plus la valeur est élevée, plus le badge est prioritaire dans l'agrégation
 * (un `a_remedier` parmi plusieurs templates l'emporte sur tout le reste).
 */
export const BADGE_PRIORITY: Record<CapacityBadge, number> = {
	a_remedier: 5,
	a_renforcer: 4,
	en_apprentissage: 3,
	acquise_en_memoire: 2,
	non_commencee: 1
};

/**
 * Retourne le badge de priorité la plus élevée parmi une liste.
 * Exporté pour usage côté UI (agrégation par objectif/groupe).
 */
export function worstBadge(badges: CapacityBadge[]): CapacityBadge {
	if (badges.length === 0) return 'non_commencee';
	return badges.reduce((acc, b) => (BADGE_PRIORITY[b] > BADGE_PRIORITY[acc] ? b : acc));
}

/**
 * Agrège une liste d'états FSRS en badge unique selon les règles de priorité.
 *
 * Délègue à `templateToBadge` puis `worstBadge` — source unique de vérité.
 */
export function aggregateBadge(states: FsrsStateRow[], nowMs: number): CapacityBadge {
	const badges = states.map((s) => templateToBadge(s.state, s.next_review, nowMs));
	return worstBadge(badges);
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
