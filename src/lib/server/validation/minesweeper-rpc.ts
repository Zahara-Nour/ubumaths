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

/**
 * `use_detector(p_game_id uuid)` — même contrat que l'indice : la fonction
 * consomme aussi une carte VIP ou des gidouilles.
 */
export const useDetectorResultSchema = useHintResultSchema;

export type UseDetectorResult = z.infer<typeof useDetectorResultSchema>;

/**
 * `complete_minesweeper_game(p_game_id uuid, p_grid_state jsonb)`.
 *
 * Renvoie `TABLE(gidouilles_earned numeric, achievements jsonb,
 * points_earned integer, breakdown jsonb)` : les deux colonnes jsonb ne
 * portent aucune forme, et la route les affirmait par un cast.
 *
 * Le détail du calcul (`breakdown`) n'est qu'affiché ; on le laisse donc
 * permissif plutôt que de dupliquer ici les quinze facteurs de récompense, qui
 * évoluent avec la formule. Ce qui est vérifié, c'est ce dont dépend le crédit
 * de l'élève : les gidouilles et les points.
 */
export const completeGameResultSchema = z.object({
	gidouilles_earned: z.number(),
	points_earned: z.number().int(),
	achievements: z
		.array(
			z.object({
				achievement_id: z.string(),
				name: z.string(),
				icon: z.string(),
				difficulty: z.string().nullable()
			})
		)
		.catch([]),
	breakdown: z.record(z.string(), z.unknown()).catch({})
});

export type CompleteGameResult = z.infer<typeof completeGameResultSchema>;
