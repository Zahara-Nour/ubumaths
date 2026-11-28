/**
 * Questions d'une série
 * =====================
 *
 * Une série est une composition : des modèles, chacun avec un nombre de
 * répétitions et une durée (CONTEXT.md, ADR 0035). À chaque usage, on génère
 * une instance du modèle par répétition, chacune avec sa graine : variations
 * réparties, doublons refusés (`series-draw.ts`).
 *
 * Chaque question porte SA durée et SON modèle : avant, les durées étaient
 * reconstruites à part depuis le panier et se décalaient dès qu'une ligne
 * était sautée ou qu'une génération échouait.
 */

import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { excludeCourseCards as withoutCourseCards } from '#lib/questions/course-card.ts';
import { excludePythonCases as withoutPythonCases } from '#lib/questions/python/python-case.ts';
import type { GenerationResult, QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import {
	drawLineQuestions,
	emptySeen,
	MAX_QUESTION_SEED,
	type SeenQuestions
} from '#lib/questions/series-draw.ts';
import type { SeriesItem } from '#lib/validation/series.ts';
import type { ClassroomItem } from '#lib/types/test.ts';
import { createRandomSource } from '#lib/utils/random.ts';

// ============================================================================
// TYPES
// ============================================================================

interface BuildOptions {
	/** Course aux nombres, évaluation : pas de carte de cours */
	excludeCourseCards?: boolean;
	/**
	 * Évaluation notée (corrigée par le serveur) : pas de modèle à case Python, jugée dans le
	 * navigateur seulement (outil 49, Q1)
	 */
	excludePythonCases?: boolean;
	/** Injectable pour les tests */
	generate?: (template: QuestionTemplate, seed: number) => GenerationResult;
	/** Graine d'une LIGNE (d'où sortent celles de ses questions) ; injectable */
	nextSeed?: () => number;
	/** Génération impossible (question omise) : le serveur passe son logger */
	onGenerationFailure?: (templateId: string, errors: unknown) => void;
	/**
	 * Idée 4 : les variations « en QCM » des lignes deviennent des QCM. Jamais en
	 * flash-cards (rien à répondre) : la forme qui répond le demande.
	 */
	choiceCases?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Durée d'une question quand la série n'en donne pas (panier : 20 s) */
export const DEFAULT_QUESTION_DELAY_SECONDS = 20;

/** Plus grande graine tirée (entier 32 bits positif, borne du schéma de sauvegarde) */
export { MAX_QUESTION_SEED };

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Graine entière tirée au hasard, dans [0, MAX_QUESTION_SEED] */
function randomSeed(): number {
	return Math.floor(Math.random() * (MAX_QUESTION_SEED + 1));
}

/**
 * « Mêmes nombres pour tous » : suite des graines de questions tirée de la
 * graine de la série. Deux suites de même graine sont identiques ; chaque
 * question (répétitions d'une ligne comprises) a sa propre graine.
 */
export function seriesSeedSequence(seriesSeed: number): () => number {
	const random = createRandomSource(seriesSeed);
	return () => Math.floor(random() * (MAX_QUESTION_SEED + 1));
}

/** Un tirage : le modèle, la graine et l'instance générée avec elle, avec sa durée */
export interface SeriesDraw {
	template: QuestionTemplate;
	seed: number;
	instance: QuestionInstance;
	delaySeconds: number;
}

/**
 * Tirages d'une série, dans l'ordre de la composition : variations réparties
 * et doublons refusés (`series-draw.ts`). Chaque ligne reçoit UNE graine de
 * la suite, d'où sortent les graines de ses questions : une ligne sautée
 * (modèle retiré, carte de cours exclue) consomme la sienne, et les suivantes
 * gardent les leurs (« mêmes nombres pour tous »). Une génération qui échoue
 * est omise ; un modèle sans question neuve raccourcit sa ligne. Le serveur
 * d'une évaluation enregistre (modèle, graine) et l'instance (ADR 0015) : la
 * graine seule redonne la question.
 */
export function drawSeriesQuestions(
	items: readonly SeriesItem[],
	templates: readonly QuestionTemplate[],
	options: BuildOptions = {}
): SeriesDraw[] {
	const nextSeed = options.nextSeed ?? randomSeed;
	const generate = options.generate ?? ((template, seed) => generateInstance(template, seed));
	const withoutCards = options.excludeCourseCards ? withoutCourseCards([...templates]) : templates;
	const available = options.excludePythonCases
		? withoutPythonCases([...withoutCards])
		: withoutCards;
	const byId = new Map(available.map((template) => [template.id, template]));
	const onGenerationFailure =
		options.onGenerationFailure ??
		((templateId: string, errors: unknown) =>
			console.error(`Série : génération impossible pour le modèle ${templateId}`, errors));
	const seenByTemplate = new Map<string, SeenQuestions>();
	const draws: SeriesDraw[] = [];

	for (const item of items) {
		// Graine tirée même pour une ligne sautée : les lignes suivantes gardent les leurs
		const lineSeed = nextSeed();
		const template = byId.get(item.templateId);
		if (!template) {
			console.warn(`Série : modèle ${item.templateId} absent, ligne sautée`);
			continue;
		}

		const delaySeconds = item.delay && item.delay > 0 ? item.delay : DEFAULT_QUESTION_DELAY_SECONDS;
		const seen = seenByTemplate.get(template.id) ?? emptySeen();
		seenByTemplate.set(template.id, seen);
		const questions = drawLineQuestions(
			template,
			item.quantity,
			lineSeed,
			seen,
			generate,
			(errors) => onGenerationFailure(template.id, errors),
			item.variations,
			options.choiceCases ? item.choiceVariations : undefined
		);
		for (const { seed, instance } of questions) {
			draws.push({ template, seed, instance, delaySeconds });
		}
	}

	return draws;
}

/**
 * Questions d'une série, dans l'ordre de la composition (`drawSeriesQuestions`).
 * Une ligne sans modèle est sautée ; une génération qui échoue est omise.
 * Aucune des deux ne décale la durée des autres questions. Chaque instance
 * porte sa graine (`instance.seed`, Q20).
 */
export function buildSeriesItems(
	seriesItems: readonly SeriesItem[],
	templates: readonly QuestionTemplate[],
	options: BuildOptions = {}
): ClassroomItem[] {
	return drawSeriesQuestions(seriesItems, templates, options).map(
		({ instance, delaySeconds, template }) => ({ instance, delaySeconds, templateId: template.id })
	);
}
