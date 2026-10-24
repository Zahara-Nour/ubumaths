/**
 * La valeur exacte à afficher : UNE écriture pour tous les affichages d'une
 * valeur calculée — ligne de l'Atelier, `{{eval}}` d'un énoncé, valeurs du
 * tableau de variations, ordonnées du grapheur, limites, solutions (lot 5c du
 * chantier simplify-carte, décision A du § 13, comportements des § 57-58).
 *
 * `evaluate` rend une forme de CALCUL (`⅓ π`, `½ √2`) ; cette fonction en fait
 * une forme de LECTURE. `evaluate` reste inchangé pour les calculs internes.
 *
 * @module mathAST/eval/exact-value
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { denormalize, normalize } from '../normal';
import { tidy } from '../tidy';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { computeCost } from '../simplify/cost';
import { divide, euler, multiply, opposite, superscript } from '../factory';
import {
	isDelimiter,
	isDivision,
	isFunction,
	isMultiplication,
	isNumber,
	isOpposite,
	isSuperscript
} from '../guards';
import { findNodes, mapNode } from '../transforms';
import { extractRational, numericNode } from '../common/numeric';
import { divRational, negRational } from '../normal/rational';
import { flattenSumShallow, flipSign, unflattenSum, type SignedTerm } from '../flatten';
import { toLatex } from '../latex-generator';
import { getVariables } from './substitute';

// =============================================================================
// Types
// =============================================================================

export interface ExactValueOptions {
	/**
	 * L'expression d'où vient la valeur, non calculée (`π/12 + cos(π/6)`) : une
	 * écriture candidate de plus, et le registre de la saisie (décimal, notation
	 * scientifique).
	 */
	readonly source?: MathNode;
	/**
	 * Registre décimal déclaré sans source : une équation à décimaux
	 * (`2x = 0,6` → `x = 0,3`). Par défaut, lu sur la source.
	 */
	readonly decimal?: boolean;
	/**
	 * Garder une notation scientifique tapée (`3 × 10²⁰`, Q24) : la saisie de
	 * l'Atelier seulement. Dans un énoncé (`{{eval:a*10^{-3}}}`), la forme
	 * dépendrait du tirage de la mantisse.
	 */
	readonly keepScientific?: boolean;
}

// =============================================================================
// Fonction
// =============================================================================

/**
 * L'écriture affichée d'une valeur exacte.
 *
 * - le registre décimal de la saisie est gardé, avec la règle S1 de `tidy`
 *   (`0,1+0,2 → 0,3`, `1/3+0,5 → 5/6`) ; un irrationnel n'a pas d'écriture
 *   décimale finie (`0,5√2 → √2/2`, Q22) ;
 * - une notation scientifique tapée (`3 × 10²⁰`) reste telle quelle avec
 *   `keepScientific` (Q24, Atelier) ;
 * - un rationnel s'écrit depuis la valeur seule (la source n'apporterait rien,
 *   et `normalize` coûte cher sur une grosse saisie) ;
 * - sinon, parmi les écritures candidates (la valeur, la forme normale de la
 *   source, la source), mises au propre par `tidy`, la plus CALCULÉE — le moins
 *   de fonctions à calculer (`cos(π/6)` calculé), puis le moins de puissances
 *   d'une somme (`(1+√2)^{100}` développée) —, puis la moins chère ;
 * - une somme de fractions de même dénominateur s'écrit en une seule (Q23 :
 *   `(1 + √5)/2`).
 *
 * Un nombre seul (valeur approchée du mode décimal, `5,0990`) et une notation
 * scientifique calculée sont déjà écrits : rendus tels quels.
 *
 * @param value - La valeur calculée (`evaluate` exact), ou la source si le calcul a échoué
 */
export function exactValueToShow(value: MathNode, options: ExactValueOptions = {}): MathNode {
	const { source } = options;
	if (
		options.keepScientific === true &&
		source !== undefined &&
		isTypedScientificNotation(source)
	) {
		return withCross(source);
	}
	if (isWrittenNumber(value) || isTypedScientificNotation(value)) return value;

	const rational = rationalOf(value);
	const decimalRegister = options.decimal ?? (source !== undefined && hasDecimalLiteral(source));
	if (decimalRegister && rational !== null) {
		const written = decimalRegisterWriting(rational, source);
		if (written !== null) return written;
	}

	const candidates = [value];
	if (source !== undefined && rational === null) {
		const normalized = normalizeSafe(source);
		if (normalized !== null) candidates.push(normalized);
		candidates.push(source);
	}
	// Chaque candidate est jugée sous sa forme finale, dénominateur commun compris
	// (`1/2 + √3/2` se compare en `(1 + √3)/2`)
	const tidied = candidates.map((candidate) =>
		withCommonDenominator(tidySafe(toEulerPowers(candidate)))
	);
	// Un décimal n'est gardé que s'il écrit exactement la valeur (Q22)
	const withoutDecimals = tidied.filter((candidate) => !hasDecimalLiteral(candidate));
	const kept = withoutDecimals.length > 0 ? withoutDecimals : tidied;

	let best = kept[0];
	for (const candidate of kept.slice(1)) best = better(best, candidate);
	return best;
}

// =============================================================================
// Choisir l'écriture
// =============================================================================

/** Le coût relatif qu'une écriture plus tardive peut coûter en plus et gagner (`cheapest`). */
const LATER_CANDIDATE_BIAS = 1.2;

/**
 * La meilleure de deux écritures : la plus calculée (`uncomputed`), puis la
 * moins chère ; la plus tardive (la source) gagne les égalités, règle du
 * tableau de variations (`-1/(2e)` plutôt que `-½ e^{2·(−½)}`).
 */
function better(current: MathNode, candidate: MathNode): MathNode {
	const left = uncomputed(current);
	const right = uncomputed(candidate);
	for (let i = 0; i < left.length; i++) {
		if (left[i] !== right[i]) return right[i] < left[i] ? candidate : current;
	}
	return computeCost(candidate) <= LATER_CANDIDATE_BIAS * computeCost(current)
		? candidate
		: current;
}

/** Les radicaux sont des écritures exactes, pas des calculs laissés en plan. */
const RADICALS = new Set(['sqrt', 'root']);

/**
 * Ce qu'une écriture laisse à calculer, dans l'ordre : les appels de fonction
 * sans variable (`cos(π/6)`, `ln 2`, pas `√3`), les puissances entières d'une
 * somme (`(1+√2)^{100}`), les radicaux au dénominateur (`1/(√3 − 1)`, dont la
 * classe rend le dénominateur rationnel).
 */
function uncomputed(node: MathNode): readonly number[] {
	const calls = findNodes(
		node,
		(n) => isFunction(n) && !RADICALS.has(n.name) && getVariables(n).size === 0
	).length;
	const powers = findNodes(node, isPowerOfSum).length;
	const radicalDenominators = findNodes(
		node,
		(n) =>
			isDivision(n) &&
			findNodes(n.denominator, (d) => isFunction(d) && RADICALS.has(d.name)).length > 0
	).length;
	return [calls, powers, radicalDenominators];
}

/** `(a + b)^n`, n entier écrit. */
function isPowerOfSum(node: MathNode): boolean {
	if (!isSuperscript(node) || !isNumber(node.superscript)) return false;
	if (!/^\d+$/.test(node.superscript.value)) return false;
	const base = isDelimiter(node.base) ? node.base.content : node.base;
	return base.type === 'addition' || base.type === 'subtraction';
}

// =============================================================================
// Registre
// =============================================================================

/** Un nombre écrit, signé ou non (`1024`, `-5.0990`). */
function isWrittenNumber(node: MathNode): boolean {
	return isNumber(node) || (isOpposite(node) && isNumber(node.operand));
}

/**
 * Une notation scientifique : `a × 10ⁿ`, 1 ≤ |a| < 10, n entier (`3 × 10²⁰`,
 * `2,5 × 10⁻³`). `12 × 10²` n'en est pas une : il se calcule.
 */
function isTypedScientificNotation(node: MathNode): boolean {
	const written = isOpposite(node) ? node.operand : node;
	if (!isMultiplication(written)) return false;
	const { left, right } = written;
	if (!isNumber(left) || !isSuperscript(right)) return false;
	const mantissa = Number(left.value);
	if (!(mantissa >= 1 && mantissa < 10)) return false;
	const exponent = isOpposite(right.superscript) ? right.superscript.operand : right.superscript;
	return (
		isNumber(right.base) &&
		right.base.value === '10' &&
		isNumber(exponent) &&
		/^\d+$/.test(exponent.value) &&
		exponent.value !== '0'
	);
}

/**
 * Une notation scientifique écrite avec ×, sans zéro final à la mantisse
 * (`8.7700*10^9` tapé → `8,77 × 10⁹`).
 */
function withCross(node: MathNode): MathNode {
	if (isOpposite(node)) return opposite(withCross(node.operand));
	if (!isMultiplication(node) || !isNumber(node.left)) return node;
	const mantissa = node.left.value.includes('.')
		? node.left.value.replace(/0+$/, '').replace(/\.$/, '')
		: node.left.value;
	return multiply(numericNode(mantissa), node.right, 'cross');
}

/** Valeur exacte d'un nombre, d'un opposé ou d'un quotient de nombres ; `null` sinon. */
function rationalOf(node: MathNode): Rational | null {
	if (isOpposite(node)) {
		const inner = rationalOf(node.operand);
		return inner === null ? null : negRational(inner);
	}
	if (isDivision(node)) {
		const numerator = rationalOf(node.numerator);
		const denominator = rationalOf(node.denominator);
		return numerator === null || denominator === null || denominator.n === 0n
			? null
			: divRational(numerator, denominator);
	}
	return extractRational(node);
}

/**
 * Un rationnel dans le registre décimal (S1). `tidy` en fixe la règle sur la
 * source : décimal, sauf si un opérande est une fraction ou une division
 * (`1/4 + 0,5 → 3/4`, `1,5/3 → 1/2`) ou si l'écriture décimale est infinie.
 * Ce qu'il ne calcule pas (`max(2,5 ; 1)`), ou sans source : décimal si
 * l'écriture est finie.
 */
function decimalRegisterWriting(r: Rational, source: MathNode | undefined): MathNode | null {
	if (source !== undefined) {
		const tidied = tidySafe(source);
		if (rationalOf(tidied) !== null) return tidied;
	}
	return decimalWriting(r);
}

/** L'écriture décimale d'un rationnel (`-1.6`), `null` si elle est infinie. */
function decimalWriting(r: Rational): MathNode | null {
	const text = decimalString(r);
	if (text === null) return null;
	return r.n < 0n ? opposite(numericNode(text)) : numericNode(text);
}

// =============================================================================
// Dénominateur commun (Q23)
// =============================================================================

/**
 * `1/2 + √5/2` → `(1 + √5)/2` : une somme dont TOUS les termes sont des
 * fractions de même dénominateur. Sinon l'écriture ne bouge pas.
 */
function withCommonDenominator(node: MathNode): MathNode {
	const terms = flattenSumShallow(node);
	if (terms.length < 2) return node;
	const numerators: SignedTerm[] = [];
	let denominator: MathNode | null = null;
	for (const { sign, term } of terms) {
		const negated = isOpposite(term);
		const fraction = negated ? term.operand : term;
		if (!isDivision(fraction)) return node;
		if (denominator === null) denominator = fraction.denominator;
		else if (toLatex(fraction.denominator) !== toLatex(denominator)) return node;
		numerators.push({ sign: negated ? flipSign(sign) : sign, term: fraction.numerator });
	}
	const numerator = unflattenSum(numerators);
	if (numerator === null || denominator === null) return node;
	return tidySafe(divide(numerator, denominator, 'fraction'));
}

// =============================================================================
// Outils
// =============================================================================

/** `exp(u)` → `e^{u}` : l'écriture que `tidy` sait mettre au propre (e^{−1} → 1/e). */
function toEulerPowers(node: MathNode): MathNode {
	return mapNode(node, (current) =>
		isFunction(current) && current.name === 'exp' && current.args.length === 1
			? superscript(euler(), current.args[0])
			: current
	);
}

/** La forme normale réécrite, `null` si `normalize` lève une exception. */
function normalizeSafe(node: MathNode): MathNode | null {
	try {
		return denormalize(normalize(node));
	} catch {
		return null;
	}
}

/** `tidy` peut lever une exception imprévue : on garde alors l'écriture reçue. */
function tidySafe(node: MathNode): MathNode {
	try {
		return tidy(node);
	} catch {
		return node;
	}
}
