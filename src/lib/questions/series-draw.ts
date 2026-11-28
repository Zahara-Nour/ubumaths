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
 * Variations choisies (idée 2) : le prof peut restreindre une ligne à
 * certaines variations ; la répartition et le compte du panier se font alors
 * parmi elles seules (`allowedVariations`).
 *
 * Doublon (option « b + a » validée par David) : mêmes nombres tirés, OU même
 * énoncé affiché (choix d'un QCM comptés sans leur ordre). Deux calculs qui ont
 * la même réponse (« 12 × 5 », « 15 × 4 ») ne sont PAS un doublon.
 */

import { tokenize } from '#lib/ubumark/parameterization/parser/tokenizer.ts';
import { replaceChoiceBlocks, serializeChoiceBlock } from '#lib/ubumark/parser/choix-parser.ts';
import type { GenerationResult, QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { createRandomSource, randomIndex, shuffled, type RandomSource } from '#lib/utils/random.ts';
import { asChoiceInstance } from '#lib/questions/choice-from-errors.ts';

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
	/** Variations sans question neuve : les lignes suivantes du modèle ne les cherchent plus */
	exhausted: Set<number>;
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

/**
 * Questions générées pour une variation avant de la déclarer épuisée. Une
 * variation presque vidée (55 questions vues sur 60 possibles) peut être dite
 * épuisée à tort (~1 %) : la ligne est alors un peu plus courte, accepté.
 */
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

/** Nombre de variations du modèle (au moins 1) */
function variationCount(template: QuestionTemplate): number {
	return Math.max(1, template.variations?.length ?? 0);
}

/**
 * Variations où tirer, dans l'ordre (idée 2, Q3) : celles choisies qui existent
 * encore dans le modèle ; aucun choix, ou plus aucune valable → toutes.
 */
export function allowedVariations(
	template: QuestionTemplate,
	chosen: readonly number[] | undefined
): number[] {
	const count = variationCount(template);
	const all = Array.from({ length: count }, (_, index) => index);
	const kept = all.filter((index) => chosen?.includes(index));
	return kept.length > 0 ? kept : all;
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
	return { display: new Set(), values: new Set(), exhausted: new Set() };
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
	const count = variationCount(template);
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
	generate: Generate,
	asChoice: boolean
): Search {
	for (let tries = 0; tries < MAX_GENERATIONS_PER_QUESTION; tries++) {
		const seed = seedForVariation(template, variationIndex, random);
		if (seed === undefined) return { kind: 'exhausted' };
		const result = generate(template, seed);
		// Comme avant : une génération qui échoue omet la question, sans réessayer
		if (!result.success) return { kind: 'failed', errors: result.errors };
		// Idée 4 : la case en QCM quand ce tirage le permet, sinon la question en saisie
		const instance = (asChoice && asChoiceInstance(result.instance, seed)) || result.instance;
		const fingerprints = questionFingerprints(template, instance);
		if (isSeen(fingerprints, seen)) continue;
		remember(fingerprints, seen);
		return { kind: 'found', question: { seed, instance } };
	}
	return { kind: 'exhausted' };
}

/**
 * Distribution des variations : des tours mélangés des variations permises
 * encore disponibles (10 questions, 3 variations → 4 + 3 + 3). Une variation
 * épuisée ne sort plus ; sa place revient aux suivantes.
 */
function variationDeal(allowed: readonly number[], random: RandomSource) {
	let round: number[] = [];
	return (exhausted: ReadonlySet<number>): number | undefined => {
		for (;;) {
			if (round.length === 0) {
				const available = allowed.filter((index) => !exhausted.has(index));
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
 * un modèle sans question neuve raccourcit la ligne. `variations` : celles
 * choisies par le prof (toutes si absent, cf. `allowedVariations`).
 * `choiceVariations` : celles dont la case se répond en QCM (idée 4, aucune si
 * absent) ; la graine reste celle de la question en saisie (mêmes nombres).
 */
export function drawLineQuestions(
	template: QuestionTemplate,
	quantity: number,
	lineSeed: number,
	seen: SeenQuestions,
	generate: Generate,
	onFailure: (errors: unknown) => void = () => {},
	variations?: readonly number[],
	choiceVariations?: readonly number[]
): DrawnQuestion[] {
	const random = createRandomSource(lineSeed);
	const deal = variationDeal(allowedVariations(template, variations), random);
	const { exhausted } = seen;
	const questions: DrawnQuestion[] = [];

	for (let repetition = 0; repetition < quantity; repetition++) {
		for (;;) {
			const variationIndex = deal(exhausted);
			if (variationIndex === undefined) return questions;
			const asChoice = choiceVariations?.includes(variationIndex) ?? false;
			const search = findNewQuestion(template, variationIndex, random, seen, generate, asChoice);
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
	generate: Generate,
	variations?: readonly number[]
): number {
	return drawLineQuestions(template, upTo, COUNT_SEED, emptySeen(), generate, undefined, variations)
		.length;
}

/** Plafond des répétitions d'une ligne du panier (`MAX_ITEM_QUANTITY`) */
const COUNT_CAP = 99;

/** Comptes déjà faits par modèle et par choix de variations : jusqu'où on a cherché, et ce qu'on a trouvé */
const distinctCounts = new WeakMap<
	QuestionTemplate,
	Map<string, { upTo: number; count: number }>
>();

/**
 * Avertissement du panier : le nombre de questions différentes du modèle quand
 * `quantity` le dépasse, `null` sinon. Mis en cache par modèle : un modèle
 * épuisé n'est plus recompté, et une quantité déjà atteinte non plus. Quand il
 * faut chercher plus loin, on cherche au moins deux fois plus loin (monter de
 * 1 à 99 par « + » ne refait que quelques tirages, pas 99).
 *
 * Une génération en échec n'est pas un épuisement : rien n'est dit (`null`) ni
 * retenu, le tirage de la série journalise l'échec. `variations` : celles
 * choisies sur la ligne (idée 2), comptées à part.
 */
export function distinctLimit(
	template: QuestionTemplate,
	quantity: number,
	generate: Generate,
	variations?: readonly number[]
): number | null {
	const allowed = allowedVariations(template, variations);
	const key = allowed.join(',');
	let byChoice = distinctCounts.get(template);
	if (!byChoice) {
		byChoice = new Map();
		distinctCounts.set(template, byChoice);
	}
	let known = byChoice.get(key);
	const exhausted = known !== undefined && known.count < known.upTo;
	if (!known || (!exhausted && quantity > known.upTo)) {
		const upTo = Math.max(quantity, Math.min(COUNT_CAP, 2 * (known?.upTo ?? 0)));
		let failed = false;
		const count = drawLineQuestions(
			template,
			upTo,
			COUNT_SEED,
			emptySeen(),
			generate,
			() => {
				failed = true;
			},
			allowed
		).length;
		if (failed) return null;
		known = { upTo, count };
		byChoice.set(key, known);
	}
	return known.count < quantity ? known.count : null;
}

/** Graine fixe des exemples de variation : le même exemple à chaque ouverture */
const EXAMPLE_SEED = 20261122;

/**
 * Un exemple de question de cette variation (idée 2, Q1) : le prof reconnaît
 * une variation à son exemple, faute de nom. Toujours le même (graine fixe) ;
 * `null` si aucune graine n'y mène ou si la génération échoue.
 */
export function variationExample(
	template: QuestionTemplate,
	variationIndex: number,
	generate: Generate
): QuestionInstance | null {
	const seed = seedForVariation(template, variationIndex, createRandomSource(EXAMPLE_SEED));
	if (seed === undefined) return null;
	const result = generate(template, seed);
	return result.success ? result.instance : null;
}
