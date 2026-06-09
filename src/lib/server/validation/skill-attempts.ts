/**
 * Zod validation schemas for POST /api/skill-attempts
 *
 * Validates the body sent by FlashCard after local answer validation.
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
 * Input body schema for POST /api/skill-attempts.
 *
 * - `template_id`: the question_template UUID whose skills will be looked up
 * - `success`: outcome of local answer validation
 * - `with_help`: stored for analytics, not used in acquisition rule (decision 58)
 * - `phase_blocage`: optional diagnostic phase when the student failed (decision 30)
 */
export const skillAttemptInputSchema = z.object({
	template_id: z.string().uuid('template_id must be a valid UUID'),
	success: z.boolean(),
	with_help: z.boolean().default(false),
	phase_blocage: phaseBlocageSchema.optional()
});

export type SkillAttemptInput = z.infer<typeof skillAttemptInputSchema>;
