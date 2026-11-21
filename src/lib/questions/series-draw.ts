/**
 * Tirage d'une série : variations réparties, doublons refusés
 * ===========================================================
 *
 * Une ligne de série répète un modèle N fois. Pour que les N questions soient
 * variées (chantier `idees-format`, idée 1, décisions de David du 2026-11-21) :
 *
 * - **variations réparties** : les variations sont distribuées à parts égales
 *   (10 questions, 3 variations → 4 + 3 + 3), dans un ordre mélangé ;
 * - **doublons refusés** : une question déjà posée du même modèle dans la série
 *   est tirée de nouveau ;
 * - **pas de répétition** : quand un modèle n'a plus de question neuve, sa
 *   ligne est raccourcie (le panier prévient le prof avant, cf. `distinctQuestionCount`).
 *
 * On ne force JAMAIS la variation : on CHOISIT LA GRAINE. La variation est le
 * premier tirage de l'instance (`generateInstance`), on lit donc sans rien
 * générer la variation que donnera une graine (`variationOfSeed`). Une graine
 * redonne toujours la même question, partout (évaluation, statistiques
 * d'erreurs rejouées depuis la graine, ADR 0015) : rien de plus à enregistrer.
 *
 * Doublon (option « b + a » validée par David) : mêmes nombres tirés, OU même
 * énoncé affiché (choix d'un QCM comptés sans leur ordre). Deux calculs qui ont
 * la même réponse (« 12 × 5 », « 15 × 4 ») ne sont PAS un doublon.
 */

import { tokenize } from '#lib/ubumark/parameterization/parser/tokenizer.ts';
import { replaceChoiceBlocks, serializeChoiceBlock } from '#lib/ubumark/parser/choix-parser.ts';
import type { GenerationResult, QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { createRandomSource, randomIndex, shuffled, type RandomSource } from '#lib/utils/random.ts';

// ============================================================================
// TYPES
// ============================================================================

/** Empreintes d'une question, comparées à celles des questions déjà tirées */
export interface QuestionFingerprints {
	/** Ce que l'élève voit : l'énoncé, choix d'un QCM triés */
	display: string;
	/** Variation + nombres tirés ; absente quand elle ne dirait pas tout (tirage dans le texte) */
	values?: string;
}

/** Empreintes déjà vues pour un modèle, dans toute la série */
export interface SeenQuestions {
	display: Set<string>;
	values: Set<string>;
}

export type Generate = (template: QuestionTemplate, seed: number) => GenerationResult;

/** Une question tirée : sa graine et l'instance générée avec elle */
export interface DrawnQuestion {
	seed: number;
	instance: QuestionInstance;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Plus grande graine tirée (entier 32 bits positif, borne du schéma de sauvegarde) */
export const MAX_QUESTION_SEED = 2 ** 31 - 1;

/** Questions générées pour une variation avant de la déclarer épuisée */
export const MAX_GENERATIONS_PER_QUESTION = 50;

/** Graines lues (sans générer) par variation cherchée, pour une génération */
const MAX_SEEDS_PER_VARIATION = 200;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Variation que donnera cette graine, sans générer : même premier tirage que
 * `generateInstance` (une source par instance, la variation d'abord).
 * Un modèle à une variation (ou sans variation lisible) rend 0.
 */
export function variationOfSeed(template: QuestionTemplate, seed: number): number {
	const count = template.variations?.length ?? 0;
	if (count <= 1) return 0;
	return randomIndex(count, createRandomSource(seed));
}

/** Énoncé brut de la variation (le sien, sinon celui du tronc commun) */
function rawStatement(template: QuestionTemplate, variationIndex: number): string {
	const variation = template.variations?.[variationIndex];
	return String(variation?.statement || template.shared?.statement || '');
}

/**
 * L'énoncé tire-t-il lui-même au hasard (`{{1..10}}`, `{{carré|rectangle}}`) ?
 * Ces tirages ne sont pas des variables : deux questions aux mêmes variables
 * peuvent alors différer, et l'empreinte des nombres ne doit pas servir.
 */
function statementDrawsInline(template: QuestionTemplate, variationIndex: number): boolean {
	return tokenize(rawStatement(template, variationIndex)).some(
		(token) => token.type === 'random' || token.type === 'digits'
	);
}

/** L'énoncé affiché, choix des blocs ```choix triés (leur ordre mélangé ne compte pas) */
function displayedStatement(instance: QuestionInstance): string {
	return replaceChoiceBlocks(String(instance.statement ?? ''), (block) =>
		serializeChoiceBlock({
			caseIndex: block.caseIndex ?? 0,
			multiple: block.multiple,
			choices: [...block.choices].sort()
		})
	);
}

/**
 * Empreintes d'une question. L'empreinte des nombres n'existe que si la
 * variation a des variables et que son énoncé ne tire rien lui-même.
 */
export function questionFingerprints(
	template: QuestionTemplate,
	instance: QuestionInstance
): QuestionFingerprints {
	const variationIndex = instance.selectedVariationIndex ?? 0;
	const display = displayedStatement(instance);
	const variables = instance.resolvedVariables ?? [];
	if (variables.length === 0 || statementDrawsInline(template, variationIndex)) {
		return { display };
	}
	const values = JSON.stringify([
		variationIndex,
		variables.map((variable) => [variable.name, variable.value])
	]);
	return { display, values };
}

function isSeen(fingerprints: QuestionFingerprints, seen: SeenQuestions): boolean {
	return (
		seen.display.has(fingerprints.display) ||
		(fingerprints.values !== undefined && seen.values.has(fingerprints.values))
	);
}

function remember(fingerprints: QuestionFingerprints, seen: SeenQuestions): void {
	seen.display.add(fingerprints.display);
	if (fingerprints.values !== undefined) seen.values.add(fingerprints.values);
}

export function emptySeen(): SeenQuestions {
	return { display: new Set(), values: new Set() };
}

/** Graine suivante de la suite d'une ligne */
function nextSeed(random: RandomSource): number {
	return Math.floor(random() * (MAX_QUESTION_SEED + 1));
}

/** Prochaine graine de la suite qui mène à cette variation ; aucune → `undefined` */
function seedForVariation(
	template: QuestionTemplate,
	variationIndex: number,
	random: RandomSource
): number | undefined {
	const count = Math.max(1, template.variations?.length ?? 0);
	for (let tries = 0; tries < MAX_SEEDS_PER_VARIATION * count; tries++) {
		const seed = nextSeed(random);
		if (variationOfSeed(template, seed) === variationIndex) return seed;
	}
	return undefined;
}

type Search =
	| { kind: 'found'; question: DrawnQuestion }
	| { kind: 'exhausted' }
	| { kind: 'failed'; errors: unknown };

/** Une question neuve de cette variation, ou la variation est épuisée */
function findNewQuestion(
	template: QuestionTemplate,
	variationIndex: number,
	random: RandomSource,
	seen: SeenQuestions,
	generate: Generate
): Search {
	for (let tries = 0; tries < MAX_GENERATIONS_PER_QUESTION; tries++) {
		const seed = seedForVariation(template, variationIndex, random);
		if (seed === undefined) return { kind: 'exhausted' };
		const result = generate(template, seed);
		// Comme avant : une génération qui échoue omet la question, sans réessayer
		if (!result.success) return { kind: 'failed', errors: result.errors };
		const fingerprints = questionFingerprints(template, result.instance);
		if (isSeen(fingerprints, seen)) continue;
		remember(fingerprints, seen);
		return { kind: 'found', question: { seed, instance: result.instance } };
	}
	return { kind: 'exhausted' };
}

/**
 * Distribution des variations : des tours mélangés de toutes les variations
 * encore disponibles (10 questions, 3 variations → 4 + 3 + 3). Une variation
 * épuisée ne sort plus ; sa place revient aux suivantes.
 */
function variationDeal(count: number, random: RandomSource) {
	let round: number[] = [];
	return (exhausted: ReadonlySet<number>): number | undefined => {
		for (;;) {
			if (round.length === 0) {
				const available = Array.from({ length: count }, (_, index) => index).filter(
					(index) => !exhausted.has(index)
				);
				if (available.length === 0) return undefined;
				round = shuffled(available, random);
			}
			const next = round.shift() as number;
			if (!exhausted.has(next)) return next;
		}
	};
}

/**
 * Questions d'une ligne : `quantity` questions neuves au plus, variations
 * réparties. La suite de graines vient de `lineSeed` seule : la ligne ne
 * dépend pas du nombre d'essais des autres lignes (« mêmes nombres pour
 * tous »). `seen` est partagé entre les lignes d'un même modèle.
 *
 * Une génération qui échoue omet sa question (journalisée par `onFailure`) ;
 * un modèle sans question neuve raccourcit la ligne.
 */
export function drawLineQuestions(
	template: QuestionTemplate,
	quantity: number,
	lineSeed: number,
	seen: SeenQuestions,
	generate: Generate,
	onFailure: (errors: unknown) => void = () => {}
): DrawnQuestion[] {
	const random = createRandomSource(lineSeed);
	const deal = variationDeal(Math.max(1, template.variations?.length ?? 0), random);
	const exhausted = new Set<number>();
	const questions: DrawnQuestion[] = [];

	for (let repetition = 0; repetition < quantity; repetition++) {
		for (;;) {
			const variationIndex = deal(exhausted);
			if (variationIndex === undefined) return questions;
			const search = findNewQuestion(template, variationIndex, random, seen, generate);
			if (search.kind === 'found') {
				questions.push(search.question);
				break;
			}
			if (search.kind === 'failed') {
				onFailure(search.errors);
				break;
			}
			exhausted.add(variationIndex);
		}
	}
	return questions;
}

/** Graine fixe de `distinctQuestionCount` : le même résultat à chaque fois */
const COUNT_SEED = 20261121;

/**
 * Combien de questions différentes ce modèle donne-t-il, jusqu'à `upTo` ?
 * Même tirage que la série, à graine fixe. Le panier s'en sert pour proposer
 * d'abaisser une quantité trop élevée.
 */
export function distinctQuestionCount(
	template: QuestionTemplate,
	upTo: number,
	generate: Generate
): number {
	return drawLineQuestions(template, upTo, COUNT_SEED, emptySeen(), generate).length;
}
