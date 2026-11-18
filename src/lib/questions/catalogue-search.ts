/**
 * Recherche du catalogue Automaths
 * ================================
 *
 * Phase 0 validée par David le 2026-11-18 (journal `automaths`) :
 *
 * - on cherche dans le titre, la description, les noms de la branche, de la
 *   notion et de la sous-notion du modèle, et les intitulés de ses points du
 *   programme (`pointNames`, reçus avec la liste des modèles) ;
 * - sans accents ni majuscules, `$` et commandes LaTeX réduits à leurs lettres ;
 * - tous les mots de la recherche, dans n'importe quel ordre, chacun au DÉBUT
 *   d'un mot (« aire » ne trouve pas « linéaire ») ;
 * - dès 2 lettres ; en dessous, pas de recherche (`null`) ;
 * - résultats groupés par sous-notion (ou « Général » de la notion), dans
 *   l'ordre de l'arbre, via `buildCatalogue` ; modèles hors de l'arbre en
 *   dernier, « Non classés ».
 *
 * Le texte cherché d'un modèle est calculé une fois par objet modèle : une
 * liste relue apporte de nouveaux objets, donc un texte neuf.
 */

import type { QuestionTemplate } from '#lib/questions/types.ts';
import { buildCatalogue, type CatalogueNode } from '#lib/questions/catalogue.ts';
import { placeOfNode } from '#lib/questions/classification-tree.ts';

// ============================================================================
// TYPES
// ============================================================================

/** Un groupe de résultats : une sous-notion, le « Général » d'une notion, ou les non classés */
export interface SearchGroup {
	id: string;
	/** Branche, notion, sous-notion (sans « Général ») ; `['Non classés']` hors de l'arbre */
	path: string[];
	templates: QuestionTemplate[];
}

export interface SearchResult {
	total: number;
	groups: SearchGroup[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Lettres et chiffres qu'il faut au moins pour lancer une recherche */
export const SEARCH_MIN_CHARACTERS = 2;

/** Au-delà de ce nombre de cartes, les groupes suivants sont repliés */
export const SEARCH_OPEN_CARD_LIMIT = 60;

export const UNCLASSIFIED_GROUP_ID = 'non-classes';
const UNCLASSIFIED_GROUP_NAME = 'Non classés';

// ============================================================================
// VARIABLES
// ============================================================================

/** Texte cherché de chaque modèle, normalisé, précédé d'une espace */
let haystacks = new WeakMap<QuestionTemplate, string>();

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Minuscules sans accents, « œ » / « æ » en deux lettres ; tout ce qui n'est
 * ni lettre ni chiffre devient une espace, espaces réduites.
 */
export function normalizeForSearch(text: string): string {
	return text
		.toLowerCase()
		.replace(/œ/g, 'oe')
		.replace(/æ/g, 'ae')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
}

/** Texte cherché d'un modèle (calculé une fois par objet modèle) */
function haystackOf(
	template: QuestionTemplate,
	nodesById: ReadonlyMap<string, CatalogueNode>,
	pointNames: Readonly<Record<string, string[]>>
): string {
	const known = haystacks.get(template);
	if (known !== undefined) return known;

	const place = placeOfNode(template.classification_node_id, nodesById);
	const parts = [
		template.title ?? '',
		template.description ?? '',
		place?.branch.name ?? '',
		place?.notion.name ?? '',
		place?.subnotion?.name ?? '',
		...(pointNames[template.id] ?? [])
	];
	const haystack = ` ${normalizeForSearch(parts.join(' '))}`;
	haystacks.set(template, haystack);
	return haystack;
}

/**
 * Modèles qui contiennent tous les mots de la recherche (chacun au début d'un
 * mot), groupés par sous-notion dans l'ordre de l'arbre. `null` : moins de
 * `SEARCH_MIN_CHARACTERS` lettres, pas de recherche.
 */
export function searchCatalogue(
	templates: readonly QuestionTemplate[],
	nodes: readonly CatalogueNode[],
	pointNames: Readonly<Record<string, string[]>>,
	query: string
): SearchResult | null {
	const normalized = normalizeForSearch(query);
	if (normalized.replace(/ /g, '').length < SEARCH_MIN_CHARACTERS) return null;

	const words = normalized.split(' ').map((word) => ` ${word}`);
	const nodesById = new Map(nodes.map((n) => [n.id, n]));
	const matches = templates.filter((template) => {
		const haystack = haystackOf(template, nodesById, pointNames);
		return words.every((word) => haystack.includes(word));
	});

	const catalogue = buildCatalogue(matches, nodes);
	const groups: SearchGroup[] = catalogue.branches.flatMap((branch) =>
		branch.notions.flatMap((notion) =>
			notion.rubrics.map((rubric) => ({
				id: rubric.id ?? `${notion.id}:general`,
				path:
					rubric.id === null ? [branch.name, notion.name] : [branch.name, notion.name, rubric.name],
				templates: rubric.templates
			}))
		)
	);
	if (catalogue.unclassified.length > 0) {
		groups.push({
			id: UNCLASSIFIED_GROUP_ID,
			path: [UNCLASSIFIED_GROUP_NAME],
			templates: catalogue.unclassified
		});
	}

	return { total: matches.length, groups };
}

/**
 * Groupes dépliés à l'affichage des résultats : les premiers, tant que leurs
 * cartes tiennent dans `SEARCH_OPEN_CARD_LIMIT` ; le premier toujours.
 */
export function initiallyOpenGroups(groups: readonly SearchGroup[]): string[] {
	const open: string[] = [];
	let cards = 0;
	for (const group of groups) {
		cards += group.templates.length;
		if (open.length > 0 && cards > SEARCH_OPEN_CARD_LIMIT) break;
		open.push(group.id);
	}
	return open;
}

/** Oublie les textes calculés (tests) */
export function clearSearchCache(): void {
	haystacks = new WeakMap();
}
