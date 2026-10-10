/**
 * Lecture d'une ligne de `dictionary_entries` (ADR 0022)
 * ======================================================
 *
 * La base ne garantit pas la forme des colonnes jsonb (`definitions`,
 * `exemples`, `see_also`) : chaque ligne est validée avant d'entrer dans le
 * site. Un renvoi « Voir aussi » vise une page du Cabinet Noir et une image un
 * chemin du site, jamais une adresse externe (pistage des visiteurs).
 *
 * @module dictionary/entry-schema
 */

import { z } from 'zod';
import { GRADE_CODES } from '$lib/types/grades';
import type { Tables } from '$lib/types/database';
import { SEE_ALSO_PATHS, type GradedField, type MathTerm } from './model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Colonnes lues pour afficher le dictionnaire (ni l'auteur, ni les dates). */
export type DictionaryRow = Pick<
	Tables<'dictionary_entries'>,
	| 'term'
	| 'sense'
	| 'grade'
	| 'tags'
	| 'definitions'
	| 'exemples'
	| 'history'
	| 'image'
	| 'synonyms'
	| 'forms'
	| 'auto_link'
	| 'derived_from'
	| 'see_also'
	| 'shared_with'
>;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const DICTIONARY_COLUMNS =
	'term, sense, grade, tags, definitions, exemples, history, image, synonyms, forms, auto_link, derived_from, see_also, shared_with';

/** Chemin du site : commence par une seule barre (`//hôte/…` irait chercher l'image ailleurs). */
const SITE_PATH = /^\/(?!\/)[A-Za-z0-9/_.-]+$/;

const gradeSchema = z.enum(GRADE_CODES);

const gradedFieldSchema = z
	.object({
		mode: z.enum(['cumulative', 'discriminant']).optional(),
		items: z.array(
			z
				.object({
					grade: gradeSchema,
					content: z.string(),
					sharedWith: z.array(gradeSchema).optional()
				})
				.strict()
		)
	})
	.strict();

export const dictionaryRowSchema = z.object({
	term: z.string().trim().min(1),
	sense: z.string().trim().min(1).nullable(),
	grade: gradeSchema,
	tags: z.array(z.string()),
	definitions: gradedFieldSchema.nullable(),
	exemples: gradedFieldSchema.nullable(),
	history: z.string().nullable(),
	image: z.string().regex(SITE_PATH).nullable(),
	synonyms: z.array(z.string().trim().min(1)),
	forms: z.array(z.string().trim().min(1)),
	auto_link: z.boolean(),
	derived_from: z.string().trim().min(1).nullable(),
	see_also: z
		.object({ label: z.string().trim().min(1), path: z.enum(SEE_ALSO_PATHS) })
		.strict()
		.nullable(),
	shared_with: z.array(gradeSchema)
});

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/** Champ gradué tel que le site l'écrit : `mode` et `sharedWith` seulement s'ils sont posés. */
function toGradedField(field: z.infer<typeof gradedFieldSchema>): GradedField {
	return {
		...(field.mode && { mode: field.mode }),
		items: field.items.map((item) => ({
			grade: item.grade,
			content: item.content,
			...(item.sharedWith && { sharedWith: item.sharedWith })
		}))
	};
}

/**
 * Entrée du dictionnaire lue d'une ligne, ou `null` si la ligne est invalide.
 * Un champ vide est absent, comme dans le fichier d'origine.
 */
export function rowToTerm(row: unknown): MathTerm | null {
	const parsed = dictionaryRowSchema.safeParse(row);
	if (!parsed.success) return null;
	const r = parsed.data;
	return {
		term: r.term,
		...(r.sense !== null && { sense: r.sense }),
		tags: r.tags,
		...(r.definitions && { definitions: toGradedField(r.definitions) }),
		...(r.exemples && { exemples: toGradedField(r.exemples) }),
		...(r.history !== null && { history: r.history }),
		...(r.image !== null && { image: r.image }),
		grade: r.grade,
		...(r.shared_with.length > 0 && { sharedWith: r.shared_with }),
		...(r.synonyms.length > 0 && { synonyms: r.synonyms }),
		...(r.forms.length > 0 && { forms: r.forms }),
		...(!r.auto_link && { autoLink: false as const }),
		...(r.derived_from !== null && { derivedFrom: r.derived_from }),
		...(r.see_also && { seeAlso: r.see_also })
	};
}
