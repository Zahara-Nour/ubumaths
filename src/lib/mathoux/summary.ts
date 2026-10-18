/**
 * Résumé de la Chatterie rendu par `GET /api/student/mathoux`.
 *
 * Le schéma est partagé : le serveur le produit, le widget du Palotin le
 * vérifie avant de s'en servir (une réponse inattendue ne fait rien dire au
 * Palotin, plutôt qu'un « NaN Mathoux »).
 */

import { z } from 'zod';

export const mathouxSummarySchema = z.object({
	born: z.number().int().min(0),
	napping: z.number().int().min(0),
	toDiscover: z.number().int().min(0)
});

export type MathouxSummary = z.infer<typeof mathouxSummarySchema>;
