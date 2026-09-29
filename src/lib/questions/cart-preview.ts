/**
 * Aperçu d'une catégorie du panier
 * ================================
 *
 * Le panier retient des catégories (thème, domaine, sous-domaine, niveau), pas
 * des modèles. Pour montrer un énoncé, on retrouve le modèle de la catégorie et
 * on en génère une instance avec la graine fixe d'Automaths : l'aperçu est le
 * même que dans la grille, et il ne change pas quand on modifie le panier
 * (quantité, durée) — un tirage au hasard renouvelait toutes les tuiles à
 * chaque clic.
 */

import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { QuestionCategory } from '$lib/stores/questionCart.svelte';

// ============================================================================
// TYPES
// ============================================================================

export interface CartItemPreview {
	template?: QuestionTemplate;
	instance?: QuestionInstance;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Graine des aperçus (grille Automaths, panier, création d'évaluation) */
export const PREVIEW_SEED = 12345;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Modèle d'une catégorie. Sous-domaine absent : `null` et `''` se valent.
 * Niveau : le panier persiste en localStorage, un ancien panier peut porter
 * le niveau en chaîne — on compare en nombre.
 */
export function findCategoryTemplate(
	templates: readonly QuestionTemplate[],
	category: QuestionCategory
): QuestionTemplate | undefined {
	return templates.find(
		(template) =>
			template.theme === category.theme &&
			template.domain === category.domain &&
			(template.subdomain || null) === (category.subdomain || null) &&
			template.level === Number(category.level)
	);
}

/** Modèle + instance d'aperçu (graine fixe) ; vide si aucun modèle ou échec */
export function previewCartItem(
	templates: readonly QuestionTemplate[],
	category: QuestionCategory
): CartItemPreview {
	const template = findCategoryTemplate(templates, category);
	if (!template) return {};
	try {
		const result = generateInstance(template, PREVIEW_SEED);
		if (result.success && result.instance) return { template, instance: result.instance };
		const errors = 'errors' in result ? result.errors : ['erreur inconnue'];
		console.error(`Aperçu impossible pour ${category.theme}/${category.domain} :`, errors);
	} catch (error) {
		console.error(`Aperçu impossible pour ${category.theme}/${category.domain} :`, error);
	}
	return { template };
}
