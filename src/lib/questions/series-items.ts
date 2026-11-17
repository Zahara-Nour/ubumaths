/**
 * Questions d'une série
 * =====================
 *
 * Une série est une composition : des modèles, chacun avec un nombre de
 * répétitions et une durée (CONTEXT.md, ADR 0035). À chaque usage, on génère
 * une instance du modèle par répétition, chacune avec sa graine.
 *
 * Chaque question porte SA durée et SON modèle : avant, les durées étaient
 * reconstruites à part depuis le panier et se décalaient dès qu'une ligne
 * était sautée ou qu'une génération échouait.
 */

import { generateInstance } from '$lib/questions/generator/instance-generator';
import { excludeCourseCards as withoutCourseCards } from '$lib/questions/course-card';
import type { GenerationResult, QuestionTemplate } from '$lib/questions/types';
import type { SeriesItem } from '$lib/validation/series';
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

/** Graine entière tirée au hasard, dans [0, MAX_QUESTION_SEED] */
function randomSeed(): number {
	return Math.floor(Math.random() * (MAX_QUESTION_SEED + 1));
}

/** Un tirage : le modèle et la graine d'une question, avec sa durée */
export interface SeriesDraw {
	template: QuestionTemplate;
	seed: number;
	delaySeconds: number;
}

/**
 * Tirages d'une série, dans l'ordre de la composition, SANS générer : le modèle
 * de la ligne et une graine par répétition. Une ligne dont le modèle manque
 * (retiré, ou carte de cours exclue) est sautée. Le serveur d'une évaluation
 * enregistre ces tirages (modèle + graine) pour régénérer et corriger la copie
 * (ADR 0015).
 */
export function drawSeriesQuestions(
	items: readonly SeriesItem[],
	templates: readonly QuestionTemplate[],
	options: Omit<BuildOptions, 'generate'> = {}
): SeriesDraw[] {
	const nextSeed = options.nextSeed ?? randomSeed;
	const available = options.excludeCourseCards ? withoutCourseCards([...templates]) : templates;
	const byId = new Map(available.map((template) => [template.id, template]));
	const draws: SeriesDraw[] = [];

	for (const item of items) {
		const template = byId.get(item.templateId);
		if (!template) {
			console.warn(`Série : modèle ${item.templateId} absent, ligne sautée`);
			continue;
		}

		const delaySeconds = item.delay && item.delay > 0 ? item.delay : DEFAULT_QUESTION_DELAY_SECONDS;
		for (let repetition = 0; repetition < item.quantity; repetition++) {
			draws.push({ template, seed: nextSeed(), delaySeconds });
		}
	}

	return draws;
}

/**
 * Questions d'une série, dans l'ordre de la composition. Une ligne sans
 * modèle est sautée ; une génération qui échoue est omise. Aucune des deux ne
 * décale la durée des autres questions.
 *
 * Chaque question est générée avec SA graine (Q20), que l'instance porte
 * (`instance.seed`).
 */
export function buildSeriesItems(
	seriesItems: readonly SeriesItem[],
	templates: readonly QuestionTemplate[],
	options: BuildOptions = {}
): ClassroomItem[] {
	const generate = options.generate ?? ((template, seed) => generateInstance(template, seed));
	const items: ClassroomItem[] = [];

	for (const { template, seed, delaySeconds } of drawSeriesQuestions(
		seriesItems,
		templates,
		options
	)) {
		const result = generate(template, seed);
		if (result.success) {
			items.push({ instance: result.instance, delaySeconds, templateId: template.id });
		} else {
			console.error(`Série : génération impossible pour le modèle ${template.id}`, result.errors);
		}
	}

	return items;
}
