/**
 * Validation — global resource search.
 *
 * @module server/validation/search
 */

import { z } from 'zod';
import { RESOURCE_KINDS } from '$lib/resources/kinds';
import { GRADE_CODES } from '$lib/types/grades';

/**
 * Query parameters for `GET /api/search`.
 *
 * `q` is bounded on both sides: under two characters the SQL would scan the
 * whole catalogue for a useless result (the function enforces the same floor),
 * and an unbounded string is a free denial-of-service on the LIKE.
 *
 * `kinds` arrives as a comma-separated list — `?kinds=exercise,question` — and
 * is validated against the registry vocabulary, so an unknown kind is a 400
 * rather than a silently empty result.
 *
 * `grades` suit la même forme — `?grades=1_SPE,2` — et sert au filtre par niveau
 * de classe du sélecteur `[[`. Validé contre `GRADE_CODES` : un niveau inventé
 * est un 400, pas un résultat vide qu'on mettrait des heures à diagnostiquer.
 */
const tagListSchema = z
	.string()
	.transform((value) =>
		value
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
	)
	.pipe(z.array(z.string().min(1).max(60)).min(1).max(10));

export const searchQuerySchema = z
	.object({
		q: z.string().trim().max(100, 'La recherche est limitée à 100 caractères').default(''),
		tags: tagListSchema.optional(),
		kinds: z
			.string()
			.transform((value) =>
				value
					.split(',')
					.map((kind) => kind.trim())
					.filter(Boolean)
			)
			.pipe(z.array(z.enum(RESOURCE_KINDS)).min(1).max(RESOURCE_KINDS.length))
			.optional(),
		grades: z
			.string()
			.transform((value) =>
				value
					.split(',')
					.map((grade) => grade.trim())
					.filter(Boolean)
			)
			.pipe(z.array(z.enum(GRADE_CODES)).min(1).max(GRADE_CODES.length))
			.optional(),
		limit: z.coerce
			.number()
			.int('La limite doit être un entier')
			.min(1, 'La limite doit être positive')
			.max(50, 'La limite est plafonnée à 50')
			.default(20)
	})
	// Un tag seul est un critère suffisant ; du texte seul doit faire au moins
	// deux caractères. Sans l'un ni l'autre, la requête ne demande rien.
	.refine((value) => value.q.length >= 2 || (value.tags?.length ?? 0) > 0, {
		message: 'Donne au moins 2 caractères ou un tag',
		path: ['q']
	});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
