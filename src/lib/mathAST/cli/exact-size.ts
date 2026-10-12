/**
 * La taille d'un résultat exact, PRÉVUE avant de le calculer.
 *
 * Décision de David (2026-10-12, option A, `docs/wip/grandes-fractions-progress.md`) : au-delà
 * de 1 000 caractères, le mode exact de Calcul garde l'écriture tapée — comme `1000!` le faisait
 * déjà — et donne sa valeur approchée à côté. Mesuré avant : `(1+1/10000)^10000` prenait 13 s
 * pour afficher 80 003 caractères, `(1+1/100000)^100000` bloquait le navigateur plus de 200 s.
 *
 * ⚠️ La décision se prend AVANT le calcul : un garde-fou posé après arriverait après le blocage.
 * Une puissance de base a/b et d'exposant entier k s'écrit en environ k × (chiffres de a +
 * chiffres de b) ; une factorielle, un coefficient binomial, par leur logarithme ; ailleurs, les
 * tailles s'ajoutent (un produit, une somme de fractions : les chiffres s'additionnent au plus).
 *
 * @module mathAST/cli/exact-size
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	isBoolean,
	isFunction,
	isGreek,
	isLogical,
	isLogicalNot,
	isMathConstant,
	isNumber,
	isRelation,
	isSuperscript,
	isSymbol,
	isVariable
} from '../guards';
import { findNodes, getChildren } from '../transforms';
import { evaluateNodeToRational } from '../eval/evaluate';

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, une valeur exacte n'apprend plus rien à l'élève (décision de David). */
export const MAX_EXACT_CHARACTERS = 1000;

/** Une base plus courte que cela se calcule pour connaître sa taille exacte. */
const SMALL_BASE_CHARACTERS = 60;

// =============================================================================
// Fonctions
// =============================================================================

/** log₁₀ d'un entier positif, même au-delà des flottants. */
function log10Of(x: bigint): number {
	if (x <= 1n) return 0;
	if (x < 2n ** 53n) return Math.log10(Number(x));
	return x.toString(2).length * Math.LOG10E * Math.LN2;
}

/** log₁₀(n!), par la formule de Stirling (exacte à mieux qu'un chiffre près). */
function log10Factorial(n: number): number {
	if (n < 2) return 0;
	return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN10;
}

/** La valeur rationnelle d'une sous-expression courte, ou `null`. */
function smallRational(node: MathNode): Rational | null {
	try {
		return evaluateNodeToRational(node);
	} catch {
		return null;
	}
}

/** Un exposant entier (`1000`, `-3`), ou `null`. */
function integerExponent(node: MathNode): number | null {
	if (findNodes(node, isVariable).length > 0) return null;
	const value = smallRational(node);
	if (value === null || value.d !== 1n) return null;
	const k = Number(value.n);
	return Number.isSafeInteger(k) ? k : null;
}

/**
 * Une base que le calcul exact développe en fraction : des nombres seulement. π, e, √,
 * une fonction restent des symboles (`e^{1000}` s'écrit `e^{1000}`), sans grossir.
 */
function isPureRational(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) => isMathConstant(n) || isFunction(n) || isVariable(n) || isGreek(n) || isSymbol(n)
		).length === 0
	);
}

/** Les caractères d'un rationnel élevé à la puissance k (signe compris : `|k|`). */
function powerCharacters(value: Rational, k: number): number {
	const size = Math.abs(k);
	const numerator = size * log10Of(value.n < 0n ? -value.n : value.n) + 1;
	return value.d === 1n ? numerator : numerator + size * log10Of(value.d) + 2;
}

function estimate(node: MathNode): number {
	if (isNumber(node)) {
		const value = smallRational(node);
		return value === null ? node.value.length : powerCharacters(value, 1);
	}

	if (isSuperscript(node)) {
		const baseSize = estimate(node.base);
		const k = integerExponent(node.superscript);
		if (k === null || Math.abs(k) < 2 || !isPureRational(node.base)) {
			return baseSize + estimate(node.superscript);
		}
		const value = baseSize <= SMALL_BASE_CHARACTERS ? smallRational(node.base) : null;
		return value === null ? baseSize * Math.abs(k) : powerCharacters(value, k);
	}

	if (isFunction(node) && (node.name === 'factorial' || node.name === 'binom')) {
		const args = node.args.map(integerExponent);
		if (args.every((a): a is number => a !== null && a >= 0)) {
			const [n, k] = args;
			const log10 =
				node.name === 'factorial'
					? log10Factorial(n)
					: log10Factorial(n) - log10Factorial(k) - log10Factorial(n - k);
			return Math.max(1, log10 + 1);
		}
	}

	return getChildren(node).reduce((sum, child) => sum + estimate(child), 0);
}

/**
 * Le nombre de caractères qu'aurait le résultat exact, à quelques-uns près, sans le calculer
 * (`(1+1/1000)^{1000}` : environ 6 003).
 */
export function estimatedExactDigits(node: MathNode): number {
	return estimate(node);
}

/**
 * Le résultat exact serait trop long à écrire (> 1 000 caractères). Jamais pour une
 * comparaison ou un test logique : leur résultat est vrai ou faux.
 */
export function isTooLongExact(node: MathNode): boolean {
	if (isRelation(node) || isLogical(node) || isLogicalNot(node) || isBoolean(node)) return false;
	return estimate(node) > MAX_EXACT_CHARACTERS;
}
