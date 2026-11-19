/**
 * Zod : routes du combat de la Descente de la Vistule (étape 3)
 * =============================================================
 *
 * Réponse et verdicts par case : mêmes bornes que les CHECK de `skill_attempts`
 * (comme `skillAttemptInputSchema`), pour un 400 plutôt qu'un 500. Une question
 * de combat n'a qu'une case : 50 cases au plus reste la borne de la base.
 */

import { z } from 'zod';

// Constantes (bornes de la base)
const MAX_PARTS = 50;
const MAX_PART_CHARS = 2000;
const MAX_TOTAL_CHARS = 10000;
const MAX_SEED = 2_147_483_647;
/** Modèles déjà posés dans un combat, gardés pour ne pas les reposer tout de suite */
const MAX_RECENT = 40;

/** Les six Provinces (même liste que `PROVINCE_IDS`, vérifié par test) */
export const provinceSchema = z.enum([
	'nombrilie',
	'bedonstan',
	'yoyolande',
	'pifometrie',
	'glitchistan',
	'patatovie'
]);
const purposeSchema = z.enum(['attack', 'dodge']);

/** Liste vide → null : « aucune case » s'écrit NULL, la base refuse `[]`. */
function emptyToNull<T>(list: T[] | null | undefined): T[] | null {
	return list && list.length > 0 ? list : null;
}

/** POST /api/descente/combat/[beastId]/question */
export const combatQuestionSchema = z.object({
	purpose: purposeSchema,
	province: provinceSchema,
	recent: z.array(z.string().uuid()).max(MAX_RECENT).default([])
});

/** POST /api/descente/combat/[beastId]/answer */
export const combatAnswerSchema = z
	.object({
		purpose: purposeSchema,
		province: provinceSchema,
		template_id: z.string().uuid(),
		success: z.boolean(),
		seed: z.number().int().min(0).max(MAX_SEED).optional(),
		answer_parts: z
			// NUL : interdit dans un `text` Postgres, l'INSERT rendrait 500
			.array(
				z
					.string()
					.max(MAX_PART_CHARS)
					.refine((part) => !part.includes('\u0000'), 'NUL character not allowed')
			)
			.max(MAX_PARTS)
			.nullish()
			.transform(emptyToNull),
		part_verdicts: z.array(z.boolean()).max(MAX_PARTS).nullish().transform(emptyToNull)
	})
	.superRefine((body, ctx) => {
		const parts = body.answer_parts;
		const verdicts = body.part_verdicts;
		if ((parts == null) !== (verdicts == null)) {
			ctx.addIssue({ code: 'custom', message: 'answer_parts and part_verdicts go together' });
		} else if (parts && verdicts && parts.length !== verdicts.length) {
			ctx.addIssue({ code: 'custom', message: 'one verdict per answer part' });
		}
		// En points de code, comme `char_length` en base
		if (parts && [...parts.join('')].length > MAX_TOTAL_CHARS) {
			ctx.addIssue({ code: 'custom', message: 'answer too long' });
		}
	});

export type CombatQuestionBody = z.infer<typeof combatQuestionSchema>;
export type CombatAnswerBody = z.infer<typeof combatAnswerSchema>;
