/**
 * La taille d'un résultat exact, PRÉVUE avant de le calculer.
 *
 * Décision de David (2026-10-12, option A, `docs/wip/grandes-fractions-progress.md`) : au-delà
 * de 1 000 caractères, le mode exact de Calcul garde l'écriture tapée — comme `1000!` le faisait
 * déjà — et donne sa valeur approchée à côté. Mesuré avant : `(1+1/10000)^10000` prenait 13 s
 * pour afficher 80 003 caractères, `(1+1/100000)^100000` bloquait le navigateur plus de 200 s.
 *
 * Deux temps (lot « défauts des grandes fractions », 2026-10-12) :
 * - la taille PRÉVUE, avant le calcul, sert seulement à ne pas figer la page : au-delà de
 *   20 000 caractères prévus, rien n'est calculé. Une puissance de base a/b et d'exposant
 *   entier k s'écrit en environ k × (chiffres de a + chiffres de b) ; une factorielle, un
 *   coefficient binomial, par leur logarithme ; ailleurs, les tailles s'ajoutent — c'est une
 *   borne, qui ignore les simplifications (`10^{600}×10^{-598}` : 1 200 prévus pour 100) ;
 * - en deçà, le résultat est calculé (107 ms au pire mesuré), et la règle des 1 000 caractères
 *   se lit sur sa longueur RÉELLE. Une base irrationnelle échappait à la prévision
 *   (`\sqrt{2}^{100000}` : 15 052 caractères affichés).
 *
 * @module mathAST/cli/exact-size
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { rational } from '../normal/rational';
import {
	isAddition,
	isBoolean,
	isDelimiter,
	isDivision,
	isFunction,
	isGreek,
	isLogical,
	isLogicalNot,
	isMathConstant,
	isMultiplication,
	isNumber,
	isOpposite,
	isRelation,
	isSubtraction,
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

/**
 * Au-delà de cette taille prévue, le calcul exact n'est pas tenté. Mesuré en deçà : 107 ms au
 * pire (`\sqrt{3}^{100000}/2^{30000}`), 85 ms pour `(1+1/2500)^{2500}` (16 992 caractères) ;
 * au-delà, `(1+1/10000)^{10000}` (80 003) prenait 13 s.
 */
const MAX_PREDICTED_CHARACTERS = 20_000;

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

/**
 * Un exposant entier (`1000`, `-3`), ou `null`. Au-delà des entiers sûrs, sa valeur arrondie
 * (jusqu'à ±Infinity) : `2^{2^{100}}` passait pour petit, et son calcul prenait 2,4 s avant de
 * déborder (revue).
 */
function integerExponent(node: MathNode): number | null {
	if (findNodes(node, isVariable).length > 0) return null;
	const value = smallRational(node);
	if (value === null || value.d !== 1n) return null;
	return Number(value.n);
}

/**
 * La « hauteur » d'une base algébrique (des nombres, des racines, les quatre opérations) :
 * environ le nombre de chiffres que chaque puissance ajoute au résultat développé — log₁₀ des
 * termes de chaque nombre, divisé par l'indice de sa racine, plus log₁₀ 2 par somme. Une borne
 * à un facteur 2 près (`(1+\sqrt{2})^{k}` : 0,45 k prévus, 0,77 k réels), pour le seul plafond
 * de calcul : `\sqrt{2}^{40000000}` prenait 2,6 s (revue). `null` pour π, e, une variable, une
 * autre fonction.
 */
function height(node: MathNode): number | null {
	if (isNumber(node)) {
		const value = smallRational(node);
		if (value === null) return null;
		return log10Of(value.n < 0n ? -value.n : value.n) + log10Of(value.d);
	}
	if (
		isFunction(node) &&
		(node.name === 'sqrt' || node.name === 'cbrt') &&
		node.args.length === 1
	) {
		const index = node.name === 'cbrt' ? 3 : node.base ? integerExponent(node.base) : 2;
		const inner = height(node.args[0]);
		return index === null || index < 2 || inner === null ? null : inner / index;
	}
	if (isAddition(node) || isSubtraction(node)) {
		const [left, right] = [height(node.left), height(node.right)];
		return left === null || right === null ? null : Math.max(left, right) + Math.LOG10E * Math.LN2;
	}
	if (isMultiplication(node)) {
		const [left, right] = [height(node.left), height(node.right)];
		return left === null || right === null ? null : left + right;
	}
	if (isDivision(node)) {
		const [top, bottom] = [height(node.numerator), height(node.denominator)];
		return top === null || bottom === null ? null : top + bottom;
	}
	if (isOpposite(node)) return height(node.operand);
	if (isDelimiter(node)) return height(node.content);
	if (isSuperscript(node)) {
		const m = integerExponent(node.superscript);
		const inner = height(node.base);
		return m === null || inner === null ? null : Math.abs(m) * inner;
	}
	return null;
}

/** π, e, une variable, un symbole : ce qui ne se calcule pas en fraction. */
function isSymbolic(node: MathNode): boolean {
	return isMathConstant(node) || isVariable(node) || isGreek(node) || isSymbol(node);
}

/**
 * Une base que le calcul exact développe en fraction : des nombres seulement. π, e, √,
 * une fonction restent des symboles (`e^{1000}` s'écrit `e^{1000}`), sans grossir.
 */
function isPureRational(node: MathNode): boolean {
	return findNodes(node, (n) => isSymbolic(n) || isFunction(n)).length === 0;
}

/** Une valeur rationnelle : des nombres, des factorielles, des coefficients binomiaux. */
function isRationalValued(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) => isSymbolic(n) || (isFunction(n) && n.name !== 'factorial' && n.name !== 'binom')
		).length === 0
	);
}

/** Les caractères d'une fraction écrite en entier (`-123/45` : 7). */
function rationalCharacters(value: Rational): number {
	const numerator = value.n.toString().length;
	return value.d === 1n ? numerator : numerator + 1 + value.d.toString().length;
}

/** Les caractères d'un rationnel élevé à la puissance k (signe compris : `|k|`). */
function powerCharacters(value: Rational, k: number): number {
	const size = Math.abs(k);
	const numerator = size * log10Of(value.n < 0n ? -value.n : value.n) + 1;
	return value.d === 1n ? numerator : numerator + size * log10Of(value.d) + 2;
}

/** Les nombres premiers sous 1 000, pour décomposer les bases d'un produit. */
const SMALL_PRIMES: readonly bigint[] = (() => {
	const primes: bigint[] = [];
	for (let n = 2; n < 1000; n++) {
		if (primes.every((p) => n % Number(p) !== 0)) primes.push(BigInt(n));
	}
	return primes;
})();

/** Facteur → (log₁₀ du facteur, exposant). Un reste sans petit diviseur compte comme un facteur. */
type Factorization = Map<string, { readonly log10: number; exponent: number }>;

/** Ajoute à `into` les facteurs de x > 0, chacun à l'exposant `exponent`. */
function addFactors(into: Factorization, x: bigint, exponent: number): void {
	for (const p of SMALL_PRIMES) {
		if (x === 1n) return;
		if (p * p > x) break;
		let count = 0;
		while (x % p === 0n) {
			x /= p;
			count += 1;
		}
		if (count > 0) addFactor(into, p, count * exponent);
	}
	if (x > 1n) addFactor(into, x, exponent);
}

function addFactor(into: Factorization, factor: bigint, exponent: number): void {
	const key = factor.toString();
	const entry = into.get(key);
	if (entry) entry.exponent += exponent;
	else into.set(key, { log10: log10Of(factor), exponent });
}

/** Le signe d'un produit en cours de décomposition. */
interface Sign {
	negative: boolean;
}

/**
 * Les facteurs d'un produit, d'un quotient, de puissances entières de bases rationnelles courtes,
 * chacun à l'exposant `exponent` ; `false` dès qu'autre chose s'y trouve (une somme développée, π,
 * une variable…) ou qu'un exposant sort des entiers sûrs (`2^{10^{20}+1}` y perdrait son 1).
 */
function factorization(node: MathNode, exponent: number, into: Factorization, sign: Sign): boolean {
	if (isDelimiter(node)) return factorization(node.content, exponent, into, sign);
	if (isOpposite(node)) {
		if (exponent % 2 !== 0) sign.negative = !sign.negative;
		return factorization(node.operand, exponent, into, sign);
	}
	if (isMultiplication(node)) {
		return (
			factorization(node.left, exponent, into, sign) &&
			factorization(node.right, exponent, into, sign)
		);
	}
	if (isDivision(node)) {
		return (
			factorization(node.numerator, exponent, into, sign) &&
			factorization(node.denominator, -exponent, into, sign)
		);
	}
	if (isSuperscript(node)) {
		const k = integerExponent(node.superscript);
		if (k === null || !Number.isSafeInteger(k) || !Number.isSafeInteger(exponent * k)) {
			return false;
		}
		return factorization(node.base, exponent * k, into, sign);
	}
	if (!isPureRational(node) || estimate(node) > SMALL_BASE_CHARACTERS) return false;
	const value = smallRational(node);
	if (value === null || value.n === 0n) return false;
	if (value.n < 0n && exponent % 2 !== 0) sign.negative = !sign.negative;
	addFactors(into, value.n < 0n ? -value.n : value.n, exponent);
	addFactors(into, value.d, -exponent);
	return true;
}

/** Un produit, un quotient, une puissance (sous ses parenthèses) : ce que `productValue` lit. */
function isProductLike(node: MathNode): boolean {
	if (isDelimiter(node)) return isProductLike(node.content);
	return isMultiplication(node) || isDivision(node) || isSuperscript(node);
}

/** Les facteurs compensés d'un produit de puissances, ou `null`. */
function compensatedFactors(node: MathNode): { factors: Factorization; sign: Sign } | null {
	if (!isProductLike(node)) return null;
	const factors: Factorization = new Map();
	const sign: Sign = { negative: false };
	return factorization(node, 1, factors, sign) ? { factors, sign } : null;
}

/** Les caractères d'une fraction donnée par ses facteurs compensés. */
function factorsCharacters(factors: Factorization): number {
	let numerator = 0;
	let denominator = 0;
	for (const { log10, exponent } of factors.values()) {
		if (exponent > 0) numerator += exponent * log10;
		else denominator -= exponent * log10;
	}
	return numerator + 1 + (denominator > 0 ? denominator + 2 : 0);
}

/**
 * La valeur exacte d'un produit ou d'un quotient de puissances, calculée sur ses facteurs
 * compensés — sans les puissances intermédiaires, que le moteur calcule une à une :
 * `(1+1/100000)^{100000}×(1+1/100000)^{-100000}` = 1 y prenait 305 s, `10^{60000}/10^{59990}`
 * gardait son écriture (revue, 2026-10-12). `null` si ce n'en est pas un, ou si la valeur
 * compensée dépasse elle-même le plafond de calcul.
 */
export function productValue(node: MathNode): Rational | null {
	const compensated = compensatedFactors(node);
	if (compensated === null) return null;
	if (factorsCharacters(compensated.factors) > MAX_PREDICTED_CHARACTERS) return null;
	let numerator = 1n;
	let denominator = 1n;
	for (const [key, { exponent }] of compensated.factors) {
		if (exponent > 0) numerator *= BigInt(key) ** BigInt(exponent);
		else if (exponent < 0) denominator *= BigInt(key) ** BigInt(-exponent);
	}
	// Deux restes sans petit diviseur peuvent partager un facteur : `rational` réduit
	return rational(compensated.sign.negative ? -numerator : numerator, denominator);
}

function estimate(node: MathNode): number {
	if (isNumber(node)) {
		const value = smallRational(node);
		return value === null ? node.value.length : powerCharacters(value, 1);
	}

	if (isSuperscript(node)) {
		const baseSize = estimate(node.base);
		const k = integerExponent(node.superscript);
		if (k === null || Math.abs(k) < 2) return baseSize + estimate(node.superscript);
		if (!isPureRational(node.base)) {
			const h = height(node.base);
			return h === null ? baseSize + estimate(node.superscript) : Math.abs(k) * h;
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
 * (`(1+1/1000)^{1000}` : environ 6 003) — pour la note. Un produit de puissances y compte après
 * compensation (`10^{60000}/10^{59990}` : 11) ; ailleurs, une borne sans les simplifications.
 */
export function estimatedExactDigits(node: MathNode): number {
	const compensated = compensatedFactors(node);
	return compensated === null ? estimate(node) : factorsCharacters(compensated.factors);
}

/**
 * Le résultat exact serait trop long pour être calculé sans figer la page (> 20 000 caractères
 * prévus). Jamais pour une comparaison ou un test logique : leur résultat est vrai ou faux.
 */
export function isTooLongToCompute(node: MathNode): boolean {
	if (isRelation(node) || isLogical(node) || isLogicalNot(node) || isBoolean(node)) return false;
	return estimate(node) > MAX_PREDICTED_CHARACTERS;
}

/**
 * La longueur réelle d'un résultat exact calculé : celle de son écriture `written`, ou celle de
 * sa valeur quand le moteur garde une factorielle (`1000!` : 2 568, et non 15 pour
 * `factorial(1000)`). `1000!/999!` vaut 1000 : son écriture, plus longue, fait foi.
 */
export function exactCharacters(node: MathNode, written: string): number {
	const value = isRationalValued(node) ? smallRational(node) : null;
	return value === null ? written.length : Math.max(written.length, rationalCharacters(value));
}
