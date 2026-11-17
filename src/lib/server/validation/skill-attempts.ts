/**
 * Zod validation schemas for POST /api/skill-attempts
 *
 * Validates the body sent by a free series (`series-trace.ts`) after local answer validation.
 * Family competence attempts are excluded by design (decision 72):
 * those go through evaluation_tasks, not this endpoint.
 *
 * Spec: docs/wip/competence-referentiel-phase2-progress.md §2.2
 * DB:   supabase/migrations/20260609120000_competence_referentiel_schema.sql
 */

import { z } from 'zod';

/**
 * Valid values for `skill_attempts.phase_blocage` (DB CHECK constraint).
 * Mirrors the PhaseBlocage union in $lib/types/skills.ts.
 */
export const phaseBlocageSchema = z.enum([
	'comprendre',
	'modeliser',
	'calculer',
	'repondre',
	'regulation'
]);

/**
 * Lieux qu'un élève peut déclarer par cette route (ADR 0038). Absents :
 * `evaluation` (traces d'un contrôle, écrites par le serveur) et `review`
 * (la révision écrit par `/api/srs/review/submit`).
 */
export const studentTracePlaceSchema = z.enum([
	'flash_cards',
	'typing',
	'mock_test',
	'number_race'
]);

export type StudentTracePlace = z.infer<typeof studentTracePlaceSchema>;

/** Formes chronométrées : durée de réponse, durée allouée et fin (N11). */
const TIMED_PLACES: readonly StudentTracePlace[] = ['mock_test', 'number_race'];

/** Formes où l'on tape sa réponse : réponse et verdict par case (N10). */
const ANSWERED_PLACES: readonly StudentTracePlace[] = ['typing', 'mock_test', 'number_race'];

// Bornes de la base (`trace_answer_parts_valid`, CHECK de `skill_attempts`)
const MAX_PARTS = 50;
const MAX_PART_CHARS = 2000;
const MAX_TOTAL_CHARS = 10000;
const MAX_DURATION_MS = 86_400_000;
const MAX_SEED = 2_147_483_647;

/** Liste vide → null : « aucune case » s'écrit NULL, la base refuse `[]`. */
function emptyToNull<T>(list: T[] | null | undefined): T[] | null {
	return list && list.length > 0 ? list : null;
}

/**
 * Input body schema for POST /api/skill-attempts.
 *
 * - `template_id`: the question_template UUID whose skills will be looked up
 * - `success`: outcome of local answer validation
 * - `with_help`: stored for analytics, not used in acquisition rule (decision 58)
 * - `phase_blocage`: optional diagnostic phase when the student failed (decision 30)
 * - `place`, `seed`, durées, `answer_parts`, `part_verdicts` : contenu d'une trace
 *   (ADR 0038) ; mêmes règles que les CHECK de la base, pour un 400 plutôt qu'un 500.
 */
export const skillAttemptInputSchema = z
	.object({
		template_id: z.string().uuid('template_id must be a valid UUID'),
		success: z.boolean(),
		with_help: z.boolean().default(false),
		phase_blocage: phaseBlocageSchema.optional(),
		place: studentTracePlaceSchema,
		seed: z.number().int().min(0).max(MAX_SEED).optional(),
		response_ms: z.number().int().min(0).max(MAX_DURATION_MS).optional(),
		allotted_ms: z.number().int().min(1).max(MAX_DURATION_MS).optional(),
		end_reason: z.enum(['validated', 'timeout']).optional(),
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
		const timed = TIMED_PLACES.includes(body.place);
		const hasTiming =
			body.response_ms !== undefined ||
			body.allotted_ms !== undefined ||
			body.end_reason !== undefined;
		if (hasTiming && !timed) {
			ctx.addIssue({ code: 'custom', message: `no timing for place ${body.place}` });
		}
		if ((body.allotted_ms === undefined) !== (body.end_reason === undefined)) {
			ctx.addIssue({ code: 'custom', message: 'allotted_ms and end_reason go together' });
		}

		const parts = body.answer_parts;
		const verdicts = body.part_verdicts;
		if ((parts == null) !== (verdicts == null)) {
			ctx.addIssue({ code: 'custom', message: 'answer_parts and part_verdicts go together' });
		} else if (parts && verdicts && parts.length !== verdicts.length) {
			ctx.addIssue({ code: 'custom', message: 'one verdict per answer part' });
		}
		if (parts && !ANSWERED_PLACES.includes(body.place)) {
			ctx.addIssue({ code: 'custom', message: `no answer for place ${body.place}` });
		}
		// En points de code, comme `char_length` en base (un émoji = 1, pas 2)
		if (parts && [...parts.join('')].length > MAX_TOTAL_CHARS) {
			ctx.addIssue({ code: 'custom', message: 'answer too long' });
		}
	});

export type SkillAttemptInput = z.infer<typeof skillAttemptInputSchema>;
