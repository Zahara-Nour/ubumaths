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
 * ⚠️ **La réponse seule, pour l'instant.** Les étapes que rend l'intention
 * `developper` ne sont pas montrables — mesuré le 2026-10-14 : produits collés
 * (`2 x 1` s'affiche « 2x1 »), la même ligne jusqu'à 13 fois, distribution
 * cachée sous « On regroupe les termes semblables ». Pas de « Comment ? » tant
 * qu'elles ne sont pas rédigées (phase 0 `atelier-developper-phase0.md`, PR 2).
 *
 * @module atelier/expand
 */

import type { MathNode, RelationNode } from '$lib/mathAST/types';
import { generatePedagogicalSimplifySteps } from '$lib/mathAST/pedagogical-simplify/pipeline';
import { toLatex } from '$lib/mathAST/latex-generator';
import { toCustom } from '$lib/mathAST/custom-generator';
import { add, number, opposite, subtract } from '$lib/mathAST/factory';
import { flattenProductShallow, flattenSumShallow } from '$lib/mathAST/flatten';
import { findNodes, mapNode } from '$lib/mathAST/transforms';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { decimalString, hasDecimalLiteral } from '$lib/mathAST/tidy/decimal';
import { nodesEqual } from '$lib/mathAST/normal/hash';
import { astOf } from './parse';

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
	  }
	| { readonly kind: 'inchangee'; readonly message: string }
	| { readonly kind: 'illisible'; readonly message: string };

/** Un terme d'une somme, son signe à part. */
type SignedTerm = { readonly sign: '+' | '-'; readonly term: MathNode };

// =============================================================================
// Constantes
// =============================================================================

/** L'exemple que le catalogue montre et que les refus citent. */
export const EXPAND_EXAMPLE = '.développer (2x-1)(x+3)';

/** Les relations d'ordre : une inéquation, pas une équation. */
const ORDER_RELATIONS: ReadonlySet<RelationNode['relation']> = new Set(['<', '>', '<=', '>=']);

/** La variable dont les puissances décroissantes rangent les termes (phase 0, B). */
const MAIN_VARIABLE = 'x';

// =============================================================================
// Fonctions — lecture
// =============================================================================

/**
 * Retirer les parenthèses qui enveloppent toute l'expression.
 *
 * La substitution des noms écrit `f` en `((x+1)^2)` : sans ce retrait, la
 * comparaison avant/après verrait une différence qui n'en est pas une. Seules
 * les parenthèses de GROUPEMENT : `[0;1]` est un intervalle.
 */
function unwrapGrouping(node: MathNode): MathNode {
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

/** La forme texte d'un arbre, ou sa forme LaTeX si le générateur refuse. */
function plainFormOf(node: MathNode): string {
	try {
		return toCustom(node);
	} catch {
		return toLatex(node);
	}
}

/**
 * Un monôme : nombres, constantes, lettres et puissances entières naturelles
 * de lettres, multipliés entre eux (`3x`, `2ab`, `x^2`).
 */
function isMonomial(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
		case 'constant':
		case 'variable':
		case 'greek':
			return true;
		case 'opposite':
		case 'positive':
			return isMonomial(node.operand);
		case 'multiplication':
			return isMonomial(node.left) && isMonomial(node.right);
		case 'superscript':
			return (
				(node.base.type === 'variable' || node.base.type === 'greek') &&
				node.superscript.type === 'number' &&
				/^\d+$/.test(node.superscript.value)
			);
		default:
			return false;
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

/** Ce qu'on dit quand rien n'a bougé — trois cas, trois phrases (phase 0, C). */
function unchangedMessage(node: MathNode): string {
	const written = plainFormOf(node);
	if (hasSymbolicPowerOfSum(node)) {
		return `Je ne sais pas développer « ${written} » : l’exposant n’est pas un nombre.`;
	}
	if (isPolynomial(node)) return `« ${written} » est déjà développée et réduite.`;
	return `Il n’y a rien à développer dans « ${written} ».`;
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
// Fonctions — ordre des termes
// =============================================================================

/**
 * Les exposants des lettres d'un terme : `2ab²` → { a: 1, b: 2 }.
 *
 * Un facteur qui n'est pas une puissance entière d'une lettre (`eˣ`, `√x`,
 * `sin x`) ne compte pas : il n'a pas de degré à comparer.
 */
function exponentsOf(term: MathNode): ReadonlyMap<string, number> {
	const exponents = new Map<string, number>();
	const visit = (node: MathNode) => {
		switch (node.type) {
			case 'variable':
				exponents.set(node.name, (exponents.get(node.name) ?? 0) + 1);
				return;
			case 'superscript':
				if (
					node.base.type === 'variable' &&
					node.superscript.type === 'number' &&
					/^\d+$/.test(node.superscript.value)
				) {
					const name = node.base.name;
					exponents.set(name, (exponents.get(name) ?? 0) + Number(node.superscript.value));
				}
				return;
			case 'opposite':
			case 'positive':
				visit(node.operand);
				return;
			case 'division':
				// `\dfrac{x^2}{4}` : le degré se lit au numérateur
				visit(node.numerator);
				return;
			case 'multiplication':
				for (const { factor } of flattenProductShallow(node)) visit(factor);
				return;
			default:
				return;
		}
	};
	visit(term);
	return exponents;
}

/**
 * Comparer deux termes : puissances décroissantes de x d'abord, les autres
 * lettres traitées comme des coefficients ; puis l'ordre alphabétique, chaque
 * lettre à sa plus haute puissance d'abord (a² + 2ab + b²). Égalité : 0, et le
 * tri stable garde l'ordre du module.
 */
function compareTerms(
	left: ReadonlyMap<string, number>,
	right: ReadonlyMap<string, number>,
	letters: readonly string[]
): number {
	for (const letter of letters) {
		const difference = (right.get(letter) ?? 0) - (left.get(letter) ?? 0);
		if (difference !== 0) return difference;
	}
	return 0;
}

/** Une somme dans l'ordre du tableau B, ou la même somme si l'ordre est déjà le bon. */
function orderSum(node: MathNode): MathNode {
	if (node.type !== 'addition' && node.type !== 'subtraction') return node;
	const terms: readonly SignedTerm[] = flattenSumShallow(node);
	const exponents = terms.map(({ term }) => exponentsOf(term));
	const others = [...new Set(exponents.flatMap((e) => [...e.keys()]))]
		.filter((letter) => letter !== MAIN_VARIABLE)
		.sort();
	const letters = exponents.some((e) => e.has(MAIN_VARIABLE)) ? [MAIN_VARIABLE, ...others] : others;

	const order = terms
		.map((_, index) => index)
		.sort((a, b) => compareTerms(exponents[a], exponents[b], letters) || a - b);
	// ⚠️ Déjà dans l'ordre : on rend la somme du module telle quelle, sans la
	// reconstruire — son écriture (`-2 x + 11`) ne doit pas changer pour rien
	if (order.every((position, index) => position === index)) return node;

	const sorted = order.map((index) => terms[index]);
	const [first, ...rest] = sorted;
	let sum: MathNode = first.sign === '-' ? opposite(first.term) : first.term;
	for (const { sign, term } of rest) {
		// `-2ab` déplacé au milieu s'écrit `- 2ab`, pas `+ (-2ab)`
		const magnitude = magnitudeOfNegative(term);
		const negative = (sign === '-') !== (magnitude !== null);
		const written = magnitude ?? term;
		sum = negative ? subtract(sum, written) : add(sum, written);
	}
	return sum;
}

/**
 * La valeur absolue d'un terme écrit avec un signe moins en tête (`-2ab`,
 * `-x`, `-\dfrac{1}{4}x`), ou `null` s'il n'en a pas.
 */
function magnitudeOfNegative(term: MathNode): MathNode | null {
	switch (term.type) {
		case 'opposite':
			return term.operand;
		case 'number':
			return term.value.startsWith('-') ? number(term.value.slice(1)) : null;
		case 'multiplication': {
			const left = magnitudeOfNegative(term.left);
			if (left === null) return null;
			// `-1 · x` : le 1 ne s'écrit pas
			if (left.type === 'number' && left.value === '1') return term.right;
			return { ...term, left };
		}
		case 'division': {
			const numerator = magnitudeOfNegative(term.numerator);
			return numerator === null ? null : { ...term, numerator };
		}
		default:
			return null;
	}
}

// =============================================================================
// Fonctions — mode décimal
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
 * En décimal (mode décimal, ou un décimal tapé), une fraction de deux entiers
 * à écriture décimale finie s'écrit en décimal (`1/4` → `0.25`). Les autres restent des fractions :
 * arrondir `1/9` ferait d'une égalité une approximation.
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

		const result = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		// Rien n'a bougé : aucune étape, ou des étapes qui rendent l'expression
		// de départ (`1/(x+1)` : « On réduit la fraction », sans rien réduire)
		if (
			result.steps.length === 0 ||
			nodesEqual(withoutGrouping(result.result), withoutGrouping(node))
		) {
			return { kind: 'inchangee', message: unchangedMessage(node) };
		}

		const ordered = mapNode(result.result, orderSum);
		// La réponse s'écrit comme l'élève a écrit, comme `.limite` (décision de
		// David du 2026-10-06, étendue ici le 2026-10-14) : un décimal tapé, ou le
		// mode décimal, donne des décimaux — `(0,5x+1)²` → `0,25x² + x + 1`
		const decimal = mode === 'decimal' || hasDecimalLiteral(node);
		const written = decimal ? mapNode(ordered, decimalFraction) : ordered;
		const answer = toLatex(written);
		if (answer.trim() === '') {
			return { kind: 'inchangee', message: unchangedMessage(node) };
		}
		return { kind: 'developpee', answer, text: plainFormOf(written) };
	} catch {
		// `PedagogicalSimplifyNotImplemented` (matrice, inéquation…), ou un
		// générateur qui refuse ce qu'on lui donne
		return { kind: 'illisible', message: notExpandable(typed) };
	}
}
