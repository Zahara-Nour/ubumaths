/**
 * Helpers FSRS partagés entre `/api/skill-attempts` (Monde 1) et
 * `/api/srs/review/submit` (Monde 2).
 *
 * Refactor 2026-06-10 (code-quality #2.2) : factorisation de la duplication
 * de logique `lecture stats existants → init via FSRS.initCard si absent →
 * fsrs.reviewCard → UPSERT srs_card_stats` qui était répétée dans les 2
 * endpoints.
 *
 * Chaque endpoint passe sa propre instance `FSRS` (Monde 1 utilise les
 * paramètres par défaut ; Monde 2 lit `deck.config` validé via Zod). Le
 * comportement est strictement équivalent à l'ancien code inline.
 *
 * Note : la table `srs_card_stats` est partagée entre tous les decks de
 * l'élève contenant le même template (UNIQUE `(user_id, card_reference_type,
 * card_reference_id)`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import { FSRS } from '$lib/srs/fsrs';
import type { CardState, CardStats, Grade, ReviewHistoryEntry } from '$lib/srs/types';

type SB = SupabaseClient<Database>;

const UPSERT_CONFLICT_KEY = 'user_id,card_reference_type,card_reference_id';

/**
 * Lit la row `srs_card_stats` existante pour (user, card) et la map vers
 * `CardStats`. Si elle n'existe pas, initialise une row via `fsrs.initCard()`
 * avec `stability=0` (mode "first review" requis par `FSRS.reviewCard`).
 *
 * Pure : ne fait aucune écriture DB.
 */
export async function loadOrInitCardStats(
	supabase: SB,
	fsrs: FSRS,
	userId: string,
	cardReferenceType: 'template' | 'custom',
	cardReferenceId: string
): Promise<CardStats> {
	const { data: existing } = await supabase
		.from('srs_card_stats')
		.select('*')
		.eq('user_id', userId)
		.eq('card_reference_type', cardReferenceType)
		.eq('card_reference_id', cardReferenceId)
		.maybeSingle();

	if (existing) {
		return {
			id: existing.id,
			userId: existing.user_id,
			// DB columns are free-form text/JSONB; narrow to the domain unions/shapes
			cardReferenceType: existing.card_reference_type as 'template' | 'custom',
			cardReferenceId: existing.card_reference_id,
			difficulty: existing.difficulty,
			stability: existing.stability,
			state: existing.state as CardState,
			lastReview: existing.last_review,
			nextReview: existing.next_review,
			totalReviews: existing.total_reviews,
			reviewHistory: (existing.review_history as unknown as ReviewHistoryEntry[]) ?? [],
			createdAt: existing.created_at,
			updatedAt: existing.updated_at
		};
	}

	const init = fsrs.initCard(userId, cardReferenceType, cardReferenceId);
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		...init,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * UPSERT d'une row `srs_card_stats`. Conflict resolution via la contrainte
 * UNIQUE `(user_id, card_reference_type, card_reference_id)`.
 *
 * Throws si l'UPSERT échoue (caller décide du fail-loud ou fail-silent).
 */
export async function upsertCardStats(supabase: SB, stats: CardStats): Promise<void> {
	const { error: upsertErr } = await supabase.from('srs_card_stats').upsert(
		{
			id: stats.id,
			user_id: stats.userId,
			card_reference_type: stats.cardReferenceType,
			card_reference_id: stats.cardReferenceId,
			difficulty: stats.difficulty,
			stability: stats.stability,
			state: stats.state,
			last_review: stats.lastReview,
			next_review: stats.nextReview,
			total_reviews: stats.totalReviews,
			// ReviewHistoryEntry[] (interface) → JSONB column: bridge to Json
			review_history: stats.reviewHistory as unknown as Json
		},
		{ onConflict: UPSERT_CONFLICT_KEY }
	);

	if (upsertErr) throw upsertErr;
}

/**
 * Pipeline complet : load (ou init) → fsrs.reviewCard(grade, timeSpent?) →
 * upsert. Retourne la `CardStats` mise à jour.
 *
 * Throws sur erreur UPSERT (cf. stratégie fail-loud des endpoints).
 */
export async function applyFsrsReview(
	supabase: SB,
	fsrs: FSRS,
	userId: string,
	cardReferenceType: 'template' | 'custom',
	cardReferenceId: string,
	grade: Grade,
	timeSpent?: number
): Promise<CardStats> {
	const stats = await loadOrInitCardStats(
		supabase,
		fsrs,
		userId,
		cardReferenceType,
		cardReferenceId
	);

	const updated = fsrs.reviewCard(stats, grade, timeSpent);

	// fsrs.reviewCard renvoie Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>,
	// on rattache les champs préservés depuis `stats`.
	const newStats: CardStats = {
		...stats,
		...updated
	};

	await upsertCardStats(supabase, newStats);
	return newStats;
}
