/**
 * Résultats des RPC marketplace
 * =============================
 *
 * `check_daily_trade_limit` et `execute_trade` sont déclarées `RETURNS json` /
 * `RETURNS jsonb` : le type généré est donc `Json`, une union qui ne porte
 * aucune des clés attendues. Le code les lisait directement (`.can_create_trade`,
 * `.success`, `.error`), ce que le compilateur ne pouvait pas valider.
 *
 * On restitue ici le contrat réel des fonctions, tel qu'écrit dans leur corps
 * SQL, et on le fait respecter par Zod plutôt que par un cast : une fonction
 * qui part en `EXCEPTION` renvoie une forme différente, et il faut le voir.
 */
import { z } from 'zod';

/**
 * `check_daily_trade_limit(p_user_id uuid)`.
 *
 * Chemin nominal et chemin d'exception ont des formes distinctes — d'où
 * l'union discriminée sur `success`. Le code testait `!can_create_trade` sans
 * regarder `success` : en cas d'exception SQL, `undefined` était interprété
 * comme « quota atteint » et l'élève voyait une limite fantôme.
 */
export const dailyTradeLimitSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		can_create_trade: z.boolean(),
		trades_today: z.number().int(),
		max_trades: z.number().int(),
		remaining_trades: z.number().int()
	}),
	z.object({
		success: z.literal(false),
		error: z.string()
	})
]);

export type DailyTradeLimit = z.infer<typeof dailyTradeLimitSchema>;

/**
 * `execute_trade(p_trade_id uuid)`.
 *
 * Renvoie `{success:false, error}` pour tous les refus métier (échange
 * introuvable, appelant non participant, quota, solde insuffisant…) : ce n'est
 * donc PAS une erreur PostgREST, et l'ignorer revient à traiter un refus comme
 * une réussite.
 */
export const executeTradeSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		trade_id: z.string().uuid(),
		completed_at: z.string()
	}),
	z.object({
		success: z.literal(false),
		error: z.string()
	})
]);

export type ExecuteTradeResult = z.infer<typeof executeTradeSchema>;

/**
 * `record_listing_views_batch(p_listing_ids uuid[], p_user_id uuid)`.
 *
 * Simple compteur de vues uniques : le résultat ne sert qu'à un log.
 */
export const recordListingViewsSchema = z.object({
	success: z.boolean(),
	new_views: z.number().int(),
	listing_ids: z.array(z.string().uuid())
});

export type RecordListingViews = z.infer<typeof recordListingViewsSchema>;

/**
 * `unlock_specific_cards(...)` — nombre de cartes effectivement déverrouillées.
 */
export const unlockSpecificCardsSchema = z.object({
	success: z.boolean(),
	unlocked_count: z.number().int()
});

export type UnlockSpecificCards = z.infer<typeof unlockSpecificCardsSchema>;

/**
 * `accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid)`.
 *
 * Même forme que `execute_trade`, sans `completed_at` : succès avec l'échange
 * créé, ou refus métier porteur du motif.
 */
export const acceptProposalSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		trade_id: z.string().uuid()
	}),
	z.object({
		success: z.literal(false),
		error: z.string()
	})
]);

export type AcceptProposalResult = z.infer<typeof acceptProposalSchema>;
