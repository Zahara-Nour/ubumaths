/**
 * School and Academic Period validation schemas
 */

import { z } from 'zod';
import { uuidSchema } from './common';

// ============================================================================
// UAI / RNE (establishment identifier)
// ============================================================================

/**
 * UAI (Unité Administrative Immatriculée), ex-RNE — official 8-char school code.
 * Format: 7 digits + 1 uppercase letter (e.g. `0750001H`).
 *
 * Source of truth: "Annuaire de l'éducation nationale" (data.education.gouv.fr).
 * Required for any LSU / SIECLE export. Reusable wherever a UAI is handled.
 */
export const UAI_REGEX = /^[0-9]{7}[A-Z]$/;
const UAI_ERROR = 'UAI invalide : 7 chiffres suivis d’une lettre (ex. 0750001H)';

/** Strict UAI: trims, uppercases, then enforces the format. Rejects empty input. */
export const uaiSchema = z
	.string()
	.trim()
	.transform((s) => s.toUpperCase())
	.pipe(z.string().regex(UAI_REGEX, UAI_ERROR));

/**
 * Optional UAI for form input: trims + uppercases, accepts empty string
 * (returned as `null`), otherwise enforces the format.
 */
export const optionalUaiSchema = z
	.string()
	.trim()
	.transform((s) => s.toUpperCase())
	.pipe(z.union([z.literal(''), z.string().regex(UAI_REGEX, UAI_ERROR)]))
	.transform((s) => (s === '' ? null : s));

// ============================================================================
// SCHOOL UPSERT (create / update / bulk)
// ============================================================================

/** Required trimmed text field with a max length. Coerces non-strings to ''. */
const requiredText = (label: string, max: number) =>
	z.preprocess(
		(v) => (typeof v === 'string' ? v.trim() : ''),
		z.string().min(1, `${label} requis`).max(max, `${label} trop long (max ${max})`)
	);

/** Optional trimmed text: empty/absent → null. */
const emptyableText = (max: number) =>
	z
		.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().max(max))
		.transform((s) => (s ? s : null));

/** Optional URL: empty/absent → null, otherwise must be a valid URL. */
const optionalUrl = z
	.preprocess(
		(v) => (typeof v === 'string' ? v.trim() : ''),
		z.union([z.literal(''), z.string().url('URL invalide').max(2048)])
	)
	.transform((s) => (s ? s : null));

/**
 * Shared validation for creating/updating a school. Reused by the single-entry
 * form, the bulk import, and any future school mutation. Normalizes empties to
 * `null` and the UAI to uppercase.
 */
export const schoolUpsertSchema = z.object({
	name: requiredText('Nom', 200),
	city: requiredText('Ville', 100),
	country: requiredText('Pays', 100),
	address: emptyableText(500),
	logo_url: optionalUrl,
	uai: optionalUaiSchema
});

export type SchoolUpsert = z.infer<typeof schoolUpsertSchema>;

// ============================================================================
// ANNUAIRE DE L'ÉDUCATION (data.education.gouv.fr proxy)
// ============================================================================

/** Query for the Annuaire search proxy endpoint. */
export const annuaireSearchQuerySchema = z.object({
	q: z.string().trim().min(2).max(100),
	// 1-based page; capped at 50 (×20 = 1000 results) as a sane upper bound.
	page: z.coerce.number().int().min(1).max(50).default(1)
});

/** Raw record shape returned by the Opendatasoft `fr-en-annuaire-education` dataset. */
export const annuaireRecordSchema = z.object({
	identifiant_de_l_etablissement: z.string().nullable(),
	nom_etablissement: z.string().nullable(),
	type_etablissement: z.string().nullable(),
	nom_commune: z.string().nullable(),
	code_postal: z.string().nullable(),
	adresse_1: z.string().nullable(),
	libelle_academie: z.string().nullable()
});

/** Raw envelope returned by the Opendatasoft v2.1 records API. */
export const annuaireResponseSchema = z.object({
	total_count: z.number(),
	results: z.array(annuaireRecordSchema)
});

/** Normalized school suggestion served to the client. */
export interface AnnuaireSchool {
	uai: string;
	name: string;
	type: string;
	city: string;
	postalCode: string;
	address: string;
	academy: string;
}

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for school ID URL parameter
 */
export const schoolIdParamSchema = z.object({
	schoolId: uuidSchema
});

/**
 * Schema for school year ID URL parameter
 */
export const yearIdParamSchema = z.object({
	yearId: uuidSchema
});

/**
 * Schema for combined school + year URL parameters
 */
export const schoolYearParamsSchema = z.object({
	schoolId: uuidSchema,
	yearId: uuidSchema
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Link assessments response schema
 */
export const linkAssessmentsResponseSchema = z.object({
	success: z.literal(true),
	count: z.number().int().nonnegative(),
	message: z.string()
});

/**
 * Period with assessment count schema
 */
export const periodWithStatsSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	type: z.enum(['trimester', 'semester', 'quarter', 'custom']),
	start_date: z.string(), // date string
	end_date: z.string(), // date string
	period_order: z.number().int().positive(),
	assessments_count: z.number().int().nonnegative()
});

/**
 * Year stats response schema
 */
export const yearStatsResponseSchema = z.object({
	periods: z.array(periodWithStatsSchema)
});
