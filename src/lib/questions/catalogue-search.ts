/**
 * Recherche du catalogue Automaths
 * ================================
 *
 * Phase 0 du 2026-11-18, refaite par David le 2026-11-26 (PR B, journal `automaths`) :
 *
 * - raccourcis : notions et sous-notions dont le nom contient les mots
 *   cherchés (3 au plus, le nom exact d'abord, puis le plus court, puis le
 *   plus fourni ; jamais une branche, jamais un
 *   nœud sans question au niveau) ;
 * - bons résultats : titre, description, nom de la sous-notion et énoncé de
 *   chaque variation, sans blocs (figures, choix des QCM), formules ni
 *   variables (`{{…}}`) ; groupés par sous-notion (ou « Général » de la
 *   notion), le groupe qui a le plus de titres d'abord, puis la somme des
 *   pertinences (3 titre, 2 description, 1 ailleurs), à égalité dans l'ordre de l'arbre ; modèles hors de
 *   l'arbre en dernier, « Non classés » ;
 * - « aussi » (`others`) : mots trouvés seulement avec la correction (étapes
 *   écrites, retours) ou les intitulés des points du programme (`pointNames`) ;
 * - ni la consigne, ni le coup de pouce, ni le nom de la notion ou de la
 *   branche (« calcul » ramenait toute la branche « Nombres et calculs ») ;
 * - sans accents ni majuscules, `$` et commandes LaTeX réduits à leurs
 *   lettres (titre, description) ; singulier et pluriel confondus (-s, -x,
 *   -aux / -al) ;
 * - tous les mots de la recherche, dans n'importe quel ordre, chacun au DÉBUT
 *   d'un mot (« aire » ne trouve pas « linéaire ») ; dès 2 lettres ; en
 *   dessous, pas de recherche (`null`).
 *
 * Les textes cherchés d'un modèle sont calculés une fois par objet modèle :
 * une liste relue apporte de nouveaux objets, donc des textes neufs.
 */

import type { QuestionTemplate } from '#lib/questions/types.ts';
import { buildCatalogue, type CatalogueNode } from '#lib/questions/catalogue.ts';
import { compareNodes, placeOfNode } from '#lib/questions/classification-tree.ts';

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

/** Raccourci vers une notion, ou une sous-notion de cette notion */
export interface SearchShortcut {
	notionId: string;
	/** Sous-notion visée ; `null` : la notion entière */
	rubricId: string | null;
	/** Notion, puis sous-notion */
	path: string[];
	/** Questions de la notion (ou de la sous-notion) au niveau choisi */
	count: number;
}

export interface SearchResult {
	/** Nombre de bons résultats (ceux des groupes) */
	total: number;
	groups: SearchGroup[];
	shortcuts: SearchShortcut[];
	/** Mots trouvés seulement avec la correction ou les points du programme */
	others: QuestionTemplate[];
}

/** Textes cherchés d'un modèle, normalisés, chacun précédé d'une espace */
interface Haystacks {
	title: string;
	/** Titre et description */
	described: string;
	/** Bons résultats : titre, description, sous-notion, énoncés */
	main: string;
	/** Tout : bons résultats, corrections, points du programme */
	all: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Lettres et chiffres qu'il faut au moins pour lancer une recherche */
export const SEARCH_MIN_CHARACTERS = 2;

/** Au-delà de ce nombre de cartes, les groupes suivants sont repliés */
export const SEARCH_OPEN_CARD_LIMIT = 60;

/** Raccourcis montrés au plus */
export const SEARCH_SHORTCUT_LIMIT = 3;

export const UNCLASSIFIED_GROUP_ID = 'non-classes';

// Pertinence d'un modèle : tous les mots dans le titre, dans le titre et la
// description, ou ailleurs
const TITLE_SCORE = 3;
const DESCRIPTION_SCORE = 2;
const OTHER_SCORE = 1;
const UNCLASSIFIED_GROUP_NAME = 'Non classés';

// ============================================================================
// VARIABLES
// ============================================================================

/** Textes cherchés de chaque modèle */
let haystacks = new WeakMap<QuestionTemplate, Haystacks>();

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Minuscules sans accents, « œ » / « æ » en deux lettres ; tout ce qui n'est
 * ni lettre ni chiffre devient une espace, espaces réduites.
 */
export function normalizeForSearch(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/œ/g, 'oe')
			.replace(/æ/g, 'ae')
			// NFKD : accents détachés, et « ² » écrit « 2 »
			.normalize('NFKD')
			.replace(/\p{M}/gu, '')
			.replace(/[^\p{L}\p{N}]+/gu, ' ')
			.trim()
	);
}

/**
 * Mot ramené au singulier, pour confondre singulier et pluriel : « -aux »
 * devient « -al », un « s » ou un « x » final tombe (mots de 4 lettres au
 * moins : « les », « dix » restent). Appliqué aux deux côtés, recherche et
 * textes cherchés.
 */
function singular(word: string): string {
	if (word.length < 4) return word;
	// « tableaux » → « tableau », avant « -aux » → « -al » (« décimaux » → « décimal »)
	if (word.endsWith('eaux')) return word.slice(0, -1);
	if (word.endsWith('aux')) return `${word.slice(0, -3)}al`;
	if (word.endsWith('s') || word.endsWith('x')) return word.slice(0, -1);
	return word;
}

/** Texte normalisé, mots au singulier, précédé d'une espace (début de mot) */
function searchableWords(text: string): string {
	const normalized = normalizeForSearch(text);
	return normalized ? ` ${normalized.split(' ').map(singular).join(' ')}` : '';
}

/**
 * Texte lisible d'un énoncé ou d'une correction : sans blocs (figures, choix
 * des QCM, programmes), formules, variables `{{…}}` (même imbriquées), code
 * en ligne ni images.
 */
export function plainMarkdownText(markdown: string): string {
	// Variables d'abord : une figure peut être dans une variable (`{{if:k==1|```figure…}}`)
	return (
		withoutVariables(markdown)
			// Bloc ouvert par 3 accents graves ou plus, fermé par autant en début de
			// ligne : un bloc à 4 accents garde ses blocs intérieurs à 3
			.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, ' ')
			.replace(/\$\$[\s\S]*?\$\$/g, ' ')
			.replace(/\$[^$]*\$/g, ' ')
			.replace(/`[^`]*`/g, ' ')
			.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
	);
}

/**
 * Texte sans ses variables `{{…}}`, même imbriquées ou garnies d'accolades
 * simples (`{{if:k==1|$\frac{1}{2}$|…}}`) : on compte les `{{` et les `}}`.
 */
function withoutVariables(text: string): string {
	let result = '';
	let depth = 0;
	let index = 0;
	while (index < text.length) {
		if (text.startsWith('{{', index)) {
			depth++;
			index += 2;
		} else if (depth > 0 && text.startsWith('}}', index)) {
			depth--;
			index += 2;
			if (depth === 0) result += ' ';
		} else {
			if (depth === 0) result += text[index];
			index++;
		}
	}
	return result;
}

/** Énoncés et corrections écrites d'un modèle (variations, et leur part commune) */
function variationTexts(template: QuestionTemplate): {
	statements: string[];
	corrections: string[];
} {
	const statements: string[] = [];
	const corrections: string[] = [];
	const sources = [template.shared, ...(template.variations ?? [])];
	for (const source of sources) {
		if (!source) continue;
		if (source.statement) statements.push(plainMarkdownText(source.statement));
		const correction = source.correction;
		if (!correction) continue;
		for (const step of correction.steps ?? []) corrections.push(plainMarkdownText(step));
		const feedback = correction.feedback;
		for (const text of [feedback?.correct, feedback?.incorrect, feedback?.partial]) {
			if (text) corrections.push(plainMarkdownText(text));
		}
	}
	return { statements, corrections };
}

/** Textes cherchés d'un modèle (calculés une fois par objet modèle) */
function haystacksOf(
	template: QuestionTemplate,
	nodesById: ReadonlyMap<string, CatalogueNode>,
	pointNames: Readonly<Record<string, string[]>>
): Haystacks {
	const known = haystacks.get(template);
	if (known !== undefined) return known;

	const place = placeOfNode(template.classification_node_id, nodesById);
	const { statements, corrections } = variationTexts(template);
	const title = searchableWords(template.title ?? '');
	const described = title + searchableWords(template.description ?? '');
	const main = described + searchableWords([place?.subnotion?.name ?? '', ...statements].join(' '));
	const all =
		main + searchableWords([...corrections, ...(pointNames[template.id] ?? [])].join(' '));
	// Espace finale : un mot entier se cherche « ␣mot␣ »
	const result = {
		title: `${title} `,
		described: `${described} `,
		main: `${main} `,
		all: `${all} `
	};
	haystacks.set(template, result);
	return result;
}

function containsAll(haystack: string, words: readonly string[]): boolean {
	return words.every((word) => haystack.includes(word));
}

/**
 * Notions et sous-notions dont le nom contient tous les mots (chacun au début
 * d'un mot), avec au moins une question parmi `templates` ; le nom exact
 * d'abord, puis les noms les plus courts, puis les plus fournis, puis l'ordre
 * de l'arbre.
 */
function findShortcuts(
	templates: readonly QuestionTemplate[],
	nodes: readonly CatalogueNode[],
	nodesById: ReadonlyMap<string, CatalogueNode>,
	words: readonly string[]
): SearchShortcut[] {
	const exact = ` ${words.map((word) => word.trim()).join(' ')} `;
	const candidates = nodes
		.filter((node) => node.kind === 'notion' || node.kind === 'subnotion')
		.map((node) => ({ node, name: `${searchableWords(node.name)} ` }))
		.filter(({ name }) => containsAll(name, words));
	if (candidates.length === 0) return [];

	// Questions de chaque notion et de chaque sous-notion
	const counts = new Map<string, number>();
	for (const template of templates) {
		const place = placeOfNode(template.classification_node_id, nodesById);
		if (!place) continue;
		counts.set(place.notion.id, (counts.get(place.notion.id) ?? 0) + 1);
		if (place.subnotion) counts.set(place.subnotion.id, (counts.get(place.subnotion.id) ?? 0) + 1);
	}

	return candidates
		.filter(({ node }) => (counts.get(node.id) ?? 0) > 0)
		.sort(
			(a, b) =>
				Number(b.name === exact) - Number(a.name === exact) ||
				a.name.split(' ').length - b.name.split(' ').length ||
				(counts.get(b.node.id) ?? 0) - (counts.get(a.node.id) ?? 0) ||
				compareNodes(a.node, b.node)
		)
		.slice(0, SEARCH_SHORTCUT_LIMIT)
		.flatMap(({ node }) => {
			const place = placeOfNode(node.id, nodesById);
			if (!place) return [];
			return [
				{
					notionId: place.notion.id,
					rubricId: place.subnotion?.id ?? null,
					path: place.subnotion ? [place.notion.name, place.subnotion.name] : [place.notion.name],
					count: counts.get(node.id) ?? 0
				}
			];
		});
}

/** Modèles dans l'ordre du catalogue (arbre, puis non classés) */
function inCatalogueOrder(
	templates: QuestionTemplate[],
	nodes: readonly CatalogueNode[]
): QuestionTemplate[] {
	const catalogue = buildCatalogue(templates, nodes);
	return [
		...catalogue.branches.flatMap((branch) =>
			branch.notions.flatMap((notion) => notion.rubrics.flatMap((rubric) => rubric.templates))
		),
		...catalogue.unclassified
	];
}

/**
 * Raccourcis, bons résultats groupés par sous-notion (le plus pertinent
 * d'abord) et résultats « aussi ». `null` : moins de `SEARCH_MIN_CHARACTERS`
 * lettres, pas de recherche.
 */
export function searchCatalogue(
	templates: readonly QuestionTemplate[],
	nodes: readonly CatalogueNode[],
	pointNames: Readonly<Record<string, string[]>>,
	query: string
): SearchResult | null {
	const normalized = normalizeForSearch(query);
	if (normalized.replace(/ /g, '').length < SEARCH_MIN_CHARACTERS) return null;

	// Mot mis au singulier par la recherche (« mois » → « moi ») : cherché en
	// mot entier, sinon « mois » trouverait « moitié » ; les autres, en début de mot
	const words = normalized
		.split(' ')
		.map((word) => (singular(word) === word ? ` ${word}` : ` ${singular(word)} `));
	const nodesById = new Map(nodes.map((n) => [n.id, n]));
	const scores = new Map<QuestionTemplate, number>();
	const others: QuestionTemplate[] = [];
	for (const template of templates) {
		const texts = haystacksOf(template, nodesById, pointNames);
		if (containsAll(texts.main, words)) {
			scores.set(
				template,
				containsAll(texts.title, words)
					? TITLE_SCORE
					: containsAll(texts.described, words)
						? DESCRIPTION_SCORE
						: OTHER_SCORE
			);
		} else if (containsAll(texts.all, words)) {
			others.push(template);
		}
	}
	const scoreOf = (template: QuestionTemplate) => scores.get(template) ?? 0;
	const byScore = (list: QuestionTemplate[]) =>
		// Tri stable : à pertinence égale, l'ordre du catalogue
		[...list].sort((a, b) => scoreOf(b) - scoreOf(a));

	const catalogue = buildCatalogue([...scores.keys()], nodes);
	const classified: SearchGroup[] = catalogue.branches.flatMap((branch) =>
		branch.notions.flatMap((notion) =>
			notion.rubrics.map((rubric) => ({
				id: rubric.id ?? `${notion.id}:general`,
				path:
					rubric.id === null ? [branch.name, notion.name] : [branch.name, notion.name, rubric.name],
				templates: byScore(rubric.templates)
			}))
		)
	);
	const groupScore = (group: SearchGroup) =>
		group.templates.reduce((sum, template) => sum + scoreOf(template), 0);
	const titleCount = (group: SearchGroup) =>
		group.templates.filter((template) => scoreOf(template) === TITLE_SCORE).length;
	// Le plus de titres d'abord (décision de David du 2026-11-26), puis la somme
	// des pertinences ; tri stable : à égalité, l'ordre de l'arbre
	const groups = classified.sort(
		(a, b) => titleCount(b) - titleCount(a) || groupScore(b) - groupScore(a)
	);
	if (catalogue.unclassified.length > 0) {
		groups.push({
			id: UNCLASSIFIED_GROUP_ID,
			path: [UNCLASSIFIED_GROUP_NAME],
			templates: byScore(catalogue.unclassified)
		});
	}

	return {
		total: scores.size,
		groups,
		shortcuts: findShortcuts(templates, nodes, nodesById, words),
		others: inCatalogueOrder(others, nodes)
	};
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
