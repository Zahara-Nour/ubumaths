/**
 * Ancienne forme d'une ligne de série — à retirer au lot 4 (ADR 0035)
 * ==================================================================
 *
 * Avant l'ADR 0035, une ligne de série désignait une CATÉGORIE : le quadruplet
 * thème · domaine · sous-domaine · niveau. L'index unique
 * `idx_question_templates_unique_category` garantit qu'un quadruplet désigne au
 * plus UN modèle publié : on le retrouve et la ligne devient `{ templateId, … }`.
 *
 * Restent dans l'ancienne forme jusqu'à la conversion (lot 2b) ou pour toujours :
 * les séries et séances en base, les anciens liens `?categories=…` et leurs QR,
 * les paniers du navigateur. Tout ce qui les lit passe par ce module, et SEUL ce
 * module connaît les anciens noms : le lot 4 le supprime avec les colonnes.
 */

import { z } from 'zod';
import {
	MAX_SERIES_ITEMS,
	SERIES_LINK_PARAM,
	decodeSeriesParamJson,
	itemDelaySchema,
	itemQuantitySchema,
	seriesItemSchema,
	type SeriesItem
} from '$lib/validation/series';

// ============================================================================
// TYPES
// ============================================================================

/** Ce qu'il faut lire d'un modèle pour retrouver celui d'une ancienne ligne */
export interface LegacyResolvableTemplate {
	id: string;
	theme: string;
	domain: string;
	subdomain?: string | null;
	level: number;
}

export type SeriesLinkResult =
	{ success: true; lines: StoredSeriesLine[] } | { success: false; error: string };

// ============================================================================
// CONSTANTS
// ============================================================================

/** Paramètre des anciens liens de série */
export const LEGACY_SERIES_LINK_PARAM = 'categories';

/** Ancienne catégorie. Niveau : un ancien panier du navigateur peut le porter en chaîne. */
const legacyCategorySchema = z.object({
	theme: z.string().min(1).max(100),
	domain: z.string().min(1).max(100),
	subdomain: z.string().max(100).nullable().optional(),
	level: z.coerce.number().int().nonnegative().max(100)
});

/** Ancienne ligne : une catégorie, son nombre de questions et sa durée */
const legacyLineSchema = z.object({
	category: legacyCategorySchema,
	quantity: itemQuantitySchema,
	delay: itemDelaySchema
});

export type LegacyCategory = z.infer<typeof legacyCategorySchema>;
export type LegacyLine = z.infer<typeof legacyLineSchema>;

/** Ligne telle qu'elle peut être enregistrée : nouvelle ou ancienne forme */
export const storedSeriesLineSchema = z.union([seriesItemSchema, legacyLineSchema]);
export type StoredSeriesLine = z.infer<typeof storedSeriesLineSchema>;

/** Composition enregistrée (base, lien, panier du navigateur) : 1 à 50 lignes */
export const storedSeriesLinesSchema = z
	.array(storedSeriesLineSchema)
	.min(1, 'Ajoute au moins un modèle de questions')
	.max(MAX_SERIES_ITEMS, `Trop de modèles (${MAX_SERIES_ITEMS} au plus)`);

// ============================================================================
// FUNCTIONS
// ============================================================================

export function isLegacyLine(line: StoredSeriesLine): line is LegacyLine {
	return 'category' in line;
}

/** Modèle publié d'une ancienne catégorie ; sous-domaine absent : `null` et `''` se valent */
export function findLegacyTemplate<T extends LegacyResolvableTemplate>(
	templates: readonly T[],
	category: LegacyCategory
): T | undefined {
	return templates.find(
		(template) =>
			template.theme === category.theme &&
			template.domain === category.domain &&
			(template.subdomain || null) === (category.subdomain || null) &&
			template.level === category.level
	);
}

/**
 * Lignes → lignes de la nouvelle forme. Une ancienne ligne sans modèle publié
 * est comptée dans `unresolved` et retirée ; la nouvelle forme passe telle quelle.
 */
export function resolveSeriesLines(
	lines: readonly StoredSeriesLine[],
	templates: readonly LegacyResolvableTemplate[]
): { items: SeriesItem[]; unresolved: number } {
	const items: SeriesItem[] = [];
	let unresolved = 0;
	for (const line of lines) {
		if (!isLegacyLine(line)) {
			items.push({ templateId: line.templateId, quantity: line.quantity, delay: line.delay });
			continue;
		}
		const template = findLegacyTemplate(templates, line.category);
		if (template) {
			items.push({ templateId: template.id, quantity: line.quantity, delay: line.delay });
		} else {
			unresolved += 1;
		}
	}
	return { items, unresolved };
}

/** Anciennes catégories d'une composition (vide : rien à résoudre) */
export function legacyCategoriesOf(lines: readonly StoredSeriesLine[]): LegacyCategory[] {
	return lines.filter(isLegacyLine).map((line) => line.category);
}

/** Valeur PostgREST entre guillemets : `"` et `\` échappés. */
function quoted(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Filtre `or` PostgREST des modèles d'anciennes catégories : une condition
 * EXACTE par catégorie, doublons fusionnés. Sous-domaine absent : `null` ou `''`.
 */
export function legacyTemplatesFilter(categories: readonly LegacyCategory[]): string {
	const unique = new Map(
		categories.map((c) => [[c.theme, c.domain, c.subdomain ?? '', c.level].join('|'), c])
	);
	return [...unique.values()]
		.map((c) => {
			const subdomain = c.subdomain
				? `subdomain.eq.${quoted(c.subdomain)}`
				: 'or(subdomain.is.null,subdomain.eq."")';
			return `and(theme.eq.${quoted(c.theme)},domain.eq.${quoted(c.domain)},${subdomain},level.eq.${c.level})`;
		})
		.join(',');
}

/**
 * Relit la composition d'un lien de série : `?modeles=…` (nouvelle forme) ou un
 * ancien `?categories=…`. Les anciennes lignes restent à résoudre par l'appelant
 * (`resolveSeriesLines`), qui a les modèles.
 */
export function parseSeriesLink(searchParams: URLSearchParams): SeriesLinkResult {
	const raw = searchParams.get(SERIES_LINK_PARAM) ?? searchParams.get(LEGACY_SERIES_LINK_PARAM);
	if (raw === null || raw.trim() === '') {
		return { success: false, error: 'Ce lien ne contient aucune question.' };
	}

	const json = decodeSeriesParamJson(raw);
	if (!json.ok) {
		return {
			success: false,
			error: 'Ce lien de série est abîmé : les questions ne peuvent pas être relues.'
		};
	}

	const validation = storedSeriesLinesSchema.safeParse(json.value);
	if (!validation.success) {
		return {
			success: false,
			error: `Ce lien de série n'est pas valide : ${validation.error.issues[0].message}.`
		};
	}
	return { success: true, lines: validation.data };
}

/** Le lien porte-t-il une composition (nouvelle ou ancienne forme) ? */
export function hasSeriesLink(searchParams: URLSearchParams): boolean {
	return searchParams.has(SERIES_LINK_PARAM) || searchParams.has(LEGACY_SERIES_LINK_PARAM);
}

/** Retire la composition d'une URL (nouvelle et ancienne forme) */
export function deleteSeriesLink(searchParams: URLSearchParams): void {
	searchParams.delete(SERIES_LINK_PARAM);
	searchParams.delete(LEGACY_SERIES_LINK_PARAM);
}
