/**
 * Questions d'une série
 * =====================
 *
 * Une série est une composition : des catégories, chacune avec un nombre de
 * répétitions et une durée (CONTEXT.md). À chaque usage, on tire un modèle au
 * hasard dans chaque catégorie et on génère une instance par répétition.
 *
 * Chaque question porte SA durée et SA catégorie : avant, les durées étaient
 * reconstruites à part depuis le panier et se décalaient dès qu'une catégorie
 * était sautée ou qu'une génération échouait.
 */

import { generateInstance } from '$lib/questions/generator/instance-generator';
import { excludeCourseCards as withoutCourseCards } from '$lib/questions/course-card';
import type { GenerationResult, QuestionTemplate } from '$lib/questions/types';
import type { CartItem, QuestionCategory } from '$lib/stores/questionCart.svelte';
import type { ClassroomItem } from '$lib/types/test';

// ============================================================================
// TYPES
// ============================================================================

interface BuildOptions {
	/** Course aux nombres, évaluation : pas de carte de cours */
	excludeCourseCards?: boolean;
	/** Injectable pour les tests */
	generate?: (template: QuestionTemplate, seed: number) => GenerationResult;
	/** Injectable pour les tests : graine d'une question */
	nextSeed?: () => number;
	/** Injectable pour les tests : index tiré parmi `count` modèles */
	pickIndex?: (count: number) => number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Durée d'une question quand la série n'en donne pas (panier : 20 s) */
export const DEFAULT_QUESTION_DELAY_SECONDS = 20;

/** Plus grande graine tirée (entier 32 bits positif, borne du schéma de sauvegarde) */
export const MAX_QUESTION_SEED = 2 ** 31 - 1;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Clé stable d'une catégorie (thème, domaine, sous-domaine, niveau) */
export function categoryKeyOf(category: QuestionCategory): string {
	return [category.theme, category.domain, category.subdomain ?? '', Number(category.level)].join(
		'|'
	);
}

/**
 * Modèles d'une catégorie. Sous-domaine absent : `null` et `''` se valent.
 * Niveau : un ancien panier (localStorage) peut le porter en chaîne.
 */
function templatesOfCategory(
	templates: readonly QuestionTemplate[],
	category: QuestionCategory
): QuestionTemplate[] {
	return templates.filter(
		(template) =>
			template.theme === category.theme &&
			template.domain === category.domain &&
			(template.subdomain || null) === (category.subdomain || null) &&
			template.level === Number(category.level)
	);
}

/** Graine entière tirée au hasard, dans [0, MAX_QUESTION_SEED] */
function randomSeed(): number {
	return Math.floor(Math.random() * (MAX_QUESTION_SEED + 1));
}

/**
 * Questions d'une série, dans l'ordre de la composition. Une catégorie sans
 * modèle est sautée ; une génération qui échoue est omise. Aucune des deux ne
 * décale la durée des autres questions.
 *
 * Chaque question est générée avec SA graine (Q20), que l'instance porte
 * (`instance.seed`) et que la sauvegarde archive : le serveur pourra régénérer
 * la copie de l'élève pour la corriger (ADR 0015).
 */
export function buildSeriesItems(
	categories: readonly CartItem[],
	templates: readonly QuestionTemplate[],
	options: BuildOptions = {}
): ClassroomItem[] {
	const generate = options.generate ?? ((template, seed) => generateInstance(template, seed));
	const nextSeed = options.nextSeed ?? randomSeed;
	const pickIndex = options.pickIndex ?? ((count) => Math.floor(Math.random() * count));
	const items: ClassroomItem[] = [];

	for (const cartItem of categories) {
		const inCategory = templatesOfCategory(templates, cartItem.category);
		const candidates = options.excludeCourseCards ? withoutCourseCards(inCategory) : inCategory;
		if (candidates.length === 0) {
			console.warn(
				`Série : aucun modèle pour ${categoryKeyOf(cartItem.category)}, catégorie sautée`
			);
			continue;
		}

		const delaySeconds =
			cartItem.delay && cartItem.delay > 0 ? cartItem.delay : DEFAULT_QUESTION_DELAY_SECONDS;
		const categoryKey = categoryKeyOf(cartItem.category);

		for (let repetition = 0; repetition < cartItem.quantity; repetition++) {
			const template = candidates[pickIndex(candidates.length)];
			const result = generate(template, nextSeed());
			if (result.success) {
				items.push({ instance: result.instance, delaySeconds, categoryKey });
			} else {
				console.error(`Série : génération impossible pour le modèle ${template.id}`, result.errors);
			}
		}
	}

	return items;
}
