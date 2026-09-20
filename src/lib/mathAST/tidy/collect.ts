/**
 * Le cœur de `tidy` : relire une expression comme une somme de termes.
 *
 * Une fonction par étape du contrat (docs/wip/tidy-phase0.md, §A) :
 *
 * | étape | fonction                                                       |
 * | ----- | -------------------------------------------------------------- |
 * | 1     | `flattenSumShallow` / `flattenProductShallow` (briques) |
 * | 3     | `absorbFactor` (neutres, signes, `-(-x)`, `x/(-y)`)            |
 * | 4     | `absorbRational` (arithmétique exacte, jamais de décimal)      |
 * | 5     | `collectLikeTerms` (clé = hash des facteurs + unité)           |
 * | 6     | `addFactor` (exposants additionnés sur une base identique)     |
 * | 7     | `absorbSquareRoot` / `reduceRadicalFactors`                     |
 * | 9     | `tidyFunction` (arguments au propre, `sin^2(x)` → superscript) |
 * | 10    | `absorbQuantity` (l'unité survit)                              |
 *
 * @module mathAST/tidy/collect
 */

import type { FunctionNode, MathNode, UnitNode } from '../types';
import type { Unit } from '../units/types';
import type { Rational } from '../normal/types';
import type { TidyTerm } from './types';
import { flattenProductShallow, flattenSumShallow } from '../flatten';
import { extractRational } from '../common/numeric';
import { hashMathNode } from '../normal/hash';
import {
	ONE,
	addRational,
	fromInteger,
	isInteger as isIntegerRational,
	isOne as isOneRational,
	isPositive as isPositiveRational,
	isZero as isZeroRational,
	mulRational,
	negRational,
	powRational,
	rational
} from '../normal/rational';
import { func, number, subscript, superscript, withUnit, sqrt as sqrtNode } from '../factory';
import { isDelimiter, isFunction } from '../guards';
import { buildSum } from './build';
import { compareNestedTerms, compareTerms, sortFactors } from './order';

// =============================================================================
// Types internes
// =============================================================================

/** Accumulateur mutable, local à un terme : il ne sort jamais du module. */
type Accumulator = {
	coefficient: Rational;
	readonly factors: Map<string, { base: MathNode; exponent: Rational }>;
	unit: Unit | null;
};

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, la recherche du plus grand carré diviseur coûterait trop cher. */
const MAX_RADICAND_FOR_FACTORING = 1_000_000_000_000n;

// =============================================================================
// Helpers rationnels
// =============================================================================

function floorDivideBigInt(a: bigint, b: bigint): bigint {
	const quotient = a / b;
	return a % b !== 0n && a < 0n !== b < 0n ? quotient - 1n : quotient;
}

/**
 * Sépare un entier positif en `square² · rest` avec `rest` sans facteur carré.
 * `8 → { square: 2n, rest: 2n }`, `9 → { square: 3n, rest: 1n }`.
 */
function splitSquareFactor(value: bigint): { square: bigint; rest: bigint } {
	let square = 1n;
	let rest = value;
	for (let p = 2n; p * p <= rest; p++) {
		const pSquared = p * p;
		while (rest % pSquared === 0n) {
			square *= p;
			rest /= pSquared;
		}
	}
	return { square, rest };
}

// =============================================================================
// Clé d'une unité
// =============================================================================

/**
 * `hashUnit` n'est pas exporté par `normal/hash` : on passe par un nœud
 * grandeur factice, dont le hash contient déjà l'unité.
 */
function unitKey(unit: Unit | null): string {
	return unit === null ? '' : hashMathNode(withUnit(number('1'), unit));
}

// =============================================================================
// Accumulation des facteurs
// =============================================================================

function addFactor(acc: Accumulator, base: MathNode, exponent: Rational): void {
	const key = hashMathNode(base);
	const existing = acc.factors.get(key);
	const merged = existing ? addRational(existing.exponent, exponent) : exponent;

	if (isZeroRational(merged)) {
		acc.factors.delete(key);
		return;
	}
	acc.factors.set(key, { base: existing ? existing.base : base, exponent: merged });
}

/** Étape 4 — arithmétique exacte : `r^exponent` replié dans le coefficient. */
function absorbRational(r: Rational, exponent: Rational, acc: Accumulator): boolean {
	if (!isIntegerRational(exponent)) return false;
	if (r.n === 0n && exponent.n < 0n) return false; // division par zéro : on laisse tel quel

	acc.coefficient = mulRational(acc.coefficient, powRational(r, Number(exponent.n)));
	return true;
}

/**
 * Étape 7 — radicaux numériques. `sqrt(n/d) = (square/d)·sqrt(rest)`, puis
 * `sqrt(rest)^e = rest^⌊e/2⌋ · sqrt(rest)^(e mod 2)` — ce qui rationalise aussi
 * `1/sqrt(2) → sqrt(2)/2`.
 */
function absorbSquareRoot(radicand: Rational, exponent: Rational, acc: Accumulator): boolean {
	if (!isIntegerRational(exponent)) return false;
	if (!isPositiveRational(radicand)) return false;

	const product = radicand.n * radicand.d;
	if (product > MAX_RADICAND_FOR_FACTORING) return false;

	const { square, rest } = splitSquareFactor(product);
	const outside = rational(square, radicand.d);
	acc.coefficient = mulRational(acc.coefficient, powRational(outside, Number(exponent.n)));

	if (rest > 1n) {
		const halves = floorDivideBigInt(exponent.n, 2n);
		const remainder = exponent.n - 2n * halves;
		acc.coefficient = mulRational(acc.coefficient, powRational(fromInteger(rest), Number(halves)));
		if (remainder === 1n) addFactor(acc, sqrtNode(number(rest.toString())), ONE);
	}
	return true;
}

/** Le radicande entier positif d'un `sqrt(...)`, ou `null`. */
function squareRootRadicand(node: MathNode): Rational | null {
	if (!isFunction(node)) return null;
	if (node.name !== 'sqrt' || node.args.length !== 1) return null;
	if (node.power !== undefined || node.base !== undefined) return null;
	const r = extractRational(node.args[0]);
	return r !== null && isPositiveRational(r) ? r : null;
}

/**
 * Après fusion des facteurs, `sqrt(2)·sqrt(2)` est devenu `sqrt(2)^2` : on
 * repasse ces facteurs radicaux dans l'étape 7.
 */
function reduceRadicalFactors(acc: Accumulator): void {
	for (let pass = 0; pass < 4; pass++) {
		let changed = false;
		for (const [key, factor] of [...acc.factors]) {
			if (isOneRational(factor.exponent)) continue;
			const radicand = squareRootRadicand(factor.base);
			if (radicand === null) continue;
			if (!isIntegerRational(factor.exponent)) continue;

			acc.factors.delete(key);
			if (!absorbSquareRoot(radicand, factor.exponent, acc)) {
				acc.factors.set(key, factor);
				continue;
			}
			changed = true;
		}
		if (!changed) return;
	}
}

/** Étape 10 — une grandeur numérique cède sa valeur au coefficient. */
function absorbQuantity(node: UnitNode, exponent: Rational, acc: Accumulator): boolean {
	if (!isOneRational(exponent) || acc.unit !== null) return false;
	const value = extractRational(node.expression);
	if (value === null) return false;

	acc.coefficient = mulRational(acc.coefficient, value);
	acc.unit = node.unit;
	return true;
}

/**
 * Étape 9 — `sin^2(x)` et `sin(x)^2` sont la même chose : `tidy` rend le
 * `superscript`, donc le nœud fonction perd son `power` au profit d'un
 * exposant de facteur.
 */
function absorbFunctionPower(node: FunctionNode, exponent: Rational, acc: Accumulator): boolean {
	if (node.power === undefined) return false;
	const p = extractRational(node.power);
	if (p === null) return false;

	const bare = func(node.name, node.args, {
		...(node.base !== undefined && { base: node.base }),
		...(node.derivativeOrder !== undefined && { derivativeOrder: node.derivativeOrder }),
		...(node.isInverse === true && { isInverse: node.isInverse })
	});
	absorbFactor(bare, mulRational(exponent, p), acc);
	return true;
}

/**
 * Étapes 1, 3, 4, 6, 7, 10 — absorbe `node^exponent` dans l'accumulateur.
 *
 * Les délimiteurs sont traversés : à l'intérieur d'un produit ils ne portent
 * aucune information (les parenthèses sont **réécrites** à la construction).
 */
function absorbFactor(node: MathNode, exponent: Rational, acc: Accumulator): void {
	switch (node.type) {
		case 'delimiter':
			absorbFactor(node.content, exponent, acc);
			return;

		case 'positive':
			absorbFactor(node.operand, exponent, acc);
			return;

		case 'opposite':
			if (isIntegerRational(exponent)) {
				if (exponent.n % 2n !== 0n) acc.coefficient = negRational(acc.coefficient);
				absorbFactor(node.operand, exponent, acc);
				return;
			}
			break;

		case 'multiplication':
			absorbFactor(node.left, exponent, acc);
			absorbFactor(node.right, exponent, acc);
			return;

		case 'division':
			absorbFactor(node.numerator, exponent, acc);
			absorbFactor(node.denominator, negRational(exponent), acc);
			return;

		case 'superscript': {
			const innerExponent = extractRational(node.superscript);
			if (innerExponent !== null) {
				absorbFactor(node.base, mulRational(exponent, innerExponent), acc);
				return;
			}
			break;
		}

		case 'number': {
			const value = extractRational(node);
			if (value !== null && absorbRational(value, exponent, acc)) return;
			break;
		}

		case 'unit':
			if (absorbQuantity(node, exponent, acc)) return;
			break;

		case 'function': {
			if (absorbFunctionPower(node, exponent, acc)) return;
			const radicand = squareRootRadicand(node);
			if (radicand !== null && absorbSquareRoot(radicand, exponent, acc)) return;
			break;
		}

		default:
			break;
	}

	addFactor(acc, tidyAtom(node), exponent);
}

// =============================================================================
// Un terme, une somme
// =============================================================================

function toTerm(node: MathNode): TidyTerm {
	const acc: Accumulator = { coefficient: ONE, factors: new Map(), unit: null };

	for (const { factor } of flattenProductShallow(node)) {
		absorbFactor(factor, ONE, acc);
	}
	reduceRadicalFactors(acc);

	return {
		coefficient: acc.coefficient,
		factors: sortFactors([...acc.factors.values()]),
		unit: acc.unit
	};
}

function isSumNode(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

function negateTerm(term: TidyTerm): TidyTerm {
	return { ...term, coefficient: negRational(term.coefficient) };
}

/**
 * Étape 1 — aplatir la somme. Un délimiteur précédé d'un `+` ne sépare rien
 * (`(a+b)+c → a+b+c`) ; précédé d'un `-` il reste opaque, sinon `tidy`
 * distribuerait le signe — ce que le contrat interdit (`-(x+2)` inchangé).
 */
function toSumTerms(node: MathNode): TidyTerm[] {
	const terms: TidyTerm[] = [];

	for (const { sign, term } of flattenSumShallow(node)) {
		if (sign === '+' && isDelimiter(term) && isSumNode(term.content)) {
			terms.push(...toSumTerms(term.content));
			continue;
		}
		const collected = toTerm(term);
		terms.push(sign === '-' ? negateTerm(collected) : collected);
	}

	return terms;
}

/** Étape 5 — termes semblables : même clé structurelle, coefficients repliés. */
function collectLikeTerms(terms: readonly TidyTerm[]): TidyTerm[] {
	const groups = new Map<string, { coefficient: Rational; term: TidyTerm }>();

	for (const term of terms) {
		const key =
			term.factors.map((f) => `${hashMathNode(f.base)}^${f.exponent.n}/${f.exponent.d}`).join('*') +
			'|' +
			unitKey(term.unit);

		const existing = groups.get(key);
		if (existing) {
			existing.coefficient = addRational(existing.coefficient, term.coefficient);
		} else {
			groups.set(key, { coefficient: term.coefficient, term });
		}
	}

	const result: TidyTerm[] = [];
	for (const { coefficient, term } of groups.values()) {
		if (isZeroRational(coefficient)) continue;
		result.push({ ...term, coefficient });
	}
	return result;
}

// =============================================================================
// Points d'entrée récursifs
// =============================================================================

/** Étape 9 — les arguments d'une fonction sont mis au propre. */
function tidyFunction(node: FunctionNode): MathNode {
	return func(node.name, node.args.map(tidyExpression), {
		...(node.power !== undefined && { power: tidyExpression(node.power) }),
		...(node.base !== undefined && { base: tidyExpression(node.base) }),
		...(node.derivativeOrder !== undefined && { derivativeOrder: node.derivativeOrder }),
		...(node.isInverse === true && { isInverse: node.isInverse })
	});
}

/**
 * Une base de facteur : ce que `tidy` ne sait pas décomposer ressort tel quel,
 * enfants mis au propre (§E du contrat).
 */
function tidyAtom(node: MathNode): MathNode {
	switch (node.type) {
		case 'function':
			return tidyFunction(node);
		case 'addition':
		case 'subtraction':
			return tidyNestedSum(node);
		case 'unit':
			return withUnit(tidyExpression(node.expression), node.unit);
		case 'superscript':
			return superscript(tidyExpression(node.base), tidyExpression(node.superscript));
		case 'subscript':
			return subscript(tidyExpression(node.base), node.subscript);
		case 'relation':
		case 'matrix':
		case 'piecewise':
		case 'limit':
		case 'logical':
		case 'logical-not':
		case 'complex':
		case 'composition':
			return tidyStructure(node);
		default:
			return node;
	}
}

function tidySum(node: MathNode, compare: (a: TidyTerm, b: TidyTerm) => number): MathNode {
	const terms = collectLikeTerms(toSumTerms(node));
	return buildSum([...terms].sort(compare));
}

/** Une expression : somme de termes, regroupés puis ordonnés puis réécrits. */
export function tidyExpression(node: MathNode): MathNode {
	return tidySum(node, compareTerms);
}

/**
 * Une somme entre parenthèses (base d'un facteur) : mêmes regroupements, mais
 * l'ordre d'écriture des termes de même degré est conservé. Voir
 * `compareNestedTerms`.
 */
function tidyNestedSum(node: MathNode): MathNode {
	return tidySum(node, compareNestedTerms);
}

/**
 * §E — relation, matrice, morceau, limite : le nœud est conservé, ses enfants
 * mis au propre.
 */
function tidyStructure(node: MathNode): MathNode {
	switch (node.type) {
		case 'relation':
			return { ...node, left: tidyNode(node.left), right: tidyNode(node.right) };
		case 'matrix':
			return { ...node, rows: node.rows.map((row) => row.map(tidyNode)) };
		case 'piecewise':
			return {
				...node,
				pieces: node.pieces.map((piece) => ({
					condition: tidyNode(piece.condition),
					value: tidyNode(piece.value)
				})),
				...(node.otherwise !== undefined && { otherwise: tidyNode(node.otherwise) })
			};
		case 'limit':
			return {
				...node,
				expression: tidyNode(node.expression),
				approach: tidyNode(node.approach)
			};
		case 'logical':
			return { ...node, left: tidyNode(node.left), right: tidyNode(node.right) };
		case 'logical-not':
			return { ...node, operand: tidyNode(node.operand) };
		case 'complex':
			return { ...node, real: tidyNode(node.real), imaginary: tidyNode(node.imaginary) };
		case 'composition':
			return { ...node, outer: tidyNode(node.outer), inner: tidyNode(node.inner) };
		default:
			return node;
	}
}

/** Point d'entrée récursif : aiguille entre structure et expression. */
export function tidyNode(node: MathNode): MathNode {
	switch (node.type) {
		case 'relation':
		case 'matrix':
		case 'piecewise':
		case 'limit':
		case 'logical':
		case 'logical-not':
		case 'complex':
		case 'composition':
			return tidyStructure(node);
		case 'boolean':
		case 'infinity':
		case 'signed-zero':
		case 'hole':
			return node;
		default:
			return tidyExpression(node);
	}
}
