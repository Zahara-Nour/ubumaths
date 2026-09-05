/**
 * Résultats des RPC du démineur
 * =============================
 *
 * Ces fonctions sont déclarées `RETURNS json` / `RETURNS jsonb` : le type
 * généré est `Json`, une union qui ne porte aucune clé. Chaque route les
 * affirmait par un cast — `data as UseHintResult` — c'est-à-dire une promesse
 * non vérifiée.
 *
 * Le cast est particulièrement risqué ici : ces fonctions consomment des
 * ressources de l'élève (cartes VIP, gidouilles). Un résultat mal formé lu
 * comme un succès crédite ou débite à tort. On valide donc la forme, et un
 * écart lève plutôt que de passer inaperçu.
 */
import { z } from 'zod';

/** `use_minesweeper_hint(p_game_id uuid)` */
export const useHintResultSchema = z.object({
	success: z.boolean(),
	hints_used: z.number().int(),
	hints_remaining: z.number().int(),
	source: z.enum(['vip_card', 'gidouilles']),
	vip_card_consumed: z.boolean(),
	gidouilles_spent: z.number(),
	remaining_gidouilles: z.number().optional(),
	penalty_notice: z.string()
});

export type UseHintResult = z.infer<typeof useHintResultSchema>;

/** `use_minesweeper_undo(p_game_id uuid, p_grid_state jsonb)` */
export const useUndoResultSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	message: z.string().optional()
});

export type UseUndoResult = z.infer<typeof useUndoResultSchema>;
