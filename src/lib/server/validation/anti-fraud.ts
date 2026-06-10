/**
 * Anti-fraud SRS validation schemas (chantier 2026-06-10).
 *
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md
 */

import { z } from 'zod';

const FLAG_TYPES = [
	'high_easy_ratio',
	'no_again',
	'fast_timeSpent',
	'burst',
	'srs_vs_quiz_gap',
	'composite'
] as const;

// ----------------------------------------------------------------------------
// Endpoint admin /api/admin/anti-fraud/run
// ----------------------------------------------------------------------------

export const runJobOptionsSchema = z
	.object({
		student_id: z.string().uuid().optional(),
		since: z.string().datetime().optional(),
		dry_run: z.boolean().default(false)
	})
	.strict();

// ----------------------------------------------------------------------------
// Endpoint prof GET /api/teacher/classes/[classId]/anti-fraud/flags
// ----------------------------------------------------------------------------

export const flagsListQuerySchema = z.object({
	resolved: z
		.union([z.literal('true'), z.literal('false')])
		.optional()
		.transform((v) => v === 'true'),
	since: z.string().datetime().optional(),
	type: z.enum(FLAG_TYPES).optional(),
	capacity: z.string().uuid().optional()
});

// ----------------------------------------------------------------------------
// Endpoint prof PATCH /api/teacher/classes/[classId]/anti-fraud/flags/[flagId]
// ----------------------------------------------------------------------------

export const flagIdParamSchema = z.object({
	flagId: z.string().uuid('Invalid flag ID')
});

export const markResolvedBodySchema = z
	.object({
		resolved: z.literal(true)
	})
	.strict();

export type RunJobOptions = z.infer<typeof runJobOptionsSchema>;
export type FlagsListQuery = z.infer<typeof flagsListQuerySchema>;
export type MarkResolvedBody = z.infer<typeof markResolvedBodySchema>;
