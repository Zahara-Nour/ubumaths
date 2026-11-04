/**
 * Catalogue Automaths : rangement des modèles et aperçus à la demande
 * ===================================================================
 *
 * Le catalogue se construit dans le navigateur, à partir du cache des modèles
 * publiés (`questionTemplatesCache`) : le serveur ne calcule plus aucun aperçu
 * (1 912 modèles le 2026-11-04, 7 à 11 s par chargement).
 *
 * - `buildCatalogue` range les modèles : thème → domaine → sous-domaine, dans
 *   l'ordre déclaré (`compareCategories`), puis par niveau croissant.
 * - `templatePreview` calcule l'aperçu d'UN modèle (graine du panier), une
 *   seule fois : la rubrique dépliée l'appelle pour ses cartes seulement.
 *
 * Le rangement suit encore les colonnes `theme` / `domain` / `subdomain`, pas
 * l'arbre des notions (ADR 0019) : le panier et les séries en dépendent.
 */

import { generateInstance } from '$lib/questions/generator/instance-generator';
import { compareCategories } from '$lib/questions/category-order';
import { PREVIEW_SEED } from '$lib/questions/cart-preview';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CatalogueSubdomain {
	/** `null` : modèles sans sous-domaine (`null` ou chaîne vide) */
	subdomain: string | null;
	templates: QuestionTemplate[];
}

export interface CatalogueDomain {
	domain: string;
	subdomains: CatalogueSubdomain[];
}

export interface CatalogueTheme {
	theme: string;
	domains: CatalogueDomain[];
}

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

/** Modèles rangés thème → domaine → sous-domaine (ordre déclaré, puis niveau) */
export function buildCatalogue(templates: readonly QuestionTemplate[]): CatalogueTheme[] {
	const sorted = [...templates].sort((a, b) => {
		const byCategory = compareCategories(a, b);
		if (byCategory !== 0) return byCategory;
		// `level` est numérique : un tri lexicographique classerait 10 avant 2.
		return (a.level ?? 0) - (b.level ?? 0);
	});

	const catalogue: CatalogueTheme[] = [];
	for (const template of sorted) {
		let theme = catalogue.find((t) => t.theme === template.theme);
		if (!theme) {
			theme = { theme: template.theme, domains: [] };
			catalogue.push(theme);
		}

		let domain = theme.domains.find((d) => d.domain === template.domain);
		if (!domain) {
			domain = { domain: template.domain, subdomains: [] };
			theme.domains.push(domain);
		}

		const subdomainKey = template.subdomain || null;
		let subdomain = domain.subdomains.find((s) => s.subdomain === subdomainKey);
		if (!subdomain) {
			subdomain = { subdomain: subdomainKey, templates: [] };
			domain.subdomains.push(subdomain);
		}

		subdomain.templates.push(template);
	}
	return catalogue;
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
