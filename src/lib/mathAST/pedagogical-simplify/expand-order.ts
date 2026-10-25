/**
 * Pedagogical Simplify — l'ordre du manuel pour une forme développée
 *
 * Puissances décroissantes de x, les autres lettres traitées comme des
 * coefficients ; sans x, l'ordre alphabétique, chaque lettre à sa plus haute
 * puissance d'abord (a² + 2ab + b², ax + ab) — tableau B de la phase 0
 * `docs/archive/wip/atelier-developper-phase0.md`, décision de David du 2026-10-14.
 *
 * ⚠️ **Ce n'est PAS le résultat de l'intention `developper`**, qui garde l'ordre
 * de `normalize` (`2ab + a² + b²`) : il sert à l'intégration et à la stratégie 6
 * de `factoriser`, et le panel le fige. L'ordre s'applique là où l'élève LIT la
 * forme développée : la réponse de `.développer` et les images de ses étapes
 * (`expand-steps.ts`). Il vit ici, et non dans l'atelier, parce que les étapes
 * l'emploient aussi (une parenthèse réduite avant d'être distribuée).
 *
 * @module mathAST/pedagogical-simplify/expand-order
 */

import type { MathNode } from '../types';
import { toLatex } from '../latex-generator';
import { add, divide, multiply, number, opposite, subtract } from '../factory';
import { flattenProductShallow, flattenSumShallow, type SignedTerm } from '../flatten';
import { mapNode } from '../transforms';

// =============================================================================
// Constantes
// =============================================================================

/** La variable dont les puissances décroissantes rangent les termes. */
const MAIN_VARIABLE = 'x';

// =============================================================================
// Fonctions — ce qu'est un monôme
// =============================================================================

/** Une lettre, éventuellement indicée (`x`, `α`, `x_1`). */
function isLetter(node: MathNode): boolean {
	return letterName(node) !== null;
}

/**
 * Le nom d'une lettre, indice compris (`x`, `α`, `x_1`), ou `null` si ce n'est
 * pas une lettre. `x_1` et `x_2` sont deux lettres, ni l'une ni l'autre `x`.
 */
function letterName(node: MathNode): string | null {
	if (node.type === 'variable') return node.name;
	if (node.type === 'greek') return node.letter;
	if (node.type !== 'subscript') return null;
	const base = letterName(node.base);
	return base === null ? null : `${base}_${toLatex(node.subscript)}`;
}

/**
 * Un monôme : nombres (fractions et racines de nombres comprises), constantes,
 * lettres et puissances entières naturelles de lettres, multipliés entre eux
 * (`3x`, `2ab`, `x^2`, `\dfrac{1}{2}x`, `\sqrt{2}x`, `x_1`).
 */
export function isMonomial(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
		case 'constant':
			return true;
		case 'opposite':
		case 'positive':
			return isMonomial(node.operand);
		case 'multiplication':
			return isMonomial(node.left) && isMonomial(node.right);
		case 'division':
			return isMonomial(node.numerator) && node.denominator.type === 'number';
		case 'function':
			return (
				node.name === 'sqrt' &&
				node.power === undefined &&
				node.args.every((arg) => arg.type === 'number')
			);
		case 'superscript':
			return (
				isLetter(node.base) &&
				node.superscript.type === 'number' &&
				/^\d+$/.test(node.superscript.value)
			);
		default:
			return isLetter(node);
	}
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
		const letter = letterName(node);
		if (letter !== null) {
			exponents.set(letter, (exponents.get(letter) ?? 0) + 1);
			return;
		}
		switch (node.type) {
			case 'superscript': {
				const name = letterName(node.base);
				if (
					name !== null &&
					node.superscript.type === 'number' &&
					/^\d+$/.test(node.superscript.value)
				) {
					exponents.set(name, (exponents.get(name) ?? 0) + Number(node.superscript.value));
				}
				return;
			}
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
 * tri stable garde l'ordre d'origine.
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

/**
 * La valeur absolue d'un terme écrit avec un signe moins en tête (`-2ab`,
 * `-x`, `-\dfrac{1}{4}x`), ou `null` s'il n'en a pas.
 */
export function magnitudeOfNegative(term: MathNode): MathNode | null {
	switch (term.type) {
		case 'opposite':
			return term.operand;
		case 'number':
			// Garde : un littéral négatif ne devrait pas exister (invariant 1)
			return term.value.startsWith('-') ? number(term.value.slice(1)) : null;
		case 'multiplication': {
			const left = magnitudeOfNegative(term.left);
			if (left === null) return null;
			// `-1 · x` : le 1 ne s'écrit pas
			if (left.type === 'number' && left.value === '1') return term.right;
			return multiply(left, term.right, term.displayStyle, {
				operatorMetadata: term.operatorMetadata,
				metadata: term.metadata
			});
		}
		case 'division': {
			const numerator = magnitudeOfNegative(term.numerator);
			if (numerator === null) return null;
			return divide(numerator, term.denominator, term.displayStyle, {
				operatorMetadata: term.operatorMetadata,
				metadata: term.metadata
			});
		}
		default:
			return null;
	}
}

/** Une somme rebâtie depuis ses termes signés, un coefficient négatif écrit `− 2ab`. */
export function sumOf(terms: readonly SignedTerm[]): MathNode {
	const [first, ...rest] = terms;
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
 * Une somme dans l'ordre du manuel, ou la même somme si l'ordre est déjà le bon.
 *
 * ⚠️ **Une somme de monômes seulement** (décision de revue du 2026-10-14). Dès
 * qu'un terme n'a pas de degré (`eˣ`, `√x`, `sin x`), le comparer aux monômes
 * n'a pas de sens : on garde l'ordre du module (`4x + 4√x + 1`,
 * `e^{2x} + e^{-2x} + 2`). La PR 1 rangeait un tel terme après les monômes.
 */
function orderSum(node: MathNode): MathNode {
	if (node.type !== 'addition' && node.type !== 'subtraction') return node;
	const terms: readonly SignedTerm[] = flattenSumShallow(node);
	if (!terms.every(({ term }) => isMonomial(term))) return node;
	const exponents = terms.map(({ term }) => exponentsOf(term));
	const others = [...new Set(exponents.flatMap((e) => [...e.keys()]))]
		.filter((letter) => letter !== MAIN_VARIABLE)
		.sort();
	const letters = exponents.some((e) => e.has(MAIN_VARIABLE)) ? [MAIN_VARIABLE, ...others] : others;

	const order = terms
		.map((_, index) => index)
		.sort((a, b) => compareTerms(exponents[a], exponents[b], letters) || a - b);
	// ⚠️ Déjà dans l'ordre : on rend la somme telle quelle, sans la
	// reconstruire — son écriture (`-2 x + 11`) ne doit pas changer pour rien
	if (order.every((position, index) => position === index)) return node;

	return sumOf(order.map((index) => terms[index]));
}

/** Toutes les sommes d'une expression dans l'ordre du manuel (`\dfrac{…}{…}` compris). */
export function orderExpanded(node: MathNode): MathNode {
	return mapNode(node, orderSum);
}
