/**
 * Pedagogical Simplify — développer : de l'expression aux étapes montrées
 *
 * **Une intention, une seule rédaction** (décision de David du 2026-10-14,
 * option B). Tout chemin qui MONTRE à un élève les étapes de l'intention
 * `developper` passe par `explainExpansion` : le « Comment ? » de
 * `.développer` dans l'atelier (`atelier/expand.ts`), les corrections
 * d'exercices générées (`generatedSteps` `kind: 'simplify'`,
 * `intent: 'developper'`, `questions/generator/correction-generator.ts`), la
 * démo du module (`demo-helpers.ts`).
 *
 * La trace de `generatePedagogicalSimplifySteps` n'est montrée nulle part —
 * mesuré le 2026-10-14 : produits collés (`2 x 1` s'affiche « 2x1 »), la même
 * ligne jusqu'à 13 fois, distribution cachée sous « On regroupe les termes
 * semblables ». Seul son RÉSULTAT sert, ici comme à l'intégration et à la
 * stratégie 6 de `factoriser`, et il ne change pas.
 *
 * Le chemin : résultat du pipeline → ordre du manuel (`orderExpanded`) →
 * décimaux → rédaction (`writeExpandSteps`) → rendu, détaillé et résumé.
 *
 * Les décimaux suivent l'écriture (décision de David du 2026-10-06 pour
 * `.limite`, étendue à `.développer` le 2026-10-14) : un décimal écrit dans
 * l'expression donne des décimaux (`(0,5x+1)²` → `0,25x² + x + 1`), sinon des
 * fractions ; l'atelier y ajoute son mode décimal (`decimal: true`). Pour un
 * exercice, l'expression de l'énoncé décide.
 *
 * @module mathAST/pedagogical-simplify/expand-explained
 */

import type { MathNode } from '../types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import { multiply, number, opposite } from '../factory';
import { flattenProductShallow } from '../flatten';
import { findNodes, mapNode } from '../transforms';
import { nodesEqual } from '../normal/hash';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { generatePedagogicalSimplifySteps } from './pipeline';
import { PedagogicalSimplifyRenderer } from './renderer';
import { orderExpanded } from './expand-order';
import { writeExpandSteps, type ExpandSteps } from './expand-steps';
import type { PedagogicalSimplifyOptions } from './types';

// =============================================================================
// Types
// =============================================================================

/** Les options d'un développement expliqué. */
export interface ExplainExpansionOptions {
	/** Le niveau : celui du pipeline (le résultat en dépend) et du vocabulaire du rendu. */
	readonly schoolLevel: SchoolLevel;
	/** Des décimaux même sans décimal écrit : le mode décimal de l'atelier. */
	readonly decimal?: boolean;
	/** Les options du pipeline qu'un modèle d'exercice peut fixer, transmises telles quelles. */
	readonly pipeline?: Pick<
		PedagogicalSimplifyOptions,
		'variable' | 'enableTrig' | 'enableLogExp' | 'enableAbs'
	>;
}

/** La rédaction, brute et rendue dans ses deux versions. */
export interface ExpansionSteps {
	/** Les étapes brutes (`globalBefore`/`globalAfter` : la démo en syntaxe texte). */
	readonly raw: ExpandSteps;
	/** `raw.steps` rendues en `detailed` : lignes à × et « pourquoi ». */
	readonly detailed: readonly RenderedStep[];
	/** `raw.summary` rendues en `summarized` : sans lignes à × ni « pourquoi ». */
	readonly summarized: readonly RenderedStep[];
}

/** Ce que produit un développement expliqué — trois issues. */
export type ExplainedExpansion =
	| {
			readonly kind: 'expanded';
			/** La réponse développée, réduite, ordonnée, décimaux écrits : la dernière image. */
			readonly answer: MathNode;
			/** Les étapes, `null` quand on ne sait pas les rédiger (la réponse reste). */
			readonly steps: ExpansionSteps | null;
	  }
	/** Rien n'a bougé : il n'y a rien à développer. */
	| { readonly kind: 'unchanged' }
	/** Le pipeline n'a pas su finir (`2 x 1`, `1^2`) : ni réponse ni étapes. */
	| { readonly kind: 'unfinished' };

// =============================================================================
// Fonctions — lecture
// =============================================================================

/**
 * Les parenthèses de GROUPEMENT qui enveloppent tout retirées (`[0;1]` est un
 * intervalle). Partagée avec l'atelier (`atelier/expand.ts`), où la substitution
 * des noms écrit `f` en `((x+1)^2)`.
 */
export function unwrapGrouping(node: MathNode): MathNode {
	if (node.type !== 'delimiter') return node;
	if (node.semantic !== undefined && node.semantic !== 'grouping') return node;
	return unwrapGrouping(node.content);
}

/**
 * L'arbre sans ses parenthèses de groupement, pour comparer deux écritures du
 * même calcul : `1/(x+1)` tapé en ligne et `\dfrac{1}{x+1}` rendu par le
 * module ne diffèrent que par là (et par le style du quotient, que l'empreinte
 * ignore déjà).
 */
function withoutGrouping(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'delimiter' && (n.semantic === undefined || n.semantic === 'grouping')
			? n.content
			: n
	);
}

/**
 * `-(x+1)` s'écrit `-1(x+1)` pour le pipeline, qui ne développait pas
 * l'opposé d'une somme (0 étape : « rien à développer » — revue de la PR 1).
 */
function withExplicitMinusOne(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (n.type !== 'opposite' || n.operand.type !== 'delimiter') return n;
		const inside = unwrapGrouping(n.operand);
		if (inside.type !== 'addition' && inside.type !== 'subtraction') return n;
		return multiply(opposite(number('1')), n.operand, 'implicit');
	});
}

/**
 * Une écriture que le pipeline n'a pas su finir : deux nombres dans un même
 * produit (`2 x 1`), une puissance de nombres (`1^2`). Mesuré : une somme dans
 * un exposant (`e^{(x+1)^2}`) est développée sans être réduite.
 */
function hasUnfinishedArithmetic(node: MathNode): boolean {
	return (
		findNodes(node, (n) => {
			if (n.type === 'superscript') {
				return n.base.type === 'number' && n.superscript.type === 'number';
			}
			if (n.type !== 'multiplication') return false;
			return flattenProductShallow(n).filter(({ factor }) => factor.type === 'number').length >= 2;
		}).length > 0
	);
}

// =============================================================================
// Fonctions — décimaux
// =============================================================================

/** Un entier écrit, éventuellement précédé d'un signe : sa valeur, sinon `null`. */
function integerOf(node: MathNode): bigint | null {
	if (node.type === 'opposite') {
		const value = integerOf(node.operand);
		return value === null ? null : -value;
	}
	if (node.type !== 'number' || !/^-?\d+$/.test(node.value)) return null;
	return BigInt(node.value);
}

/**
 * En décimal, une fraction de deux entiers à écriture décimale finie s'écrit
 * en décimal (`1/4` → `0.25`). Les autres restent des fractions : arrondir
 * `1/9` ferait d'une égalité une approximation.
 */
function decimalFraction(node: MathNode): MathNode {
	if (node.type !== 'division') return node;
	const numerator = integerOf(node.numerator);
	const denominator = integerOf(node.denominator);
	if (numerator === null || denominator === null || denominator === 0n) return node;
	const negative = numerator < 0n !== denominator < 0n;
	const absolute = (n: bigint) => (n < 0n ? -n : n);
	const text = decimalString({ n: absolute(numerator), d: absolute(denominator) });
	if (text === null) return node;
	return negative ? opposite(number(text)) : number(text);
}

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Développer et réduire une expression, et rédiger comment — comme au tableau.
 *
 * Les exceptions du pipeline (`PedagogicalSimplifyNotImplemented` : matrice,
 * inéquation…) remontent à l'appelant, qui sait comment se replier.
 *
 * @param node - Une expression (pas une relation : on développe une expression)
 * @param options - Le niveau, le mode décimal de l'atelier, les options d'un modèle
 */
export function explainExpansion(
	node: MathNode,
	options: ExplainExpansionOptions
): ExplainedExpansion {
	const start = unwrapGrouping(node);
	const result = generatePedagogicalSimplifySteps(withExplicitMinusOne(start), {
		...options.pipeline,
		intent: 'developper',
		schoolLevel: options.schoolLevel,
		verbosity: 'detailed'
	});
	// Rien n'a bougé : aucune étape, ou des étapes qui rendent l'expression de
	// départ (`1/(x+1)` : « On réduit la fraction », sans rien réduire)
	if (
		result.steps.length === 0 ||
		nodesEqual(withoutGrouping(result.result), withoutGrouping(start))
	) {
		return { kind: 'unchanged' };
	}

	// L'ordre du manuel (tableau B de la phase 0) : celui de la réponse ET des étapes
	const ordered = orderExpanded(result.result);
	const decimal = options.decimal === true || hasDecimalLiteral(start);
	const format = (image: MathNode) => (decimal ? mapNode(image, decimalFraction) : image);
	const answer = format(ordered);
	// Jamais une réponse mal écrite : « je ne sais pas » vaut mieux que `2 x 1`
	if (hasUnfinishedArithmetic(answer)) return { kind: 'unfinished' };

	// Les étapes reçoivent la réponse et sa mise en forme : leur dernière image
	// s'écrit exactement comme la réponse
	const raw = writeExpandSteps(start, ordered, { format });
	if (raw === null) return { kind: 'expanded', answer, steps: null };
	const renderer = new PedagogicalSimplifyRenderer();
	const { schoolLevel } = options;
	return {
		kind: 'expanded',
		answer,
		steps: {
			raw,
			detailed: renderer.renderAll(raw.steps, { schoolLevel, verbosity: 'detailed' }),
			summarized: renderer.renderAll(raw.summary, { schoolLevel, verbosity: 'summarized' })
		}
	};
}
