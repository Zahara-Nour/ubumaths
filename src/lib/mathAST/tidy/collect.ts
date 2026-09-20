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
import type { TidyFactor, TidyQuantity, TidyTerm } from './types';
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
	rational,
	rationalToNumber,
	divRational
} from '../normal/rational';
import { func, number, subscript, superscript, withUnit, sqrt as sqrtNode } from '../factory';
import { isDelimiter, isFunction } from '../guards';
import { parse as parseUnit, parseUnitTerms } from '../units/parser';
import { format as formatUnit } from '../units/formatter';
import { exactConversion, dimensionKey } from '../units/exact';
import { recognizeDerivedUnit } from '../units/conversion';
import { getPrimaryBaseSymbol, selectBestUnit } from '../units/selection';
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

/**
 * Accumulateur mutable, local à un terme : il ne sort jamais du module.
 *
 * `unitSymbols` compte les unités **nommées** (`km`, `h`) et leurs exposants
 * signés : c'est ce qui fait que `v[km/h]·t[h]` rend `km` et non `km.h/h`.
 */
type Accumulator = {
	coefficient: Rational;
	readonly factors: Map<string, MutableFactor>;
	readonly unitSymbols: Map<string, number>;
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
 * unités positives jointes par `.`, chaque unité négative derrière un `/`
 * (`km.m/s^2`). `null` s'il ne reste aucune unité (tout s'est annulé).
 *
 * Passer par l'écriture — comme `combineUnitFactors` de `normal/denormalize` —
 * préserve l'unité écrite par l'utilisateur : `12[km]·3[km]` donne `36[km^2]`
 * et non `36[m^2]`, et `v[km/h]·t[h]` donne `km`, pas `km.h/h`.
 */
function unitLabel(symbols: ReadonlyMap<string, number>): string | null {
	const positive: string[] = [];
	const negative: string[] = [];

	for (const [symbol, exponent] of symbols) {
		if (exponent === 0) continue;
		const magnitude = Math.abs(exponent);
		const part = magnitude === 1 ? symbol : `${symbol}^${magnitude}`;
		(exponent < 0 ? negative : positive).push(part);
	}

	if (positive.length === 0 && negative.length === 0) return null;
	if (positive.length === 0) {
		// Pas d'unité au numérateur : `s^-1` plutôt que `/s`, qui n'a pas de
		// premier terme et que le parseur d'unités refuse.
		return [...symbols]
			.filter(([, exponent]) => exponent !== 0)
			.map(([symbol, exponent]) => `${symbol}^${exponent}`)
			.join('.');
	}
	return positive.join('.') + negative.map((part) => `/${part}`).join('');
}

/** L'écriture d'une unité, telle que l'utilisateur l'a posée. */
function unitWriting(unit: Unit): string {
	return unit.original ?? formatUnit(unit);
}

/** Étape 10 — compose les unités nommées d'un terme en une seule unité. */
function composeUnit(symbols: ReadonlyMap<string, number>): Unit | null {
	const label = unitLabel(symbols);
	if (label === null) return null;
	return parseUnit(label);
}

/**
 * L'unité de base d'une conversion, coefficient 1 : `km` → `m`,
 * `kg.m/s^2` → `g.m/s^2`. `null` si l'écriture n'est pas relisible.
 */
function baseUnitOf(components: ReadonlyMap<string, number>): Unit | null {
	const label = unitLabel(components);
	return label === null ? null : parseUnit(label);
}

/**
 * Ce qu'il faut savoir d'une grandeur pour la regrouper et la réécrire.
 * `null` pour une unité que la table ne sait pas convertir exactement.
 */
function quantityOf(unit: Unit): TidyQuantity | null {
	const conversion = exactConversion(unitWriting(unit));
	if (conversion === null || conversion.offset !== null) return null;
	// π en facteur (le degré) : la valeur en unité de base n'est pas rationnelle
	// (`180[°]` vaut `π rad`, pas `1 rad`). L'unité écrite est conservée.
	if (conversion.piPower !== 0) return null;
	const baseUnit = baseUnitOf(conversion.components);
	if (baseUnit === null) return null;
	return {
		factor: conversion.coefficient,
		baseUnit,
		dimension: dimensionKey(conversion)
	};
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

/**
 * Ajoute les unités **nommées** d'une écriture, exposants multipliés par celui
 * du facteur. `false` si l'écriture n'est pas relisible : la grandeur reste
 * alors un facteur opaque.
 */
function addUnitFactor(acc: Accumulator, unit: Unit, exponent: number): boolean {
	const terms = parseUnitTerms(unitWriting(unit));
	if (terms === null) return false;

	for (const term of terms) {
		const total = (acc.unitSymbols.get(term.symbol) ?? 0) + term.exponent * exponent;
		if (total === 0) acc.unitSymbols.delete(term.symbol);
		else acc.unitSymbols.set(term.symbol, total);
	}
	return true;
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
		// Instantané obligatoire : la boucle retire, remet et ajoute des entrées
		// dans `acc.factors` — itérer la map elle-même revisiterait une clé remise
		// en fin de map dans la même passe.
		const snapshot = [...acc.factors];
		for (const [key, factor] of snapshot) {
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

/**
 * Étape 10 — une grandeur cède son unité au terme, et son expression au reste
 * de l'accumulation : une valeur rejoint le coefficient (`12[km]`), un symbole
 * devient un facteur ordinaire (`v[km/h]` → facteur `v`, unité `km/h`).
 *
 * Une unité affine (°C, °F) ne se compose pas : la grandeur reste opaque
 * **en bloc** (finding C5, et §D.2).
 */
function absorbQuantity(node: UnitNode, exponent: Rational, acc: Accumulator): boolean {
	if (isAffineUnit(node.unit)) return false;
	if (!isEvaluableExponent(exponent)) return false;
	if (!addUnitFactor(acc, node.unit, Number(exponent.n))) return false;

	absorbFactor(node.expression, exponent, acc);
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
		unitSymbols: new Map<string, number>()
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

	const unit = composeUnit(acc.unitSymbols);

	return {
		coefficient: acc.coefficient,
		factors: sortFactors(factors),
		unit,
		verbatim: false,
		quantity: unit === null ? null : quantityOf(unit),
		decimal: false
	};
}

/** Un terme rendu tel quel : il porte un nœud opaque (infini, zéro signé). */
function verbatimTerm(node: MathNode, negative: boolean): TidyTerm {
	return {
		coefficient: negative ? { n: -1n, d: 1n } : ONE,
		factors: [{ base: node, exponent: ONE, key: hashMathNode(node) }],
		unit: null,
		verbatim: true,
		quantity: null,
		decimal: false
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

/**
 * Un groupe en cours de regroupement. Tant que tous les termes partagent la
 * même écriture d'unité, le coefficient reste dans cette écriture ; dès qu'une
 * écriture diffère (`12[km]` et `500[m]`), le groupe bascule **en unités de
 * base** et n'en ressort plus — c'est `chooseUnit` qui rendra son écriture.
 */
type TermGroup = {
	coefficient: Rational;
	term: TidyTerm;
	inBase: boolean;
};

/** La valeur d'un terme en unités de base. */
function baseValue(coefficient: Rational, quantity: TidyQuantity): Rational {
	return mulRational(coefficient, quantity.factor);
}

/** Bascule un groupe en unités de base : même valeur, autre écriture. */
function switchToBase(group: TermGroup, quantity: TidyQuantity): void {
	group.coefficient = baseValue(group.coefficient, quantity);
	group.term = {
		...group.term,
		unit: quantity.baseUnit,
		quantity: { ...quantity, factor: ONE }
	};
	group.inBase = true;
}

/**
 * Étape 5 — termes semblables : même clé structurelle, coefficients repliés.
 *
 * Deux grandeurs de même **dimension** sont semblables même écrites dans des
 * unités différentes (§D.3) : `12[km]+500[m]` fait un seul terme.
 */
function collectLikeTerms(terms: readonly TidyTerm[]): TidyTerm[] {
	const groups = new Map<string, TermGroup>();

	terms.forEach((term, index) => {
		// Un terme opaque ou singulier ne se regroupe avec rien : clé unique.
		const groupable = !term.verbatim && !dividesByZero(term);
		const unitKey =
			term.quantity !== null
				? `D:${term.quantity.dimension}`
				: term.unit === null
					? ''
					: `U:${hashUnit(term.unit)}`;
		const key = groupable
			? term.factors.map((f) => `${f.key}^${f.exponent.n}/${f.exponent.d}`).join('*') +
				'|' +
				unitKey
			: `!${index}`;

		const existing = groups.get(key);
		if (existing === undefined) {
			groups.set(key, { coefficient: term.coefficient, term, inBase: false });
			return;
		}

		const quantity = term.quantity;
		const existingQuantity = existing.term.quantity;
		if (quantity === null || existingQuantity === null) {
			existing.coefficient = addRational(existing.coefficient, term.coefficient);
			return;
		}

		// Écritures différentes : tout le groupe passe en unités de base.
		const existingUnit = existing.term.unit;
		const incomingUnit = term.unit;
		const sameWriting =
			existingUnit !== null &&
			incomingUnit !== null &&
			hashUnit(existingUnit) === hashUnit(incomingUnit);
		if (!existing.inBase && !sameWriting) {
			switchToBase(existing, existingQuantity);
		}
		existing.coefficient = addRational(
			existing.coefficient,
			existing.inBase ? baseValue(term.coefficient, quantity) : term.coefficient
		);
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
// Étape 10 (suite) — l'unité adaptée à l'ordre de grandeur (§D.3)
// =============================================================================

/**
 * Plancher de lisibilité de `tidy`.
 *
 * §D.3 annonce « entre 0,1 et 1000 », mais ses propres exemples demandent un
 * plancher plus haut : `1[km]-999[m]` doit rendre `1 m` (et non `0,1 dam`, que
 * 0,1 autoriserait) et `0.25[h]` doit rendre `15 min` (et non `0,25 h`).
 * `0.005[m] → 0,5 cm` fixe la borne : le plancher est 0,5, inclus.
 */
const TIDY_MIN_READABLE = 0.5;

/**
 * Réécrit une grandeur **numérique** dans l'unité adaptée à son ordre de
 * grandeur (§D.3) :
 *
 * - unité simple (`m`, `s`, `g`) : la famille donne la meilleure unité
 *   (`12000[m] → 12 km`, `3600[s] → 1 h`) ;
 * - unité composée sans famille (`kg.m/s^2`) : l'unité dérivée reconnue (`N`) ;
 * - sinon l'unité écrite est conservée (`6[km^2]`, `12[km/h]`).
 *
 * Une grandeur **symbolique** (`x[m]`) garde son unité : pas de choix d'unité,
 * pas de décimal. Une **température** n'a pas de `quantity` (unité affine),
 * elle ne passe jamais par ici.
 */
function chooseUnit(term: TidyTerm): TidyTerm {
	const quantity = term.quantity;
	if (quantity === null || term.verbatim || term.factors.length > 0) return term;

	const value = baseValue(term.coefficient, quantity);
	const rewritten = (unit: Unit): TidyTerm | null => {
		const conversion = exactConversion(unitWriting(unit));
		if (conversion === null || conversion.piPower !== 0 || conversion.offset !== null) return null;
		return {
			...term,
			coefficient: divRational(value, conversion.coefficient),
			unit,
			quantity: { ...quantity, factor: conversion.coefficient },
			decimal: true
		};
	};

	// Unité simple : la famille donne la meilleure unité.
	if (getPrimaryBaseSymbol(quantity.baseUnit) !== null) {
		const best = selectBestUnit(rationalToNumber(value), quantity.baseUnit, TIDY_MIN_READABLE);
		const chosen = rewritten(best.unit);
		if (chosen !== null) return chosen;
	}

	// Unité composée sans famille : l'unité dérivée nommée, quand il y en a une.
	if (quantity.baseUnit.components.size >= 2) {
		const derived = recognizeDerivedUnit(quantity.baseUnit);
		const chosen = derived === null ? null : rewritten(derived);
		if (chosen !== null) return chosen;
	}

	// Sinon l'unité écrite est conservée, la valeur en décimal.
	return { ...term, decimal: true };
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
	return buildSum(sortTerms(collectLikeTerms(toSumTerms(node)).map(chooseUnit)));
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
