/**
 * Les grandeurs dans la console de mathAST (Calcul de l'atelier, `/cas`).
 *
 * Phase 0 `docs/wip/grandeurs-phase0.md`, lot A (validée par David le
 * 2026-10-11) : une grandeur se calcule par `tidy`, **unité écrite d'abord** —
 * comme `{{eval}}` (`evaluate-with-modifiers.ts`). L'ancien chemin,
 * `evaluateWithUnits`, perdait le coefficient de l'unité à l'écriture :
 * `10[km]/1[h]` répondait « 10 m/s » (mesuré le 2026-09-27, puis le 2026-10-11).
 *
 * La réponse est un ARBRE qui garde son unité — c'est lui que l'écran dessine.
 *
 * @module mathAST/cli/quantities
 */

import type { MathNode, UnitNode } from '../types';
import type { Unit } from '../units/types';
import type { Rational } from '../normal/types';
import type { DimensionalError } from '../dimensional/types';
import { tidy } from '../tidy';
import { toCustom } from '../custom-generator';
import { divide, number, opposite, relation, withUnit } from '../factory';
import { isUnit } from '../guards';
import { analyzeDimensions } from '../dimensional/analyzer';
import { parse as parseUnit } from '../units/parser';
import { format as formatUnit } from '../units/formatter';
import {
	getConversionFactor,
	getDimensionalSignature,
	isAffine,
	recognizeDerivedUnit
} from '../units/conversion';
import { decimalString } from '../tidy/decimal';
import { normalize } from '../normal/normalize';
import { denormalize } from '../normal/denormalize';
import { rationalOf, valueIn } from '../eval/evaluate-with-modifiers';
import { approximateDigitsOf } from './approximation';

// =============================================================================
// Types
// =============================================================================

/** Ce que la console répond pour un calcul ou une conversion de grandeurs. */
export type QuantityOutcome =
	| {
			readonly ok: true;
			/** L'arbre à dessiner : une grandeur, un nombre, ou `grandeur = grandeur` */
			readonly node: MathNode;
			/** La même réponse en toutes lettres (console texte, `/cas`) */
			readonly text: string;
			/** La grandeur EXACTE que `.convert` reprendra ; `null` pour un nombre */
			readonly quantity: MathNode | null;
	  }
	| { readonly ok: false; readonly message: string };

export type QuantityMode = 'exact' | 'decimal';

// =============================================================================
// Constantes
// =============================================================================

const TEMPERATURE_MESSAGE = 'Une température en °C ne se multiplie pas : écris-la en kelvins (K).';
const MIXED_MESSAGE = 'Ces grandeurs ne se combinent pas.';
const FUNCTION_MESSAGE = 'Une fonction comme sin ou ln ne s’applique qu’à un nombre sans unité.';

/** Le nom d'une grandeur, par sa signature de dimension (`length^1` → une longueur). */
const DIMENSION_NAMES: Readonly<Record<string, string>> = {
	'': 'un nombre sans unité',
	'length^1': 'une longueur',
	'length^2': 'une aire',
	'area^1': 'une aire',
	'length^3': 'un volume',
	'volume^1': 'un volume',
	'mass^1': 'une masse',
	'time^1': 'une durée',
	'temperature^1': 'une température',
	'angle^1': 'un angle',
	'currency^1': 'une somme d’argent',
	'length^1*time^-1': 'une vitesse'
};

// =============================================================================
// Écrire
// =============================================================================

/** `length^1*time^-1` : la signature d'une unité, triée, pour `DIMENSION_NAMES`. */
function signatureKey(unit: Unit): string {
	return Object.entries(getDimensionalSignature(unit))
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([dimension, exponent]) => `${dimension}^${exponent}`)
		.join('*');
}

/** « une longueur », « une durée » — ou « une grandeur en km/h » à défaut. */
function dimensionName(unit: Unit | undefined): string {
	if (unit === undefined) return 'un nombre sans unité';
	return DIMENSION_NAMES[signatureKey(unit)] ?? `une grandeur en ${formatUnit(unit, 'original')}`;
}

/** L'écriture d'une unité telle qu'on la lit : `km/h`, `mm^2`. */
function unitWriting(unit: Unit): string {
	return formatUnit(unit, 'original');
}

/** Un rationnel en arbre : `12.3` s'il a une écriture décimale finie, `10/3` sinon. */
function rationalNode(r: Rational): MathNode {
	const negative = r.n < 0n;
	const size: Rational = { n: negative ? -r.n : r.n, d: r.d };
	const decimal = decimalString(size);
	const magnitude =
		decimal !== null
			? number(decimal)
			: divide(number(size.n.toString()), number(size.d.toString()), 'fraction');
	return negative ? opposite(magnitude) : magnitude;
}

/** La grandeur d'un nœud : `5[km]`, ou l'opposé `-5[km]` ; `null` sinon. */
function quantityOf(node: MathNode): { unit: UnitNode; negative: boolean } | null {
	if (isUnit(node)) return { unit: node, negative: false };
	if (node.type === 'opposite' && isUnit(node.operand)) {
		return { unit: node.operand, negative: true };
	}
	return null;
}

/** `10/3 km`, `-3 m` : une grandeur en toutes lettres. */
function quantityText(node: MathNode): string {
	const quantity = quantityOf(node);
	if (quantity === null) return toCustom(node);
	const sign = quantity.negative ? '-' : '';
	return `${sign}${toCustom(quantity.unit.expression)} ${unitWriting(quantity.unit.unit)}`;
}

/**
 * En mode décimal : 4 décimales, `≈` si l'écriture n'est pas exacte (décision
 * Q3 : la règle du bouton ≈ de #1086). `null` si la valeur n'a pas d'écriture
 * décimale lisible : on garde alors l'exacte.
 */
function decimalQuantity(node: MathNode): { node: MathNode; text: string } | null {
	const quantity = quantityOf(node);
	if (quantity === null) return null;
	const value = quantity.negative ? opposite(quantity.unit.expression) : quantity.unit.expression;
	const digits = approximateDigitsOf(value);
	if (digits === null) return null;
	const magnitude = digits.digits.replace(/^-/, '');
	const written = withUnit(number(magnitude), quantity.unit.unit);
	return {
		node: digits.digits.startsWith('-') ? opposite(written) : written,
		text: `${digits.exact ? '' : '≈ '}${digits.digits} ${unitWriting(quantity.unit.unit)}`
	};
}

// =============================================================================
// Refuser, en français
// =============================================================================

/** Une température (°C, °F) prise dans un produit, un quotient, une puissance, une fonction. */
function multipliesTemperature(node: MathNode, composed = false): boolean {
	if (isUnit(node)) {
		return (composed && isAffine(node.unit)) || multipliesTemperature(node.expression, composed);
	}
	switch (node.type) {
		case 'multiplication':
			return multipliesTemperature(node.left, true) || multipliesTemperature(node.right, true);
		case 'division':
			return (
				multipliesTemperature(node.numerator, true) || multipliesTemperature(node.denominator, true)
			);
		case 'superscript':
			return (
				multipliesTemperature(node.base, true) || multipliesTemperature(node.superscript, true)
			);
		case 'function':
			return node.args.some((arg) => multipliesTemperature(arg, true));
		case 'addition':
		case 'subtraction':
			return (
				multipliesTemperature(node.left, composed) || multipliesTemperature(node.right, composed)
			);
		case 'opposite':
		case 'positive':
			return multipliesTemperature(node.operand, composed);
		case 'delimiter':
			return multipliesTemperature(node.content, composed);
		default:
			return false;
	}
}

/** Le refus d'une erreur de dimension, en français. */
function dimensionMessage(error: DimensionalError): string {
	if (error.code === 'INCOMPATIBLE_UNITS' || error.code === 'INVALID_RELATION') {
		const verb = error.code === 'INVALID_RELATION' ? 'comparer' : 'ajouter';
		const left = dimensionName(error.details?.expected);
		const right = dimensionName(error.details?.actual);
		return `On ne peut pas ${verb} ${left} et ${right}.`;
	}
	if (error.code === 'INVALID_FUNCTION_INPUT') return FUNCTION_MESSAGE;
	return MIXED_MESSAGE;
}

/** Les dimensions de l'expression : une erreur en français, ou l'unité du résultat. */
function checkDimensions(ast: MathNode): { message: string } | { unit: Unit | null } {
	const analysis = analyzeDimensions(ast, {
		variables: new Map(),
		options: { strictMode: true, allowDimensionlessMix: false, allowFractionalExponents: true }
	});
	if (!analysis.valid) return { message: dimensionMessage(analysis.errors[0]) };
	return { unit: analysis.resultUnit };
}

// =============================================================================
// Calculer
// =============================================================================

/**
 * La grandeur mise au propre, unité écrite d'abord. `tidy` ne réduit pas une
 * racine de grandeur (`sqrt(9[m^2])`) : la forme normale, elle, le sait — on
 * la reprend alors, quitte à perdre l'unité écrite.
 */
function reduce(ast: MathNode): MathNode {
	const reduced = tidy(ast, { unitChoice: 'written' });
	if (quantityOf(reduced) !== null || rationalOf(reduced) !== null) return reduced;
	try {
		const normal = tidy(denormalize(normalize(ast)), { unitChoice: 'written' });
		return quantityOf(normal) !== null ? normal : reduced;
	} catch {
		return reduced;
	}
}

/**
 * `19.62[m.kg/s^2]` : la même grandeur dans son unité dérivée nommée (`N`),
 * si l'unité écrite en est une écriture composée — sinon `null`.
 */
function namedDerived(node: MathNode): MathNode | null {
	const quantity = quantityOf(node);
	if (quantity === null || quantity.unit.unit.components.size < 2) return null;
	const derived = recognizeDerivedUnit(quantity.unit.unit);
	if (derived?.original === undefined) return null;
	if (derived.original === quantity.unit.unit.original) return null;
	const value = valueIn(node, derived.original);
	return value === null ? null : withUnitSigned(value, derived);
}

/** Un rationnel muni d'une unité, le signe devant : `-3[m]`. */
function withUnitSigned(value: Rational, unit: Unit): MathNode {
	const node = rationalNode(value);
	return node.type === 'opposite' ? opposite(withUnit(node.operand, unit)) : withUnit(node, unit);
}

/**
 * Calculer une expression qui contient des grandeurs.
 *
 * - une grandeur : `10[km]/1[h]` → `10 km/h` ;
 * - un nombre quand les unités se simplifient : `3[h]/1[min]` → `180` ;
 * - un zéro garde son unité : `3[m]-3[m]` → `0 m` ;
 * - l'unité dérivée nommée suit l'unité écrite : `19.62 m.kg/s^2 = 19.62 N`.
 */
export function computeQuantity(ast: MathNode, mode: QuantityMode): QuantityOutcome {
	if (multipliesTemperature(ast)) return { ok: false, message: TEMPERATURE_MESSAGE };
	const dimensions = checkDimensions(ast);
	if ('message' in dimensions) return { ok: false, message: dimensions.message };

	const reduced = reduce(ast);
	const value = rationalOf(reduced);
	if (quantityOf(reduced) === null) {
		if (value === null) return { ok: false, message: MIXED_MESSAGE };
		// Un zéro : `tidy` rend `0` sans unité, l'analyse la retrouve
		if (value.n === 0n && dimensions.unit !== null && dimensions.unit.components.size > 0) {
			const zero = withUnit(number(0), dimensions.unit);
			return { ok: true, node: zero, text: quantityText(zero), quantity: zero };
		}
		const decimal = mode === 'decimal' ? approximateDigitsOf(reduced) : null;
		const written = decimal === null ? reduced : number(decimal.digits);
		const text =
			decimal === null ? toCustom(reduced) : `${decimal.exact ? '' : '≈ '}${decimal.digits}`;
		return { ok: true, node: written, text, quantity: null };
	}

	const shown = mode === 'decimal' ? (decimalQuantity(reduced) ?? null) : null;
	const node = shown?.node ?? reduced;
	const text = shown?.text ?? quantityText(reduced);
	const derived = namedDerived(reduced);
	if (derived === null) return { ok: true, node, text, quantity: reduced };
	const derivedShown = mode === 'decimal' ? decimalQuantity(derived) : null;
	return {
		ok: true,
		node: relation('=', node, derivedShown?.node ?? derived),
		text: `${text} = ${derivedShown?.text ?? quantityText(derived)}`,
		quantity: reduced
	};
}

/**
 * `.convert` : la dernière grandeur exprimée dans `target`, exactement —
 * `12.3 km = 12300 m`, `2.5 km/h = 25/36 m/s`.
 */
export function convertQuantity(
	quantity: MathNode | null,
	target: string,
	mode: QuantityMode
): QuantityOutcome {
	if (quantity === null) {
		return {
			ok: false,
			message:
				"Il n'y a pas de grandeur à convertir : calcule d'abord une grandeur, par exemple 12[km]+300[m]."
		};
	}
	const written = target.trim();
	if (written === '') {
		return { ok: false, message: 'Indique l’unité voulue, par exemple : .convertir m.' };
	}
	const unit = parseUnit(written);
	if (unit === null) return { ok: false, message: `Unité inconnue : ${written}.` };
	const source = quantityOf(quantity);
	if (source === null || getConversionFactor(source.unit.unit, unit) === null) {
		const from = source === null ? '?' : unitWriting(source.unit.unit);
		return {
			ok: false,
			message: `On ne peut pas convertir des ${from} en ${written} : ce ne sont pas les mêmes grandeurs.`
		};
	}
	const value = valueIn(quantity, written);
	if (value === null) return { ok: false, message: MIXED_MESSAGE };
	const converted = withUnitSigned(value, { ...unit, original: written });
	const left = mode === 'decimal' ? decimalQuantity(quantity) : null;
	const right = mode === 'decimal' ? decimalQuantity(converted) : null;
	return {
		ok: true,
		node: relation('=', left?.node ?? quantity, right?.node ?? converted),
		text: `${left?.text ?? quantityText(quantity)} = ${right?.text ?? quantityText(converted)}`,
		quantity
	};
}
