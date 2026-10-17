/**
 * Atelier — la limite expliquée (« Comment ? » de `.limite`)
 *
 * Décisions de David (2026-10-14, PR 3 de `.limite`) :
 *
 * - Les étapes sont celles de `generatePedagogicalLimitSteps`, au niveau
 *   LYCÉE (factorisation, conjugué, terme prépondérant, limites de
 *   référence, côtés, gendarmes) — jamais `dispatchPedagogicalLimit`, qui
 *   lit une syntaxe maison.
 * - **Garde de concordance** (`limit-steps-check.ts`) : les étapes ne
 *   s'affichent que si leur conclusion est la réponse de la ligne.
 * - **Rien à montrer** (comme E4 de `.évaluer`) : une substitution directe
 *   seule → pas de « Comment ? ».
 * - **Résumé construit** : la technique et la conclusion — ni l'annonce,
 *   ni la forme indéterminée (le résumé du renderer la masque, décision de
 *   David du 2026-10-12), ni les limites des termes, ni la limite d'une
 *   somme / d'un produit / d'un quotient, ni la substitution qui suit une
 *   simplification ; sans explications.
 * - Une fonction ou une suite de l'atelier citée seule garde son nom :
 *   l'annonce écrit $\lim g(x) = \lim \dfrac{x^2-1}{x-1}$, la conclusion
 *   $\lim g(x) = 2$ ; les étapes parlent de SA lettre (`f(t) = 1/t` : t).
 *
 * - Fonction en escalier (`floor`, `ceil`, `round`, `sign`) : pas de
 *   « Comment ? » (V60) — les étapes substitueraient sans voir le saut.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** La ligne garde la
 * réponse de `.limite`, sans « Comment ? ». Aucun chemin ne jette.
 *
 * @module atelier/limit-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import type { LimitDirection } from '$lib/mathAST/limits/types';
import type {
	PedagogicalLimitRule,
	PedagogicalLimitStep
} from '$lib/mathAST/pedagogical-limits/types';
import { generatePedagogicalLimitSteps } from '$lib/mathAST/pedagogical-limits/pipeline';
import { containsPiecewiseFunction } from '$lib/mathAST/limits/piecewise';
import { PedagogicalLimitRenderer } from '$lib/mathAST/pedagogical-limits/renderer';
import { parse } from '$lib/mathAST/cli/core/pipeline';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { fraction, variable as variableNode } from '$lib/mathAST/factory';
import { transformAST } from '$lib/mathAST/visitor';
import { toLatex } from '$lib/mathAST/latex-generator';
import { concludesLimitAnswer, showsNothing, type LimitAnswer } from './limit-steps-check';
import { hasStar } from './evaluate-steps-check';
import { summaryOf } from './steps-summary';

// =============================================================================
// Types
// =============================================================================

/** Ce que `.limite` a calculé : l'expression, sa lettre, le point, le côté. */
export interface LimitQuestion {
	/** L'expression calculée (noms de l'atelier remplacés). */
	readonly expression: MathNode;
	/** La lettre du calcul : x pour une fonction de l'atelier (rangée en x). */
	readonly variable: string;
	/** La lettre de l'élève, celle des étapes : t pour f(t) = 1/t. */
	readonly letter: string;
	readonly approach: MathNode;
	readonly direction: LimitDirection;
	/** `g(x)`, `u_n` : la fonction ou la suite citée seule, sinon `null`. */
	readonly subject: string | null;
}

/** Les étapes à déplier sous la ligne ; la réponse reste celle de `.limite`. */
export interface LimitSteps {
	readonly steps: readonly RenderedStep[];
	/** La forme, la technique, la conclusion ; absent quand il ne dirait rien de moins. */
	readonly summary?: readonly RenderedStep[];
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * Absentes du résumé : l'annonce, la forme indéterminée (comme le résumé du
 * renderer, décision de David du 2026-10-12), les calculs de limites
 * intermédiaires, la substitution qui suit une simplification.
 */
const HIDDEN_IN_SUMMARY: ReadonlySet<PedagogicalLimitRule> = new Set([
	'identify-limit',
	'detect-indeterminate-form',
	'limits-of-terms',
	'apply-sum',
	'apply-product',
	'apply-quotient',
	'apply-direct-substitution'
]);

/** Les conclusions, réécrites sur le nom de la fonction citée. */
const CONCLUSION_RULES: ReadonlySet<PedagogicalLimitRule> = new Set([
	'conclude',
	'conclude-infinite',
	'conclude-does-not-exist'
]);

/**
 * Les gendarmes : le moteur juge l'encadrement sur des valeurs numériques
 * (`SQUEEZE_PROBES`) et n'en rend pas les bornes — « Encadrement de
 * l'expression » n'écrirait aucune inégalité. Pas de « Comment ? » tant
 * que les bornes ne sont pas rendues (revue du 2026-10-14).
 */
const SQUEEZE_RULES: ReadonlySet<PedagogicalLimitRule> = new Set([
	'identify-bounds',
	'apply-squeeze'
]);

/** Le sujet de l'annonce, que remplace le nom d'une fonction citée. */
const EXPRESSION_WORDS = "de l'expression";

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Les étapes d'une limite — ou `null`.
 *
 * @param question - Ce que `.limite` a calculé.
 * @param answer - Sa réponse, telle que la ligne l'écrit.
 */
export function limitSteps(question: LimitQuestion, answer: LimitAnswer): LimitSteps | null {
	try {
		const expression = studentExpression(question);
		if (expression === null) return null;
		// V60 : le moteur pédagogique ne voit pas les sauts de floor, sign… —
		// sa conclusion pourrait tomber juste sur un raisonnement faux
		if (containsPiecewiseFunction(expression)) return null;
		const result = generatePedagogicalLimitSteps(expression, {
			variable: question.letter,
			approach: question.approach,
			direction: question.direction,
			schoolLevel: 'lycee'
		});
		if (!concludesLimitAnswer(result, answer)) return null;
		if (showsNothing(result.steps)) return null;
		if (hasUnwrittenBounds(result.steps)) return null;

		const subject = subjectNode(question.subject);
		const raw =
			subject === null ? result.steps : result.steps.map((s) => named(s, subject, expression));
		const renderer = new PedagogicalLimitRenderer();
		const sided = sidedPoint(question.approach);
		const detailed = renderer
			.renderAll(raw, { schoolLevel: 'lycee', verbosity: 'detailed' })
			.map((step) => sided(namedTitle(step, question.subject)));
		if (hasStar(detailed)) return null;
		const summarized = raw
			.filter((s) => !HIDDEN_IN_SUMMARY.has(s.rule))
			.map((s) => sided(renderer.render(s, { schoolLevel: 'lycee', verbosity: 'summarized' })));
		const summary = summaryOf(detailed, summarized);
		return summary === undefined ? { steps: detailed } : { steps: detailed, summary };
	} catch {
		// `PedagogicalLimitNotImplemented` (aucune stratégie), règle qui
		// échoue : repli sur la réponse de `.limite`
		return null;
	}
}

// =============================================================================
// L'expression des étapes
// =============================================================================

/**
 * L'expression écrite comme l'élève la lit : dans SA lettre, les divisions
 * en fractions sans les parenthèses tapées pour la barre (`(x^2-1)/(x-1)`
 * s'écrivait `(x^2 - 1) / (x - 1)`). `null` quand la lettre de l'élève est
 * déjà prise par un paramètre.
 */
function studentExpression(question: LimitQuestion): MathNode | null {
	let node = question.expression;
	// Une fonction de l'atelier arrive entre parenthèses, `(1/x)`
	while (node.type === 'delimiter' && node.semantic === 'grouping') node = node.content;
	if (question.letter !== question.variable) {
		if (getVariables(node).has(question.letter)) return null;
		node = transformAST(node, {
			leaveVariable: (n) =>
				n.name === question.variable ? variableNode(question.letter) : undefined
		});
	}
	// Déjà en fraction ou non, les parenthèses tapées pour la barre tombent :
	// `\\dfrac{(\\sqrt{x+4}-2)}{x}` (revue du 2026-10-14)
	return transformAST(node, {
		leaveDivision: (n) => fraction(ungrouped(n.numerator), ungrouped(n.denominator))
	});
}

/** Une étape des gendarmes, sous-étapes comprises : bornes non écrites. */
function hasUnwrittenBounds(steps: readonly PedagogicalLimitStep[]): boolean {
	return steps.some((s) => SQUEEZE_RULES.has(s.rule) || hasUnwrittenBounds(s.subSteps ?? []));
}

/**
 * Un point qui n'est pas un nombre seul, avec un côté, s'écrit comme sur la
 * ligne de réponse : `{\\tfrac{1}{2}}^+`, jamais `\\dfrac{1}{2}^+` (lu ½ⁿ).
 * Le renderer colle le côté au point ; on réécrit ses titres, explications
 * et formules.
 */
function sidedPoint(approach: MathNode): (step: RenderedStep) => RenderedStep {
	const bare = approach.type === 'opposite' ? approach.operand : approach;
	if (bare.type === 'number' || bare.type === 'constant' || bare.type === 'infinity') {
		return (step) => step;
	}
	const latex = toLatex(approach);
	const grouped = `{${latex.replace(/\\dfrac/g, '\\tfrac')}}`;
	const fix = (text: string): string =>
		text.split(`${latex}^+`).join(`${grouped}^+`).split(`${latex}^-`).join(`${grouped}^-`);
	const rewrite = (step: RenderedStep): RenderedStep => ({
		...step,
		title: fix(step.title),
		...(step.explanation !== undefined && { explanation: fix(step.explanation) }),
		...(step.expressionLatex !== undefined && { expressionLatex: fix(step.expressionLatex) }),
		...(step.subSteps !== undefined && { subSteps: step.subSteps.map(rewrite) })
	});
	return rewrite;
}

/** Le contenu d'une parenthèse de regroupement, sinon le nœud. */
function ungrouped(node: MathNode): MathNode {
	return node.type === 'delimiter' && node.semantic === 'grouping' ? node.content : node;
}

// =============================================================================
// Le nom d'une fonction citée
// =============================================================================

/** `g(x)`, `u_n` en arbre ; `null` sans sujet ou s'il ne se lit pas. */
function subjectNode(subject: string | null): MathNode | null {
	if (subject === null) return null;
	return parse(subject).ast ?? null;
}

/**
 * L'annonce part du nom (`\lim g(x) = \lim \dfrac{x^2-1}{x-1}`), la
 * conclusion y revient (`\lim g(x) = 2`).
 */
function named(
	step: PedagogicalLimitStep,
	subject: MathNode,
	expression: MathNode
): PedagogicalLimitStep {
	if (step.rule === 'identify-limit') return { ...step, before: subject, after: expression };
	if (CONCLUSION_RULES.has(step.rule)) return { ...step, before: subject };
	return step;
}

/** « On veut calculer la limite de $g(x)$ … » au lieu de « de l'expression ». */
function namedTitle(step: RenderedStep, subject: string | null): RenderedStep {
	if (subject === null || step.rule !== 'identify-limit') return step;
	return { ...step, title: step.title.replace(EXPRESSION_WORDS, `de $${subject}$`) };
}
