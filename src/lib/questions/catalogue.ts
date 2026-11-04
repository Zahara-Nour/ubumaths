/**
 * Catalogue Automaths : rangement des modèles et aperçus à la demande
 * ===================================================================
 *
 * Le catalogue se construit dans le navigateur, à partir du cache des modèles
 * publiés (`questionTemplatesCache`) : le serveur ne calcule plus aucun aperçu
 * (1 912 modèles le 2026-11-04, 7 à 11 s par chargement).
 *
 * - `buildCatalogue` range les modèles selon l'arbre des notions (ADR 0019) :
 *   branche → notion → sous-notion, dans l'ordre de l'arbre (`position`, réglée
 *   dans l'admin), puis par niveau croissant. Les modèles posés sur la notion
 *   elle-même forment la rubrique « Général », en tête.
 * - `templatePreview` calcule l'aperçu d'UN modèle (graine du panier), une
 *   seule fois : la rubrique dépliée l'appelle pour ses cartes seulement.
 *
 * Seul le rangement suit l'arbre : le panier et les séries désignent encore les
 * modèles par l'ancien quadruplet, jusqu'au lot 2 du chantier `automaths-arbre`
 * (ADR 0035).
 */

import { generateInstance } from '$lib/questions/generator/instance-generator';
import { PREVIEW_SEED } from '$lib/questions/cart-preview';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { compareNodes, placeOfNode, type TreeNode } from '$lib/questions/classification-tree';

// ============================================================================
// TYPES
// ============================================================================

/** Ce que le catalogue lit d'un nœud de l'arbre */
export type CatalogueNode = TreeNode;

/** Rubrique dépliable : une sous-notion, ou « Général » (modèles posés sur la notion) */
export interface CatalogueRubric {
	/** `null` : rubrique « Général » */
	id: string | null;
	name: string;
	templates: QuestionTemplate[];
}

export interface CatalogueNotion {
	id: string;
	name: string;
	rubrics: CatalogueRubric[];
}

export interface CatalogueBranch {
	id: string;
	name: string;
	notions: CatalogueNotion[];
}

export interface Catalogue {
	branches: CatalogueBranch[];
	/** Modèles dont le nœud manque dans l'arbre lu : montrés à part, jamais perdus */
	unclassified: QuestionTemplate[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const GENERAL_RUBRIC_NAME = 'Général';

// ============================================================================
// VARIABLES
// ============================================================================

/**
 * Aperçus déjà calculés, par objet modèle : une liste relue (après
 * `invalidate()`) apporte de nouveaux objets, donc de nouveaux aperçus.
 * `null` = aperçu impossible, retenu pour ne pas relancer le calcul.
 */
let previews = new WeakMap<QuestionTemplate, QuestionInstance | null>();

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Dans une rubrique : niveau croissant (numérique : 10 après 2), puis titre */
function compareTemplates(a: QuestionTemplate, b: QuestionTemplate): number {
	return (a.level ?? 0) - (b.level ?? 0) || (a.title ?? '').localeCompare(b.title ?? '', 'fr');
}

/** Notion et sous-notion d'un modèle, ou `null` s'il n'est pas rangé sous une notion */
function placeOf(template: QuestionTemplate, nodesById: ReadonlyMap<string, CatalogueNode>) {
	return placeOfNode(template.classification_node_id, nodesById);
}

/**
 * Modèles rangés branche → notion → sous-notion, dans l'ordre de l'arbre puis
 * par niveau. Ce qui n'a aucun modèle n'apparaît pas.
 */
export function buildCatalogue(
	templates: readonly QuestionTemplate[],
	nodes: readonly CatalogueNode[]
): Catalogue {
	const nodesById = new Map(nodes.map((n) => [n.id, n]));
	const unclassified: QuestionTemplate[] = [];
	// branche → notion → rubrique (clé '' = « Général ») → modèles
	const placed = new Map<string, Map<string, Map<string, QuestionTemplate[]>>>();

	for (const template of templates) {
		const place = placeOf(template, nodesById);
		if (!place) {
			unclassified.push(template);
			continue;
		}
		const notions = placed.get(place.branch.id) ?? new Map();
		placed.set(place.branch.id, notions);
		const rubrics = notions.get(place.notion.id) ?? new Map();
		notions.set(place.notion.id, rubrics);
		const rubricKey = place.subnotion?.id ?? '';
		const rubric = rubrics.get(rubricKey) ?? [];
		rubrics.set(rubricKey, rubric);
		rubric.push(template);
	}

	// Un seul avertissement par rangement, pas un par modèle
	if (unclassified.length > 0) {
		const firstIds = unclassified.slice(0, 5).map((t) => t.id);
		console.warn(
			`Catalogue : ${unclassified.length} modèle(s) hors de l'arbre, rangés dans « Non classés » :`,
			firstIds
		);
	}

	const byTreeOrder = (ids: Iterable<string>) =>
		[...ids].map((id) => nodesById.get(id)!).sort(compareNodes);

	const branches = byTreeOrder(placed.keys()).map((branch): CatalogueBranch => {
		const notions = placed.get(branch.id)!;
		return {
			id: branch.id,
			name: branch.name,
			notions: byTreeOrder(notions.keys()).map((notion): CatalogueNotion => {
				const rubrics = notions.get(notion.id)!;
				const general = rubrics.get('');
				return {
					id: notion.id,
					name: notion.name,
					rubrics: [
						...(general
							? [{ id: null, name: GENERAL_RUBRIC_NAME, templates: general.sort(compareTemplates) }]
							: []),
						...byTreeOrder([...rubrics.keys()].filter((k) => k !== '')).map((subnotion) => ({
							id: subnotion.id,
							name: subnotion.name,
							templates: rubrics.get(subnotion.id)!.sort(compareTemplates)
						}))
					]
				};
			})
		};
	});

	return { branches, unclassified };
}

/** Aperçu d'un modèle (graine du panier), calculé une fois ; `null` si impossible */
export function templatePreview(template: QuestionTemplate): QuestionInstance | null {
	const known = previews.get(template);
	if (known !== undefined) return known;

	let preview: QuestionInstance | null = null;
	try {
		const result = generateInstance(template, PREVIEW_SEED);
		if (result.success && result.instance) {
			preview = result.instance;
		} else {
			const errors = 'errors' in result ? result.errors : ['erreur inconnue'];
			console.warn(`Aperçu impossible pour le modèle ${template.id} :`, errors);
		}
	} catch (error) {
		console.warn(`Aperçu impossible pour le modèle ${template.id} :`, error);
	}

	previews.set(template, preview);
	return preview;
}

/** Oublie les aperçus calculés (tests) */
export function clearPreviewCache(): void {
	previews = new WeakMap();
}
