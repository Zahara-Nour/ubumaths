/**
 * Le cœur de `tidy` : relire une expression comme une somme de termes.
 *
 * Une fonction par étape du contrat (docs/wip/tidy-phase0.md, §A) :
 *
 * | étape | fonction                                                        |
 * | ----- | --------------------------------------------------------------- |
 * | 1     | `flattenSumShallow` / `flattenProductShallow` (briques)          |
 * | 3     | `absorbFactor` (neutres, signes, `-(-x)`, `x/(-y)`)              |
 * | 4     | `absorbRational` (arithmétique exacte, jamais de décimal)        |
 * | 5     | `collectLikeTerms` (clé = hash des facteurs + unité)             |
 * | 6     | `addFactor` (exposants additionnés sur une base identique)       |
 * | 7     | `absorbSquareRoot` / `reduceRadicalFactors`                      |
 * | 9     | `tidyFunction` (arguments au propre, `sin^2(x)` → superscript)   |
 * | 10    | `absorbQuantity` / `composeUnit` (les grandeurs se composent)    |
 *
 * @module mathAST/tidy/collect
 */

import type { FunctionNode, MathNode, SuperscriptNode, UnitNode } from '../types';
import type { Unit } from '../units/types';
import type { Rational } from '../normal/types';
import type { TidyFactor, TidyTerm } from './types';
import { flattenProductShallow, flattenSumShallow } from '../flatten';
import { getChildren } from '../transforms';
import { extractRational } from '../common/numeric';
import { hashMathNode, hashUnit } from '../normal/hash';
import { extractPerfectPower } from '../normal/radical';
import {
	ONE,
	addRational,
	floorRational,
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
import { multiply as unitMultiply, power as unitPower } from '../units/operations';
import { parse as parseUnit } from '../units/parser';
import { format as formatUnit } from '../units/formatter';
import { buildSum } from './build';
import { sortFactors, sortTerms } from './order';

// =============================================================================
// Types internes
// =============================================================================

/** Un facteur en cours d'accumulation — la version mutable de `TidyFactor`. */
type MutableFactor = {
	base: MathNode;
	exponent: Rational;
	readonly key: string;
};

/** Un facteur d'unité en cours d'accumulation (`km^2`, `h^-1`, …). */
type MutableUnitFactor = {
	readonly unit: Unit;
	exponent: Rational;
};

/** Accumulateur mutable, local à un terme : il ne sort jamais du module. */
type Accumulator = {
	coefficient: Rational;
	readonly factors: Map<string, MutableFactor>;
	readonly unitFactors: Map<string, MutableUnitFactor>;
};

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, la recherche du plus grand carré diviseur coûterait trop cher. */
const MAX_RADICAND_FOR_FACTORING = 1_000_000_000_000n;

/**
 * Plafond d'évaluation d'une puissance numérique (finding R2).
 *
 * `2^10` vaut 1024, mais `2^100000` est un entier de 30 103 chiffres : le
 * replier coûte cher et rend une écriture illisible. Au-delà du plafond la
 * puissance reste symbolique. Le plafond borne aussi la conversion
 * `bigint → number` des exposants, qui serait sinon silencieusement fausse.
 */
const MAX_NUMERIC_EXPONENT = 256n;

// =============================================================================
// Helpers rationnels et numériques
// =============================================================================

/** L'exposant tient-il dans le plafond d'évaluation ? */
function isEvaluableExponent(exponent: Rational): boolean {
	if (!isIntegerRational(exponent)) return false;
	const magnitude = exponent.n < 0n ? -exponent.n : exponent.n;
	return magnitude <= MAX_NUMERIC_EXPONENT;
}

/**
 * La valeur rationnelle d'un nœud, `extractRational` étendu aux quotients de
 * nombres : `extractRational` ne descend pas dans une `division`, si bien que
 * `sqrt(1/2)` passait pour un radicande symbolique (finding C7).
 */
function rationalValue(node: MathNode): Rational | null {
	const direct = extractRational(node);
	if (direct !== null) return direct;

	if (node.type === 'division') {
		const numerator = rationalValue(node.numerator);
		const denominator = rationalValue(node.denominator);
		if (numerator === null || denominator === null) return null;
		if (isZeroRational(denominator)) return null;
		return rational(numerator.n * denominator.d, numerator.d * denominator.n);
	}
	if (node.type === 'delimiter') return rationalValue(node.content);
	if (node.type === 'opposite') {
		const inner = rationalValue(node.operand);
		return inner === null ? null : negRational(inner);
	}
	if (node.type === 'positive') return rationalValue(node.operand);
	return null;
}

function isZeroNumberNode(node: MathNode): boolean {
	const value = extractRational(node);
	return value !== null && isZeroRational(value);
}

/**
 * Ce terme divise-t-il par zéro ? Un tel terme n'est jamais fusionné avec un
 * autre, et un coefficient nul ne l'efface pas : `0/0` n'est pas `0`
 * (finding C2).
 */
function dividesByZero(term: TidyTerm): boolean {
	return term.factors.some((factor) => factor.exponent.n < 0n && isZeroNumberNode(factor.base));
}

/**
 * Ce nœud contient-il un infini ou un zéro signé ? Ces nœuds sont opaques
 * **partout** : un terme qui en contient un ressort tel quel (finding C3).
 */
function containsOpaqueNode(node: MathNode): boolean {
	if (node.type === 'infinity' || node.type === 'signed-zero') return true;
	return getChildren(node).some(containsOpaqueNode);
}

// =============================================================================
// Unités
// =============================================================================

/** Une unité affine (°C, °F) ne se compose ni ne s'additionne (finding C5). */
function isAffineUnit(unit: Unit): boolean {
	return unit.offset !== undefined && unit.offset !== 0;
}

/**
 * L'écriture d'une unité composée, dans la grammaire du parseur d'unités :
 * facteurs positifs joints par `.`, chaque facteur négatif derrière un `/`
 * (`km.m/s^2`). `null` dès qu'un exposant n'est pas entier.
 *
 * Passer par l'écriture — comme `combineUnitFactors` de `normal/denormalize` —
 * préserve l'unité écrite par l'utilisateur : `12[km]·3[km]` donne `36[km^2]`
 * et non `36[m^2]`.
 */
function unitLabel(factors: readonly MutableUnitFactor[]): string | null {
	const positive: string[] = [];
	const negative: string[] = [];

	for (const { unit, exponent } of factors) {
		if (exponent.d !== 1n) return null;
		const symbol = unit.original ?? formatUnit(unit);
		const magnitude = exponent.n < 0n ? -exponent.n : exponent.n;
		const part = magnitude === 1n ? symbol : `${symbol}^${magnitude}`;
		(exponent.n < 0n ? negative : positive).push(part);
	}

	if (positive.length === 0) {
		return factors
			.map(({ unit, exponent }) => `${unit.original ?? formatUnit(unit)}^${exponent.n}`)
			.join('.');
	}
	return positive.join('.') + negative.map((part) => `/${part}`).join('');
}

/** Étape 10 — compose les facteurs d'unité d'un terme en une seule unité. */
function composeUnit(factors: readonly MutableUnitFactor[]): Unit | null {
	if (factors.length === 0) return null;
	if (factors.length === 1 && isOneRational(factors[0].exponent)) return factors[0].unit;

	const label = unitLabel(factors);
	const parsed = label === null ? null : parseUnit(label);
	if (parsed !== null) return parsed;

	// Repli : composition par les opérations du module units, sans écriture
	// d'origine (exposant fractionnaire, ou écriture que le parseur refuse).
	const raise = ({ unit, exponent }: MutableUnitFactor): Unit =>
		isOneRational(exponent) ? unit : unitPower(unit, Number(exponent.n) / Number(exponent.d));

	return factors.reduce<Unit | null>(
		(combined, factor) =>
			combined === null ? raise(factor) : unitMultiply(combined, raise(factor)),
		null
	);
}

// =============================================================================
// Accumulation des facteurs
// =============================================================================

function addFactor(acc: Accumulator, base: MathNode, exponent: Rational): void {
	const key = hashMathNode(base);
	const existing = acc.factors.get(key);

	if (existing === undefined) {
		if (isZeroRational(exponent)) return;
		acc.factors.set(key, { base, exponent, key });
		return;
	}

	const merged = addRational(existing.exponent, exponent);
	if (isZeroRational(merged)) {
		acc.factors.delete(key);
		return;
	}
	existing.exponent = merged;
}

function addUnitFactor(acc: Accumulator, unit: Unit, exponent: Rational): void {
	const key = hashUnit(unit);
	const existing = acc.unitFactors.get(key);

	if (existing === undefined) {
		acc.unitFactors.set(key, { unit, exponent });
		return;
	}
	existing.exponent = addRational(existing.exponent, exponent);
}

/** Étape 4 — arithmétique exacte : `r^exponent` replié dans le coefficient. */
function absorbRational(r: Rational, exponent: Rational, acc: Accumulator): boolean {
	if (!isEvaluableExponent(exponent)) return false;
	if (isZeroRational(r) && exponent.n <= 0n) return false; // 0^-1 et 0^0 restent écrits

	acc.coefficient = mulRational(acc.coefficient, powRational(r, Number(exponent.n)));
	return true;
}

/**
 * Étape 7 — radicaux numériques. `sqrt(n/d) = (carré extrait/d)·sqrt(reste)`,
 * puis `sqrt(reste)^e = reste^⌊e/2⌋ · sqrt(reste)^(e mod 2)` — ce qui
 * rationalise aussi `1/sqrt(2) → sqrt(2)/2`.
 */
function absorbSquareRoot(radicand: Rational, exponent: Rational, acc: Accumulator): boolean {
	if (!isEvaluableExponent(exponent)) return false;
	if (!isPositiveRational(radicand)) return false;

	const product = radicand.n * radicand.d;
	if (product > MAX_RADICAND_FOR_FACTORING) return false;

	const [extracted, rest] = extractPerfectPower(product, 2n);
	const outside = rational(extracted, radicand.d);
	acc.coefficient = mulRational(acc.coefficient, powRational(outside, Number(exponent.n)));

	if (rest > 1n) {
		const halves = floorRational(rational(exponent.n, 2n));
		const remainder = exponent.n - 2n * halves;
		acc.coefficient = mulRational(acc.coefficient, powRational(fromInteger(rest), Number(halves)));
		if (remainder === 1n) addFactor(acc, sqrtNode(number(rest.toString())), ONE);
	}
	return true;
}

/** Le radicande rationnel positif d'un `sqrt(...)`, ou `null`. */
function squareRootRadicand(node: MathNode): Rational | null {
	if (!isFunction(node)) return null;
	if (node.name !== 'sqrt' || node.args.length !== 1) return null;
	if (node.power !== undefined || node.base !== undefined) return null;
	const value = rationalValue(node.args[0]);
	return value !== null && isPositiveRational(value) ? value : null;
}

/**
 * Après fusion des facteurs, `sqrt(2)·sqrt(2)` est devenu `sqrt(2)^2` : on
 * repasse ces facteurs radicaux dans l'étape 7, jusqu'au point fixe (chaque
 * passe retire au moins un facteur radical, donc la boucle termine).
 */
function reduceRadicalFactors(acc: Accumulator): void {
	let changed = true;
	while (changed) {
		changed = false;
		for (const [key, factor] of acc.factors) {
			if (isOneRational(factor.exponent)) continue;
			const radicand = squareRootRadicand(factor.base);
			if (radicand === null) continue;

			acc.factors.delete(key);
			if (absorbSquareRoot(radicand, factor.exponent, acc)) {
				changed = true;
			} else {
				acc.factors.set(key, factor);
			}
		}
	}
}

/** Étape 10 — une grandeur numérique cède sa valeur et son unité au terme. */
function absorbQuantity(node: UnitNode, exponent: Rational, acc: Accumulator): boolean {
	if (isAffineUnit(node.unit)) return false;
	if (!isIntegerRational(exponent)) return false;

	const value = rationalValue(node.expression);
	if (value === null) return false;
	if (!absorbRational(value, exponent, acc)) return false;

	addUnitFactor(acc, node.unit, exponent);
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

/** `0^0` n'a pas de valeur : la puissance reste écrite (finding C6). */
function isIndeterminatePower(node: SuperscriptNode, totalExponent: Rational): boolean {
	return isZeroRational(totalExponent) && isZeroNumberNode(node.base);
}

/**
 * Étapes 1, 3, 4, 6, 7, 10 — absorbe `node^exponent` dans l'accumulateur.
 *
 * Les délimiteurs sont traversés : à l'intérieur d'un produit ils ne portent
 * aucune information (les parenthèses sont **réécrites** à la construction).
 *
 * `alreadyTidied` évite de remettre au propre une base déjà traitée : une base
 * opaque est d'abord mise au propre, puis **ré-absorbée** (finding C1), pour
 * que `x·(3−1)` donne `2x` dès la première passe.
 */
function absorbFactor(
	node: MathNode,
	exponent: Rational,
	acc: Accumulator,
	alreadyTidied = false
): void {
	switch (node.type) {
		case 'delimiter':
			absorbFactor(node.content, exponent, acc, alreadyTidied);
			return;

		case 'positive':
			absorbFactor(node.operand, exponent, acc, alreadyTidied);
			return;

		case 'opposite':
			if (isIntegerRational(exponent)) {
				if (exponent.n % 2n !== 0n) acc.coefficient = negRational(acc.coefficient);
				absorbFactor(node.operand, exponent, acc, alreadyTidied);
				return;
			}
			break;

		case 'multiplication':
			absorbFactor(node.left, exponent, acc, alreadyTidied);
			absorbFactor(node.right, exponent, acc, alreadyTidied);
			return;

		case 'division':
			absorbFactor(node.numerator, exponent, acc, alreadyTidied);
			absorbFactor(node.denominator, negRational(exponent), acc, alreadyTidied);
			return;

		case 'superscript': {
			const innerExponent = extractRational(node.superscript);
			if (innerExponent !== null) {
				const total = mulRational(exponent, innerExponent);
				if (!isIndeterminatePower(node, total)) {
					absorbFactor(node.base, total, acc, alreadyTidied);
					return;
				}
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

	if (alreadyTidied) {
		addFactor(acc, node, exponent);
		return;
	}

	// Finding C1 : la base est mise au propre AVANT d'être absorbée. Si la mise
	// au propre l'a changée (`3−1` devient `2`), on la ré-absorbe pour que le
	// nombre rejoigne le coefficient au lieu de rester un facteur.
	const cleaned = tidyAtom(node);
	if (hashMathNode(cleaned) === hashMathNode(node)) {
		addFactor(acc, cleaned, exponent);
		return;
	}
	absorbFactor(cleaned, exponent, acc, true);
}

// =============================================================================
// Un terme, une somme
// =============================================================================

function toTerm(node: MathNode): TidyTerm {
	const acc: Accumulator = {
		coefficient: ONE,
		factors: new Map<string, MutableFactor>(),
		unitFactors: new Map<string, MutableUnitFactor>()
	};

	for (const { factor } of flattenProductShallow(node)) {
		absorbFactor(factor, ONE, acc);
	}
	reduceRadicalFactors(acc);

	const factors: TidyFactor[] = [...acc.factors.values()].map(({ base, exponent, key }) => ({
		base,
		exponent,
		key
	}));

	return {
		coefficient: acc.coefficient,
		factors: sortFactors(factors),
		unit: composeUnit([...acc.unitFactors.values()]),
		verbatim: false
	};
}

/** Un terme rendu tel quel : il porte un nœud opaque (infini, zéro signé). */
function verbatimTerm(node: MathNode, negative: boolean): TidyTerm {
	return {
		coefficient: negative ? { n: -1n, d: 1n } : ONE,
		factors: [{ base: node, exponent: ONE, key: hashMathNode(node) }],
		unit: null,
		verbatim: true
	};
}

function isSumNode(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

function negateTerm(term: TidyTerm): TidyTerm {
	return { ...term, coefficient: negRational(term.coefficient) };
}

/**
 * Ce terme n'est qu'une somme, sans coefficient ni unité : ses propres termes
 * remontent dans la somme englobante. Le coefficient doit valoir exactement 1 —
 * à −1 il s'agit de `-(x+2)`, que le contrat laisse tel quel (pas de
 * distribution).
 */
function expandableSum(term: TidyTerm): MathNode | null {
	if (term.verbatim || term.unit !== null) return null;
	if (!isOneRational(term.coefficient)) return null;
	if (term.factors.length !== 1) return null;

	const [factor] = term.factors;
	if (!isOneRational(factor.exponent)) return null;
	return isSumNode(factor.base) ? factor.base : null;
}

/**
 * Étape 1 — aplatir la somme. Un délimiteur précédé d'un `+` ne sépare rien
 * (`(a+b)+c → a+b+c`) ; précédé d'un `-` il reste opaque, sinon `tidy`
 * distribuerait le signe — ce que le contrat interdit (`-(x+2)` inchangé).
 */
function toSumTerms(node: MathNode): TidyTerm[] {
	const terms: TidyTerm[] = [];

	for (const { sign, term } of flattenSumShallow(node)) {
		if (containsOpaqueNode(term)) {
			terms.push(verbatimTerm(term, sign === '-'));
			continue;
		}
		if (sign === '+' && isDelimiter(term) && isSumNode(term.content)) {
			terms.push(...toSumTerms(term.content));
			continue;
		}

		const collected = toTerm(term);
		// Précédé d'un `-`, une somme reste groupée : `-(x+2)` n'est pas distribué.
		const inner = sign === '+' ? expandableSum(collected) : null;
		if (inner !== null) {
			terms.push(...toSumTerms(inner));
			continue;
		}
		terms.push(sign === '-' ? negateTerm(collected) : collected);
	}

	return terms;
}

/** Étape 5 — termes semblables : même clé structurelle, coefficients repliés. */
function collectLikeTerms(terms: readonly TidyTerm[]): TidyTerm[] {
	const groups = new Map<string, { coefficient: Rational; term: TidyTerm }>();

	terms.forEach((term, index) => {
		// Un terme opaque ou singulier ne se regroupe avec rien : clé unique.
		const groupable = !term.verbatim && !dividesByZero(term);
		const key = groupable
			? term.factors.map((f) => `${f.key}^${f.exponent.n}/${f.exponent.d}`).join('*') +
				'|' +
				(term.unit === null ? '' : hashUnit(term.unit))
			: `!${index}`;

		const existing = groups.get(key);
		if (existing) {
			existing.coefficient = addRational(existing.coefficient, term.coefficient);
		} else {
			groups.set(key, { coefficient: term.coefficient, term });
		}
	});

	const result: TidyTerm[] = [];
	for (const { coefficient, term } of groups.values()) {
		// Un coefficient nul efface le terme — sauf s'il divise par zéro : `0/0`
		// n'est pas `0` (finding C2).
		if (isZeroRational(coefficient) && !dividesByZero(term)) continue;
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
 * enfants mis au propre (§E du contrat). Les nœuds opaques (infini, zéro
 * signé) ne sont pas touchés.
 */
function tidyAtom(node: MathNode): MathNode {
	if (containsOpaqueNode(node)) return node;

	switch (node.type) {
		case 'function':
			return tidyFunction(node);
		case 'addition':
		case 'subtraction':
			return tidyExpression(node);
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

/** Une expression : somme de termes, regroupés puis ordonnés puis réécrits. */
export function tidyExpression(node: MathNode): MathNode {
	return buildSum(sortTerms(collectLikeTerms(toSumTerms(node))));
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
