/**
 * Atelier — développer une expression
 *
 * ⚠️ **Pas de commande de développement dans le moteur** : son registre n'a
 * pas d'`expand`. Comme `.factoriser`, `.développer` est servie par l'atelier,
 * avec l'intention `developper` de `pedagogical-simplify` — et sans moteur
 * derrière, il n'y a pas de repli : le cas « rien à développer » doit se DIRE.
 *
 * Développer, c'est aussi réduire (la consigne scolaire « développer et
 * réduire », décision de David du 2026-09-21).
 *
 * **La réponse et le « Comment ? »** viennent d'`explainExpansion`
 * (`mathAST/pedagogical-simplify/expand-explained.ts`), la même fonction que les
 * corrections d'exercices générées : une intention, une seule rédaction
 * (décision de David du 2026-10-14, option B). Les étapes (section E de la
 * phase 0 `atelier-developper-phase0.md`) partent de l'expression écrite et
 * finissent sur la réponse de la ligne ; la trace de l'intention `developper`
 * n'est pas montrée. Ce que la rédaction ne sait pas expliquer n'a pas
 * d'étapes ; la réponse reste. Ici, ce qui est propre à l'atelier : les refus,
 * les messages, le plafond de termes, le mode décimal.
 *
 * @module atelier/expand
 */

import type { MathNode, RelationNode } from '$lib/mathAST/types';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
// `unwrapGrouping` : sans ce retrait, une équation ou une liste entre parenthèses
// (`f` substitué en `((x+1)^2)`) ne serait pas reconnue
import {
	explainExpansion,
	unwrapGrouping
} from '$lib/mathAST/pedagogical-simplify/expand-explained';
import { isMonomial } from '$lib/mathAST/pedagogical-simplify/expand-order';
import { toLatex } from '$lib/mathAST/latex-generator';
import { toCustom } from '$lib/mathAST/custom-generator';
import { flattenSumShallow } from '$lib/mathAST/flatten';
import { findNodes } from '$lib/mathAST/transforms';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { astOf } from './parse';
import { summaryOf } from './steps-summary';

// =============================================================================
// Types
// =============================================================================

/** Le mode de Calcul : en décimal, un coefficient à écriture décimale finie s'écrit en décimal. */
export type ExpandMode = 'exact' | 'decimal';

/**
 * Ce qu'une demande de développement produit — trois issues, comme
 * `.factoriser` : la réponse, « rien à développer » (une réponse, pas une
 * erreur), ou un refus.
 */
export type ExpandedOutcome =
	| {
			readonly kind: 'developpee';
			/** La forme développée et réduite, en LaTeX — ce que la ligne affiche. */
			readonly answer: string;
			/** La même en syntaxe texte (historique, export). */
			readonly text: string;
			/** Les étapes du « Comment ? », absentes quand on ne sait pas les rédiger. */
			readonly steps?: readonly RenderedStep[];
			/** Les mêmes en version résumée, absente si elle ne dit rien de moins. */
			readonly summary?: readonly RenderedStep[];
	  }
	| { readonly kind: 'inchangee'; readonly message: string }
	| { readonly kind: 'illisible'; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/** L'exemple que le catalogue montre et que les refus citent. */
export const EXPAND_EXAMPLE = '.développer (2x-1)(x+3)';

/** Les relations d'ordre : une inéquation, pas une équation. */
const ORDER_RELATIONS: ReadonlySet<RelationNode['relation']> = new Set(['<', '>', '<=', '>=']);

/**
 * Au-delà, le calcul figerait la page : il est synchrone (revue, mesuré le
 * 2026-10-14 : `(x+1)^2000` 5 s, `(x+y+z+1)^25` 15 s ; `(x+1)^100` 10 ms).
 */
const MAX_TERMS = 500;

// =============================================================================
// Fonctions — lecture
// =============================================================================

/** La forme texte d'un arbre, ou sa forme LaTeX si le générateur refuse. */
function plainFormOf(node: MathNode): string {
	try {
		return toCustom(node);
	} catch {
		return toLatex(node);
	}
}

/** Une somme de monômes : la forme développée par excellence. */
function isPolynomial(node: MathNode): boolean {
	return flattenSumShallow(node).every(({ term }) => isMonomial(term));
}

/** Une puissance d'une somme dont l'exposant contient une lettre : `(x+1)^n`. */
function hasSymbolicPowerOfSum(node: MathNode): boolean {
	return (
		findNodes(node, (n) => {
			if (n.type !== 'superscript') return false;
			const base = unwrapGrouping(n.base);
			const isSum = base.type === 'addition' || base.type === 'subtraction';
			return isSum && getVariables(n.superscript).size > 0;
		}).length > 0
	);
}

/**
 * Ce qu'on dit quand rien n'a bougé — trois cas, trois phrases (phase 0, C).
 *
 * L'expression citée est celle que l'élève a TAPÉE : `toCustom` écrivait
 * `1/2x+3` « {1/2}x+3 », accolades comprises (revue).
 */
function unchangedMessage(node: MathNode, typed: string): string {
	if (hasSymbolicPowerOfSum(node)) {
		return `Je ne sais pas développer « ${typed} » : l’exposant n’est pas un nombre.`;
	}
	if (isPolynomial(node)) return `« ${typed} » est déjà développée et réduite.`;
	return `Il n’y a rien à développer dans « ${typed} ».`;
}

/**
 * Le nombre de termes que peut avoir un développement : (t termes)ⁿ en a au
 * plus C(n + t − 1, t − 1). Seules les puissances comptent — un produit de
 * sommes d'une même lettre se réduit bien plus que ce décompte ne le dit.
 */
function termEstimate(node: MathNode): number {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
			return flattenSumShallow(node).reduce((total, { term }) => total + termEstimate(term), 0);
		case 'delimiter':
			return termEstimate(node.content);
		case 'multiplication':
			return termEstimate(node.left) * termEstimate(node.right);
		case 'superscript': {
			const n = node.superscript.type === 'number' ? Number(node.superscript.value) : NaN;
			if (!Number.isInteger(n) || n < 2) return 1;
			const t = termEstimate(node.base);
			// C(n + t − 1, t − 1), arrêté dès qu'il dépasse le plafond
			let count = 1;
			for (let i = 1; i < t && count <= MAX_TERMS; i++) count = (count * (n + i)) / i;
			return count;
		}
		default:
			return 1;
	}
}

/** Une puissance dont le développement dépasserait le plafond. */
function isTooLong(node: MathNode): boolean {
	return findNodes(node, (n) => n.type === 'superscript' && termEstimate(n) > MAX_TERMS).length > 0;
}

/** Le refus d'une relation : une équation se résout, elle ne se développe pas (phase 0, D). */
function relationRefusal(relation: RelationNode, typed: string): string {
	if (relation.relation === '=') {
		return `On développe une expression, pas une équation. Pour la résoudre : .résoudre ${typed}`;
	}
	if (ORDER_RELATIONS.has(relation.relation)) {
		return `On développe une expression, pas une inéquation. Pour la résoudre : .résoudre ${typed}`;
	}
	return notExpandable(typed);
}

/** Le refus de tout ce qui n'est pas une expression à développer (phase 0, D). */
function notExpandable(typed: string): string {
	return `« ${typed} » n’est pas une expression qu’on sait développer.`;
}

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Développer et réduire une expression, et dire ce qui s'est passé.
 *
 * ⚠️ Aucun chemin ne jette — une exception remonterait jusqu'à `desk.submit`,
 * qui n'afficherait alors AUCUNE ligne.
 *
 * @param expression - L'expression, noms d'objets DÉJÀ substitués (§6 bis)
 * @param mode - Le mode de Calcul
 * @param typed - L'expression telle que l'élève l'a tapée, citée par les refus
 */
export function expandExpression(
	expression: string,
	mode: ExpandMode,
	typed: string = expression.trim()
): ExpandedOutcome {
	if (expression.trim() === '') {
		return {
			kind: 'illisible',
			message: `Il manque l’expression à développer. Par exemple : ${EXPAND_EXAMPLE}`
		};
	}

	try {
		const parsed = astOf(expression, 'text');
		// Illisible, ou une liste de l'atelier (`L` → `1 ; 2 ; 3`) : le même refus
		if (parsed === null) return { kind: 'illisible', message: notExpandable(typed) };
		const node = unwrapGrouping(parsed);
		if (node.type === 'relation')
			return { kind: 'illisible', message: relationRefusal(node, typed) };
		// Une liste, un intervalle, un ensemble, une matrice : rien d'une expression
		if (node.type === 'delimiter' || node.type === 'matrix') {
			return { kind: 'illisible', message: notExpandable(typed) };
		}

		if (isTooLong(node)) {
			return {
				kind: 'inchangee',
				message: `Je ne sais pas développer « ${typed} » ici : le calcul serait trop long.`
			};
		}

		// La réponse s'écrit comme l'élève a écrit, comme `.limite` (décision de
		// David du 2026-10-06, étendue ici le 2026-10-14) : un décimal tapé, ou le
		// mode décimal, donne des décimaux — `(0,5x+1)²` → `0,25x² + x + 1`
		const explained = explainExpansion(node, {
			schoolLevel: 'lycee',
			decimal: mode === 'decimal'
		});
		if (explained.kind === 'unchanged') {
			return { kind: 'inchangee', message: unchangedMessage(node, typed) };
		}
		// Jamais une réponse mal écrite : « je ne sais pas » vaut mieux que `2 x 1`
		if (explained.kind === 'unfinished') {
			return { kind: 'inchangee', message: `Je ne sais pas développer « ${typed} ».` };
		}
		const answer = toLatex(explained.answer);
		if (answer.trim() === '') {
			return { kind: 'inchangee', message: unchangedMessage(node, typed) };
		}
		const text = plainFormOf(explained.answer);
		// Sans rédaction, la réponse reste, sans « Comment ? »
		if (explained.steps === null) return { kind: 'developpee', answer, text };
		const steps = explained.steps.detailed;
		// La version résumée, si elle dit quelque chose de moins
		const summary = summaryOf(steps, explained.steps.summarized);
		return { kind: 'developpee', answer, text, steps, ...(summary !== undefined && { summary }) };
	} catch {
		// `PedagogicalSimplifyNotImplemented` (matrice, inéquation…), ou un
		// générateur qui refuse ce qu'on lui donne
		return { kind: 'illisible', message: notExpandable(typed) };
	}
}
