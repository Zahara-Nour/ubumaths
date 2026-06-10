/**
 * Teacher analytics validation schemas (chantier V2.0).
 *
 * Schemas Zod pour les 7 endpoints `/api/teacher/classes/[classId]/analytics/*`.
 * Cf. `docs/ref/teacher-analytics.md`.
 */

import { z } from 'zod';

/** UUID strict pour paramètres de route. */
export const classIdParamSchema = z.object({
	classId: z.string().uuid('Invalid class ID')
});

export const classAndStudentParamSchema = z.object({
	classId: z.string().uuid('Invalid class ID'),
	studentId: z.string().uuid('Invalid student ID')
});

/** Query : ?includeAllCycle=true pour Widget A. */
export const knowledgeGridQuerySchema = z.object({
	includeAllCycle: z
		.union([z.literal('true'), z.literal('false')])
		.optional()
		.transform((v) => v === 'true')
});

/** Query : ?theme=NOM_BO&weeks=8 pour Widget B. */
export const retentionQuerySchema = z.object({
	theme: z.string().trim().min(1).max(200),
	weeks: z.coerce.number().int().min(1).max(26).default(8)
});

/** Query : ?days=30 (1..60) pour Widget C. */
export const heatmapQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(60).default(30),
	alertThresholdDays: z.coerce.number().int().min(1).max(30).default(5)
});

/** Query : ?days=7 (1..30) pour Widget D. */
export const gradesQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(30).default(7)
});

/** Query : ?topN=10 (1..30) pour Widgets E & G. */
export const topNQuerySchema = z.object({
	topN: z.coerce.number().int().min(1).max(30).default(10)
});
