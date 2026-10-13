/**
 * Figures géométriques stockées — validation des entrées
 * ======================================================
 *
 * ADR 0027. Les bornes recopient celles de la table `geometry_figures`
 * (migration 20261016103100) : un refus ici évite un aller-retour vers une base
 * qui refuserait de toute façon, avec un message en français.
 *
 * Les niveaux reprennent le schéma des exercices (`gradeCodeSchema`) : même liste
 * que le contrôle `is_valid_grade_array` de la base.
 */

import { z } from 'zod';
import { gradeCodeSchema } from './grades';

// ============================================================================
// CONSTANTES
// ============================================================================

export const FIGURE_TITLE_MAX = 200;
export const FIGURE_DESCRIPTION_MAX = 2000;
export const FIGURE_SCRIPT_MAX = 100_000;
export const FIGURE_TAGS_MAX = 20;
export const FIGURE_TAG_NAME_MAX = 50;
export const FIGURE_SEARCH_MAX = 100;
/** Autant que de niveaux connus (`GRADE_CODES`) : sans doublon, on ne peut pas dépasser */
const FIGURE_GRADES_MAX = 18;

// ============================================================================
// SCHÉMAS
// ============================================================================

export const figureIdSchema = z.string().uuid('Identifiant de figure invalide');

const tagNameSchema = z
	.string()
	.trim()
	.min(1, 'Un tag ne peut pas être vide')
	.max(FIGURE_TAG_NAME_MAX, `Un tag compte ${FIGURE_TAG_NAME_MAX} caractères au maximum`);

/** Ce que le formulaire de création ou de modification envoie */
export const figureInputSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(FIGURE_TITLE_MAX, `Le titre compte ${FIGURE_TITLE_MAX} caractères au maximum`),
	// Une description vide est une absence de description
	description: z
		.string()
		.trim()
		.max(
			FIGURE_DESCRIPTION_MAX,
			`La description compte ${FIGURE_DESCRIPTION_MAX} caractères au maximum`
		)
		.nullable()
		.transform((value) => (value ? value : null)),
	dsl_script: z
		.string()
		.min(1, 'Le script est vide')
		.max(FIGURE_SCRIPT_MAX, `Le script compte ${FIGURE_SCRIPT_MAX} caractères au maximum`)
		.refine((value) => value.trim().length > 0, 'Le script est vide'),
	grades: z
		.array(gradeCodeSchema)
		.max(FIGURE_GRADES_MAX, `${FIGURE_GRADES_MAX} niveaux au maximum`)
		.refine((arr) => new Set(arr).size === arr.length, 'Un niveau est en double'),
	is_public: z.boolean(),
	tags: z
		.array(tagNameSchema)
		.max(FIGURE_TAGS_MAX, `${FIGURE_TAGS_MAX} tags au maximum`)
		.transform((names) => [...new Set(names)])
});

export type FigureInput = z.infer<typeof figureInputSchema>;

/** Portée de la liste : mes figures, ou les figures publiques */
export const FIGURE_SCOPES = ['mine', 'public'] as const;
export type FigureScope = (typeof FIGURE_SCOPES)[number];

/**
 * Filtres de la liste, lus dans l'adresse. Tous facultatifs et combinables ;
 * une valeur vide vaut absence de filtre.
 */
export const figureListFiltersSchema = z.object({
	grade: gradeCodeSchema.optional(),
	tags: z.array(tagNameSchema).max(FIGURE_TAGS_MAX, `${FIGURE_TAGS_MAX} tags au maximum`),
	q: z
		.string()
		.trim()
		.max(FIGURE_SEARCH_MAX, `La recherche compte ${FIGURE_SEARCH_MAX} caractères au maximum`)
		.transform((value) => (value ? value : undefined))
		.optional(),
	scope: z.enum(FIGURE_SCOPES).optional()
});

export type FigureListFilters = z.infer<typeof figureListFiltersSchema>;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Filtres depuis les paramètres d'adresse (`?grade=6&tag=a&tag=b&q=…&scope=mine`).
 * Les paramètres vides sont ignorés : un formulaire GET envoie `grade=` quand
 * rien n'est choisi.
 */
export function parseFigureListFilters(params: URLSearchParams) {
	const nonEmpty = (value: string | null) => (value ? value : undefined);
	return figureListFiltersSchema.safeParse({
		grade: nonEmpty(params.get('grade')),
		tags: params.getAll('tag').filter((tag) => tag.trim().length > 0),
		q: nonEmpty(params.get('q')),
		scope: nonEmpty(params.get('scope'))
	});
}

/** Champ JSON du formulaire (niveaux, tags), borné avant tout `JSON.parse` */
function parseJsonField(value: FormDataEntryValue | null): unknown {
	if (typeof value !== 'string' || value.length > 10_000) return undefined;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return undefined;
	}
}

/**
 * Figure depuis le formulaire de création ou de modification : `grades` et
 * `tags` arrivent en JSON, `is_public` en `'true'` / `'false'`.
 */
export function parseFigureFormData(formData: FormData) {
	const isPublic = formData.get('is_public');
	return figureInputSchema.safeParse({
		title: formData.get('title'),
		description: formData.get('description') ?? null,
		dsl_script: formData.get('dsl_script'),
		grades: parseJsonField(formData.get('grades')),
		tags: parseJsonField(formData.get('tags')),
		is_public: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined
	});
}
