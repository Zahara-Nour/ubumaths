/**
 * Résumé de la Chatterie rendu par `GET /api/student/mathoux`.
 *
 * Le schéma est partagé : le serveur le produit, le widget du Palotin et la
 * carte de fin de séance le vérifient avant de s'en servir (une réponse
 * inattendue ne fait rien dire, plutôt qu'un « NaN Mathoux »).
 */

import { z } from 'zod';
import { MAX_NEWS_ITEMS } from './news';
import { MATHOU_COLLAR_IDS, MATHOU_DECORATION_IDS } from './decorations';

const stageSchema = z.enum(['chaton', 'matou', 'grand_matou']);

/** Nouveautés écrites en mémoire par ce calcul (cf. `mathouNews`). */
export const mathouNewsSchema = z.object({
	firstVisit: z.boolean(),
	total: z.number().int().min(0).max(1000),
	items: z
		.array(
			z.object({
				kind: z.enum(['birth', 'growth', 'wake', 'star']),
				notionId: z.string().min(1).max(100),
				name: z.string().min(1).max(200),
				raceIndex: z.number().int().min(0).max(1000),
				stage: stageSchema,
				decoration: z.enum(MATHOU_DECORATION_IDS).nullable().optional(),
				collar: z.enum(MATHOU_COLLAR_IDS).nullable().optional(),
				previousStage: stageSchema.optional(),
				newStars: z.array(z.string().min(1).max(20)).max(30)
			})
		)
		.max(MAX_NEWS_ITEMS),
	gidouilles: z.number().int().min(0).max(100_000).optional()
});

export const mathouxSummarySchema = z.object({
	born: z.number().int().min(0),
	napping: z.number().int().min(0),
	toDiscover: z.number().int().min(0),
	news: mathouNewsSchema
});

export type MathouxSummary = z.infer<typeof mathouxSummarySchema>;
