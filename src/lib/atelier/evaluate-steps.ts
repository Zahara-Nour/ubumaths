/**
 * Atelier — l'évaluation expliquée (« Comment ? » de `.évaluer`)
 *
 * Décisions de David (2026-10-14, PR 3 de `.évaluer`) :
 *
 * - **E2** : rédaction COLLÈGE de `pedagogical-arithmetic`, une opération
 *   par étape, pièges du négatif compris ((−3)² = (−3) × (−3) = 9).
 * - **E3** : la première étape est rédigée ICI, « On remplace $x$ par $-3$ » :
 *   l'expression où la valeur a pris la place de la lettre, négatifs entre
 *   parenthèses (`x^2` → `(−3)^2`), `f(−3) = …` pour une fonction de
 *   l'atelier. Le pipeline part de cette même expression.
 * - **Résumé** = ce remplacement + le résultat. Le pipeline ne distingue pas
 *   ses étapes par verbosité (mesuré : `detailed` et `summarized` ne
 *   diffèrent que par les explications) : le résumé est donc CONSTRUIT ici,
 *   deux étapes, la seconde écrivant `expression = valeur` d'un trait. Il
 *   n'est offert que si le détaillé a au moins deux opérations — sinon il
 *   dirait la même chose.
 * - **E4** : rien à montrer → pas d'étapes (`evaluate-steps-check.ts`).
 * - **E5** : une réponse décimale garde ses décimaux, écrits ici à point :
 *   la virgule est appliquée ensuite par `calcul.ts` (`resultWithDecimalComma`,
 *   sur la réponse ET les étapes) ; des étapes qui passent par des fractions
 *   (le pipeline récrit 1 + 0,5 en 3/2) sous une réponse décimale → pas
 *   d'étapes.
 * - **E6** (plusieurs lettres, `en a=1,5 ; b=2`) : toutes les lettres sont
 *   remplacées d'un coup, « On remplace $a$ par $1{,}5$ et $b$ par $2$ »,
 *   dans l'ordre tapé ; mêmes gardes. Une expression qui garde une lettre
 *   sans valeur tapée (une valeur posée dans l'atelier) n'a pas d'étapes.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** La ligne garde la réponse
 * du moteur, sans « Comment ? ». Aucun chemin ne jette.
 *
 * @module atelier/evaluate-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import { parse } from '$lib/mathAST/cli/core/pipeline';
import { listInFrench, typedValueNode } from '$lib/mathAST/cli/commands/eval.command';
import type { Assignment } from '$lib/mathAST/cli/core/variable-argument';
import { substitute } from '$lib/mathAST/eval';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { toLatex } from '$lib/mathAST/latex-generator';
import { findNodes, mapNode } from '$lib/mathAST/transforms';
import { isUnit } from '$lib/mathAST/guards';
import { fraction, parentheses } from '$lib/mathAST/factory';
import { hasDecimalLiteral } from '$lib/mathAST/tidy/decimal';
import { generatePedagogicalArithmeticSteps } from '$lib/mathAST/pedagogical-arithmetic/pipeline';
import { PedagogicalArithmeticRenderer } from '$lib/mathAST/pedagogical-arithmetic/renderer';
import {
	concludesEngineValue,
	hasFraction,
	hasStar,
	hasTranscendental,
	showsNothing
} from './evaluate-steps-check';

// =============================================================================
// Types
// =============================================================================

/** Ce que lit `.évaluer` : l'expression (noms déjà remplacés), les lettres et leurs valeurs. */
export interface EvaluationArguments {
	readonly expression: string;
	/** Dans l'ordre tapé ; au moins une. */
	readonly assignments: readonly Assignment[];
	/**
	 * L'appel écrit en tête du remplacement et du résultat, `f(-3)` pour une
	 * fonction de l'atelier ; `null` pour une expression.
	 */
	readonly callLatex: string | null;
}

/** Les étapes à déplier sous la ligne ; la réponse reste celle du moteur. */
export interface EvaluatedSteps {
	readonly steps: readonly RenderedStep[];
	/** Le remplacement, puis le résultat ; absent quand il ne dirait rien de moins. */
	readonly summary?: readonly RenderedStep[];
}

// =============================================================================
// Constantes
// =============================================================================

/** Les règles rédigées par l'atelier, hors du pipeline. */
const SUBSTITUTE_RULE = 'atelier-substitute';
const RESULT_RULE = 'atelier-evaluate-result';

/** Au moins deux opérations après le remplacement pour offrir un résumé. */
const MIN_OPERATIONS_FOR_SUMMARY = 2;

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Les étapes d'une évaluation — ou `null`.
 *
 * @param args - L'expression, la lettre et la valeur, telles qu'envoyées au moteur.
 * @param engineAnswer - L'arbre de la réponse du moteur (`result.ast`).
 * @param engineLatex - Son écriture (`result.latex`) : `\approx …` = arrondi.
 */
export function evaluateSteps(
	args: EvaluationArguments,
	engineAnswer: MathNode,
	engineLatex: string
): EvaluatedSteps | null {
	try {
		// Une réponse arrondie ne se conclut pas par des étapes exactes
		if (engineLatex.startsWith('\\approx')) return null;
		const parsed = parse(args.expression).ast;
		// Une fonction de l'atelier arrive entre parenthèses, `(x^2+1)` : sans
		// elles, `f(2) = 2^2 + 1`
		const expression = parsed?.type === 'delimiter' ? parsed.content : parsed;
		if (expression === undefined || args.assignments.length === 0) return null;
		// Les lettres de l'expression : exactement celles qui ont une valeur
		const letters = getVariables(expression);
		if (
			letters.size !== args.assignments.length ||
			args.assignments.some((assignment) => !letters.has(assignment.name))
		) {
			return null;
		}
		const values: { readonly name: string; readonly value: MathNode }[] = [];
		for (const assignment of args.assignments) {
			const typed = parse(assignment.value).ast;
			if (typed === undefined || getVariables(typed).size > 0) return null;
			values.push({ name: assignment.name, value: typedValueNode(typed) });
		}

		const replaced = crossProducts(
			substitute(
				slashesAsFractions(dropUselessParentheses(expression)),
				Object.fromEntries(values.map(({ name, value }) => [name, value]))
			)
		);
		const explained = explainedOperations(replaced, engineAnswer);
		if (explained === null) return null;
		const { operations, finalNode } = explained;

		const replacedLatex = toLatex(parenthesizeLeadingNegatives(replaced));
		const head = args.callLatex === null ? '' : `${args.callLatex} = `;
		const substitution: RenderedStep = {
			id: -1,
			rule: SUBSTITUTE_RULE,
			title: substitutionTitle(values),
			expressionLatex: `${head}${replacedLatex}`,
			schoolLevel: 'college'
		};
		const steps = [substitution, ...operations];
		if (hasStar(steps)) return null;
		if (operations.length < MIN_OPERATIONS_FOR_SUMMARY) return { steps };

		const conclusion: RenderedStep = {
			id: -2,
			rule: RESULT_RULE,
			title: 'On effectue les calculs',
			expressionLatex: `${args.callLatex ?? replacedLatex} = ${toLatex(finalNode)}`,
			schoolLevel: 'college'
		};
		return { steps, summary: [substitution, conclusion] };
	} catch {
		// Dénominateur nul (`PedagogicalArithmeticDivisionByZero`), règle qui
		// échoue, délai dépassé : repli sur la réponse du moteur
		return null;
	}
}

/**
 * Les étapes d'un calcul sans lettre (`2+3*4`), ligne de Calcul — ou `null`.
 *
 * Ce que montrait `/calc` avant son retrait (phase 0 de
 * `docs/wip/retrait-calc-progress.md`, validée par David le 2026-10-24) : les
 * opérations de `.évaluer`, sans « On remplace » (C2) ni résumé (Q2), qui
 * redirait la ligne. Une lettre (une valeur de l'atelier, `x`) → `null` (Q1).
 *
 * @param expression - Le calcul tel que tapé, virgules décimales déjà lues.
 * @param engineAnswer - L'arbre de la réponse du moteur.
 * @param engineLatex - Son écriture : `\approx …` = arrondi.
 */
export function calculationSteps(
	expression: string,
	engineAnswer: MathNode,
	engineLatex: string
): readonly RenderedStep[] | null {
	try {
		if (engineLatex.startsWith('\\approx')) return null;
		const parsed = parse(expression).ast;
		if (parsed === undefined || getVariables(parsed).size > 0) return null;
		// Un angle (`2*30°`) : les étapes concluaient en radians (revue du 2026-10-24)
		if (hasUnit(parsed) || hasUnit(engineAnswer)) return null;
		if (hasSlashChain(parsed)) return null;
		const typed = crossProducts(numberSlashesAsFractions(dropUselessParentheses(parsed)));
		const explained = explainedOperations(typed, engineAnswer);
		if (explained === null || hasStar(explained.operations)) return null;
		return explained.operations;
	} catch {
		// Dénominateur nul, règle qui échoue, délai dépassé : la ligne sans étapes (C5)
		return null;
	}
}

// =============================================================================
// Les opérations
// =============================================================================

/**
 * Les opérations collège de `pedagogical-arithmetic` sur une expression sans
 * lettre, seulement quand elles ont quelque chose à montrer (E4) et concluent
 * la réponse du moteur ; `null` sinon. Peut jeter (division par zéro).
 */
function explainedOperations(
	expression: MathNode,
	engineAnswer: MathNode
): { readonly operations: readonly RenderedStep[]; readonly finalNode: MathNode } | null {
	if (hasTranscendental(expression)) return null;

	const result = generatePedagogicalArithmeticSteps(expression, {
		schoolLevel: 'college',
		verbosity: 'detailed'
	});
	const operations = new PedagogicalArithmeticRenderer().renderAll(result.steps, {
		schoolLevel: 'college',
		verbosity: 'detailed'
	});
	if (showsNothing(operations)) return null;
	if (!concludesEngineValue(result.finalNode, engineAnswer)) return null;
	if (hasDecimalLiteral(engineAnswer) && hasFraction(operations)) return null;
	return { operations, finalNode: result.finalNode };
}

// =============================================================================
// Écriture du remplacement
// =============================================================================

/**
 * « On remplace $x$ par $3$ » ; plusieurs lettres (E6) : « On remplace $a$
 * par $1$ et $b$ par $2$ », « $a$ par $1$, $b$ par $2$ et $c$ par $3$ ».
 */
function substitutionTitle(
	values: readonly { readonly name: string; readonly value: MathNode }[]
): string {
	return `On remplace ${listInFrench(values.map(({ name, value }) => `$${name}$ par $${toLatex(value)}$`))}`;
}

/**
 * Une division tapée `x/4` écrite en fraction : le remplacement s'écrivait
 * `2 / 4` (revue du 2026-10-14). Les parenthèses tapées autour du numérateur
 * ou du dénominateur (`(x+1)/4`) ne servent plus dans une fraction.
 */
function slashesAsFractions(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'division' && n.displayStyle !== 'fraction'
			? fraction(ungrouped(n.numerator), ungrouped(n.denominator))
			: n
	);
}

/**
 * Sur une ligne de Calcul, seule une division de deux entiers (`1/2`) s'écrit
 * en fraction ; `2:0,5` reste `2 ÷ 0,5`, jamais une fraction à virgule.
 */
function numberSlashesAsFractions(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'division' &&
		n.displayStyle !== 'fraction' &&
		isInteger(n.numerator) &&
		isInteger(n.denominator)
			? fraction(n.numerator, n.denominator)
			: n
	);
}

function isInteger(node: MathNode): boolean {
	return node.type === 'number' && !node.value.includes('.');
}

/** Une unité, un angle en degrés compris (`30°`). */
function hasUnit(node: MathNode): boolean {
	return findNodes(node, isUnit).length > 0;
}

/**
 * `3/4*2/9` se lit `((3/4)·2)/9` : des étapes écriraient `× 2 ÷ 9`, pas le
 * produit de deux fractions que l'élève a tapé (C3, revue du 2026-10-24).
 * Une division dont le numérateur est un produit ou un quotient sans
 * parenthèses → pas d'étapes.
 */
function hasSlashChain(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) =>
				n.type === 'division' &&
				n.displayStyle !== 'fraction' &&
				(n.numerator.type === 'multiplication' || n.numerator.type === 'division')
		).length > 0
	);
}

/** Le contenu d'une parenthèse de regroupement, sinon le nœud. */
function ungrouped(node: MathNode): MathNode {
	return node.type === 'delimiter' && node.semantic === 'grouping' ? node.content : node;
}

/**
 * Le produit d'un nombre écrit `\times` : `3x` en x = −2 s'imprimerait
 * `3 * (-2)` (mesuré : une multiplication implicite dont le facteur de droite
 * devient un nombre sort en `*`), `2x^2` en `2 (-1)^2`. Un produit devant une
 * lettre, une racine, des parenthèses (`2\pi`, `2\sqrt{9}`) reste implicite.
 */
function crossProducts(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'multiplication' && n.displayStyle !== 'cross' && startsWithNumber(n.right)
			? { ...n, displayStyle: 'cross' }
			: n
	);
}

/** L'écriture de ce facteur commence-t-elle par un nombre (ou son signe) ? */
function startsWithNumber(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
		case 'opposite':
			return true;
		case 'superscript':
			return startsWithNumber(node.base);
		case 'multiplication':
			return startsWithNumber(node.left);
		case 'division':
			// `2\frac{1}{2}` se lirait « deux et demi »
			return true;
		default:
			return false;
	}
}

/**
 * Un négatif en tête de produit, entre parenthèses (E3) : `x(x-1)` en −2
 * s'écrivait `-2(-2-1)`, et `(-2)` n'apparaissait qu'à l'étape suivante.
 * Affichage seul : le pipeline remet lui-même ces parenthèses.
 */
function parenthesizeLeadingNegatives(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'multiplication' && n.left.type === 'opposite'
			? { ...n, left: parentheses(n.left) }
			: n
	);
}

/**
 * Les parenthèses qu'ajoute l'atelier autour d'une fonction citée
 * (`g(x)+1` → `(x^2)+1`) : sans elles, `2^2 + 1`, que le pipeline développe
 * (`2 × 2`) au lieu de « On effectue les calculs entre parenthèses ».
 * Retirées seulement autour d'une puissance, d'un nombre, d'une lettre ou
 * d'une fonction (et d'un produit dans une somme) — jamais autour d'un opposé
 * ni d'une somme, ni sur la base d'une puissance.
 */
function dropUselessParentheses(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		switch (n.type) {
			case 'addition':
			case 'subtraction':
				return { ...n, left: unwrap(n.left, true), right: unwrap(n.right, true) };
			case 'multiplication':
				return { ...n, left: unwrap(n.left, false), right: unwrap(n.right, false) };
			default:
				return n;
		}
	});
}

/** Le contenu d'une parenthèse qui ne sert à rien à cette place, sinon le nœud. */
function unwrap(node: MathNode, inSum: boolean): MathNode {
	if (node.type !== 'delimiter' || node.semantic !== 'grouping') return node;
	const content = node.content;
	switch (content.type) {
		case 'superscript':
		case 'number':
		case 'variable':
		case 'constant':
		case 'function':
			return content;
		case 'multiplication':
		case 'division':
			return inSum ? content : node;
		default:
			return node;
	}
}
