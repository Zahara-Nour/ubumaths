/**
 * Les grandeurs dans la console de mathAST (Calcul de l'atelier, `pnpm math`).
 *
 * Phase 0 `docs/archive/wip/grandeurs-phase0.md`, lot A (validée par David le
 * 2026-10-11) : une grandeur se calcule par `tidy`, **unité écrite d'abord** —
 * comme `{{eval}}` (`evaluate-with-modifiers.ts`). L'ancien chemin,
 * `evaluateWithUnits`, perdait le coefficient de l'unité à l'écriture :
 * `10[km]/1[h]` répondait « 10 m/s » (mesuré le 2026-09-27, puis le 2026-10-11).
 *
 * Ce que `tidy` ne réduit pas (racine, valeur absolue, fonction d'un angle,
 * comparaison) passe par un repli EXACT : chaque grandeur ramenée à ses unités
 * de base (`9[km^2]` → `9·1000000`, `30[°]` → `30·π/180`), puis exprimée dans
 * une unité écrite par l'élève quand elle y tombe juste (revue du lot A).
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
import {
	delimiter,
	divide,
	juxtaposedSum,
	multiply,
	number,
	opposite,
	piConstant,
	power,
	relation,
	withUnit
} from '../factory';
import { hasUnitDescendant, isUnit } from '../guards';
import { findNodes, mapNode } from '../transforms';
import { analyzeDimensions } from '../dimensional/analyzer';
import { evaluate } from '../eval/evaluate';
import { parse as parseUnit, parseUnitTerms } from '../units/parser';
import { format as formatUnit } from '../units/formatter';
import { exactConversion } from '../units/exact';
import {
	getConversionFactor,
	getDimensionalSignature,
	isAffine,
	isMultipliedTemperature,
	recognizeDerivedUnit
} from '../units/conversion';
import { addRational, divRational, mulRational, subRational } from '../normal/rational';
import { decimalString } from '../tidy/decimal';
import { rationalOf, valueIn } from '../eval/evaluate-with-modifiers';
import { approximateDigitsOf, approximationNode, approximationText } from './approximation';

// =============================================================================
// Types
// =============================================================================

/** Une réponse prête à montrer : l'arbre à dessiner et le même en toutes lettres. */
export interface QuantityAnswer {
	readonly node: MathNode;
	readonly text: string;
}

/** Ce que la console répond pour un calcul ou une conversion de grandeurs. */
export type QuantityOutcome =
	| {
			readonly ok: true;
			/** La réponse dans le mode demandé (exact ou décimal) */
			readonly answer: QuantityAnswer;
			/** La réponse exacte et la décimale (bascule de l'ancienne `/cas`, retirée le 2026-10-13) */
			readonly exact: QuantityAnswer;
			readonly decimal: QuantityAnswer;
			/** L'arbre du bouton ≈ de l'atelier, quand la valeur exacte n'est pas décimale */
			readonly approximate: MathNode | null;
			/** La grandeur EXACTE que `.convert` reprendra */
			readonly quantity: MathNode | null;
			/**
			 * Ce que l'élève a vu de cette grandeur quand ce n'est pas la grandeur
			 * elle-même (une durée composée, `2 h 30 min`) : le membre gauche de
			 * `.convert`, qui sinon écrirait `2,5 h` (restes du lot C)
			 */
			readonly written?: QuantityAnswer;
	  }
	/**
	 * Les unités se sont simplifiées (`3[h]/1[min]`, `sin(30[°])`, `5[km]>3[m]`) :
	 * un calcul de nombres, que la console traite comme tout autre nombre.
	 */
	| { readonly ok: 'plain'; readonly node: MathNode }
	| { readonly ok: false; readonly message: string };

export type QuantityMode = 'exact' | 'decimal';

type Shown = {
	readonly exact: QuantityAnswer;
	readonly decimal: QuantityAnswer;
	readonly approximate: MathNode | null;
};

// =============================================================================
// Constantes
// =============================================================================

const TEMPERATURE_PRODUCT_MESSAGE =
	'Une température en °C ne se multiplie pas : écris-la en kelvins (K).';
const TEMPERATURE_SUM_MESSAGE =
	'Ce calcul de températures n’a pas de sens : on soustrait deux températures (l’écart est en K), ou on ajoute un écart en K à une température, par exemple 20[°C]+5[K].';
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
	'time^-1': 'une fréquence',
	'temperature^1': 'une température',
	'angle^1': 'un angle',
	'currency^1': 'une somme d’argent',
	'information^1': 'une quantité de données',
	'information^1*time^-1': 'un débit',
	'electric_current^1': 'une intensité',
	'amount^1': 'une quantité de matière',
	'length^1*time^-1': 'une vitesse',
	'length^1*time^-2': 'une accélération',
	'length^-3*mass^1': 'une masse volumique',
	'length^1*mass^1*time^-2': 'une force',
	'length^2*mass^1*time^-2': 'une énergie',
	'length^2*mass^1*time^-3': 'une puissance'
};

// =============================================================================
// Lire une grandeur
// =============================================================================

/** La grandeur d'un nœud : `5[km]`, ou l'opposé `-5[km]` ; `null` sinon. */
function quantityOf(node: MathNode): { unit: UnitNode; negative: boolean } | null {
	if (isUnit(node)) return { unit: node, negative: false };
	if (node.type === 'opposite' && isUnit(node.operand)) {
		return { unit: node.operand, negative: true };
	}
	return null;
}

/**
 * Une grandeur RÉDUITE : un nombre muni d'une unité, sans grandeur cachée
 * dedans (revue : `sqrt(9[km^2])/1[h]` rendait `sqrt(9[km^2])[h^-1]`).
 */
function reducedQuantity(node: MathNode): boolean {
	const quantity = quantityOf(node);
	return quantity !== null && findNodes(quantity.unit.expression, isUnit).length === 0;
}

/** L'expression contient-elle une température (°C, °F) ? */
function hasTemperature(node: MathNode): boolean {
	return findNodes(node, (n) => isUnit(n) && isAffine(n.unit)).length > 0;
}

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

function absolute(r: Rational): Rational {
	return r.n < 0n ? { n: -r.n, d: r.d } : r;
}

/** Un rationnel en arbre : `12.3` s'il a une écriture décimale finie, `10/3` sinon. */
function rationalNode(r: Rational): MathNode {
	const size = absolute(r);
	const decimal = decimalString(size);
	const magnitude =
		decimal !== null
			? number(decimal)
			: divide(number(size.n.toString()), number(size.d.toString()), 'fraction');
	return r.n < 0n ? opposite(magnitude) : magnitude;
}

/** Une valeur munie d'une unité, le signe devant : `-3[m]`. */
function signedQuantity(value: MathNode, unit: Unit): MathNode {
	return value.type === 'opposite'
		? opposite(withUnit(value.operand, unit))
		: withUnit(value, unit);
}

/** `10/3 km`, `-3 m` : une grandeur en toutes lettres. */
function quantityText(node: MathNode): string {
	const quantity = quantityOf(node);
	if (quantity === null) return toCustom(node);
	const sign = quantity.negative ? '-' : '';
	return `${sign}${toCustom(quantity.unit.expression)} ${unitWriting(quantity.unit.unit)}`;
}

/**
 * La valeur décimale d'une grandeur : 4 décimales (décision Q3 : la règle du
 * bouton ≈ de #1086), et si elle est exacte. `null` sans écriture lisible.
 */
function decimalOf(node: MathNode): { node: MathNode; text: string; exact: boolean } | null {
	const quantity = quantityOf(node);
	if (quantity === null) return null;
	const value = quantity.negative ? opposite(quantity.unit.expression) : quantity.unit.expression;
	const digits = approximateDigitsOf(value);
	if (digits === null) return null;
	// Hors de [10⁻⁶ ; 10⁹[, la notation scientifique (`9.4607*10^15 m`, décision a)
	const negative = digits.digits.startsWith('-');
	const magnitude = approximationNode({ ...digits, digits: digits.digits.replace(/^-/, '') });
	const written = withUnit(magnitude, quantity.unit.unit);
	return {
		node: negative ? opposite(written) : written,
		text: `${approximationText(digits)} ${unitWriting(quantity.unit.unit)}`,
		exact: digits.exact
	};
}

/** Une grandeur exacte et sa version décimale (`≈` dans le texte si elle n'est pas exacte). */
function both(node: MathNode): Shown {
	const exact = { node, text: quantityText(node) };
	const decimal = decimalOf(node);
	if (decimal === null) return { exact, decimal: exact, approximate: null };
	return {
		exact,
		decimal: { node: decimal.node, text: `${decimal.exact ? '' : '≈ '}${decimal.text}` },
		approximate: decimal.exact ? null : decimal.node
	};
}

/**
 * Deux grandeurs égales (conversion, unité dérivée), en exact et en décimal.
 * En décimal, le signe est `≈` dès qu'un côté n'est pas exact — dans l'arbre
 * comme dans le texte (revue : l'arbre dessinait `=` entre deux arrondis).
 */
function equality(left: MathNode, right: MathNode, written?: QuantityAnswer): Shown {
	// Une durée composée se répète telle que l'élève l'a vue, dans les deux modes
	const exact = {
		node: relation('=', written?.node ?? left, right),
		text: `${written?.text ?? quantityText(left)} = ${quantityText(right)}`
	};
	const l = decimalOf(left);
	const r = decimalOf(right);
	if (l === null || r === null) return { exact, decimal: exact, approximate: null };
	const sign = l.exact && r.exact ? '=' : '≈';
	const shownLeft = written ?? l;
	return {
		exact,
		decimal: {
			node: relation(sign, shownLeft.node, r.node),
			text: `${shownLeft.text} ${sign} ${r.text}`
		},
		// Le bouton ≈ : la grandeur exacte à gauche, la valeur approchée à droite
		approximate: r.exact ? null : relation('≈', left, r.node)
	};
}

// =============================================================================
// Refuser, en français
// =============================================================================

/** Une température (°C, °F) prise dans un produit, un quotient, une puissance, une fonction. */
function multipliesTemperature(node: MathNode, composed = false): boolean {
	if (isUnit(node)) {
		if (isMultipliedTemperature(node)) return true;
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

/**
 * Une grandeur déjà formée clôt le terme (lecture-grandeurs PR 4) : `v*3[h]` se lit
 * (v×3) h tant que `v` est une lettre ; quand `v` est une grandeur du panneau,
 * substituée après la lecture, l'unité redescend sur le dernier facteur, comme si
 * la grandeur avait été écrite : `v*(3 h)`, `d/(2 h)` (revue de la PR 4).
 */
function unitsOverQuantities(ast: MathNode): MathNode {
	return mapNode(ast, (node) =>
		isUnit(node) && hasUnitDescendant(node.expression)
			? unitOnLastFactor(node.expression, node)
			: node
	);
}

/** L'unité de `quantity` posée sur le dernier facteur du terme `term` */
function unitOnLastFactor(term: MathNode, quantity: UnitNode): MathNode {
	switch (term.type) {
		case 'multiplication':
			return { ...term, right: unitOnLastFactor(term.right, quantity) };
		case 'division':
			return { ...term, denominator: unitOnLastFactor(term.denominator, quantity) };
		case 'opposite':
		case 'positive':
			return { ...term, operand: unitOnLastFactor(term.operand, quantity) };
		default:
			return { ...quantity, expression: term };
	}
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
// Le repli exact : les grandeurs ramenées à leurs unités de base
// =============================================================================

/** Le facteur exact d'une écriture d'unité : coefficient × πᵏ (`km` → 1000, `°` → π/180). */
function baseFactor(writing: string): MathNode | null {
	const conversion = exactConversion(writing);
	if (conversion === null || conversion.offset !== null) return null;
	const coefficient = rationalNode(conversion.coefficient);
	if (conversion.piPower === 0) return coefficient;
	const pi =
		conversion.piPower === 1 ? piConstant() : power(piConstant(), number(conversion.piPower));
	return multiply(coefficient, pi, 'implicit');
}

/** L'expression où chaque grandeur est ramenée à ses unités de base, ou `null`. */
function inBase(ast: MathNode): MathNode | null {
	let lost = false;
	const result = mapNode(ast, (node) => {
		if (!isUnit(node)) return node;
		const factor = node.unit.original === undefined ? null : baseFactor(node.unit.original);
		if (factor === null) {
			lost = true;
			return node;
		}
		return multiply(delimiter('parentheses', node.expression), factor, 'implicit');
	});
	return lost ? null : result;
}

/** La valeur exacte d'une expression sans unité, ou `null`. */
function exactValue(node: MathNode): MathNode | null {
	const result = evaluate(node, { mode: 'exact' });
	return result.status === 'value' ? result.node : null;
}

/** Les écritures d'unité tapées par l'élève, dans l'ordre (`km`, `h`). */
function writtenUnits(ast: MathNode): string[] {
	const writings: string[] = [];
	for (const node of findNodes(ast, isUnit)) {
		const writing = node.unit.original;
		if (writing !== undefined && !writings.includes(writing)) writings.push(writing);
	}
	return writings;
}

function sameComponents(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
	return a.size === b.size && [...a].every(([base, e]) => b.get(base) === e);
}

/**
 * Les écritures d'unité que l'élève reconnaîtra, de la plus naturelle à la
 * moins : les unités tapées, leurs puissances (`km^2`), puis deux unités
 * tapées combinées (`km/h`, `kW.h`). Une écriture composée ne se combine
 * pas : `(km/h)^2` serait illisible.
 */
function candidateWritings(ast: MathNode): string[] {
	const written = writtenUnits(ast);
	// Les symboles des écritures tapées : `km^2` apporte `km`, `km/h` apporte `km` et `h`
	const simple = [
		...new Set(written.flatMap((w) => (parseUnitTerms(w) ?? []).map((term) => term.symbol)))
	];
	const candidates = [...written];
	for (const w of simple) candidates.push(w, `${w}^2`, `${w}^3`, `${w}^-1`);
	for (const a of simple) {
		for (const b of simple) {
			if (a !== b) candidates.push(`${a}/${b}`, `${a}.${b}`);
		}
	}
	return candidates;
}

/** La grandeur exprimée dans une unité ÉCRITE : choisie, ou `null`. */
interface Expressed {
	readonly quantity: MathNode;
	/** La valeur a une écriture décimale finie */
	readonly decimal: boolean;
	/** L'unité est tapée par l'élève (ou faite d'unités tapées), pas une unité de base */
	readonly written: boolean;
}

/** La valeur exacte (en unités de base) exprimée dans `writing`, ou `null`. */
function expressIn(valueInBase: MathNode, writing: string): Expressed | null {
	const unit = parseUnit(writing);
	const factor = baseFactor(writing);
	if (unit === null || factor === null) return null;
	const value = exactValue(divide(valueInBase, factor, 'fraction'));
	if (value === null) return null;
	const rational = rationalOf(value);
	// Un rationnel s'écrit comme partout ailleurs : `2.5`, pas `5/2`
	const written = rational === null ? value : rationalNode(rational);
	return {
		quantity: signedQuantity(written, { ...unit, original: writing }),
		decimal: rational !== null && decimalString(absolute(rational)) !== null,
		written: true
	};
}

/**
 * La grandeur dans une unité écrite par l'élève (ou une puissance, ou deux
 * combinées) où sa valeur tombe juste : `sqrt(9[km^2])` → `3 km`,
 * `3[kW]*2[h]` → `6 kW.h`. Sinon la plus courte des écritures trouvées, les
 * unités de base comprises (`(π+1) rad` plutôt que `(180π+180)/π °`).
 */
function expressedInWritten(ast: MathNode, resultUnit: Unit): Expressed | null {
	const base = inBase(ast);
	const valueInBase = base === null ? null : exactValue(base);
	if (valueInBase === null) return null;

	const found: Expressed[] = [];
	for (const writing of candidateWritings(ast)) {
		const conversion = exactConversion(writing);
		if (conversion === null || !sameComponents(conversion.components, resultUnit.components)) {
			continue;
		}
		const expressed = expressIn(valueInBase, writing);
		if (expressed === null) continue;
		if (expressed.decimal) return expressed;
		found.push(expressed);
	}
	const baseWriting = formatUnit({ components: resultUnit.components, coefficient: 1 }, 'dot');
	const inBaseUnits = expressIn(valueInBase, baseWriting);
	if (inBaseUnits !== null) found.push({ ...inBaseUnits, written: false });
	if (found.length === 0) return null;
	return found.reduce((best, e) =>
		quantityText(e.quantity).length < quantityText(best.quantity).length ? e : best
	);
}

// =============================================================================
// Calculer
// =============================================================================

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
	return value === null ? null : signedQuantity(rationalNode(value), derived);
}

/** Les unités d'une durée composée, de la plus grande à la plus petite. */
const DURATION_PARTS: readonly (readonly [string, bigint])[] = [
	['h', 3600n],
	['min', 60n],
	['s', 1n]
];

/**
 * Une durée écrite en h, min, s : `2 h 30 min` (décision de David, lot C des
 * grandeurs : « par défaut on garde l'unité écrite »). Seulement si l'élève a
 * écrit au moins deux de ces unités, et que la durée tombe juste en secondes.
 * L'arbre est la somme JUXTAPOSÉE des parties (lecture-grandeurs, PR 5) : il
 * s'écrit `2[h] 30[min]` et se relit à l'identique ; `.convert` et « Garder »
 * reprennent la grandeur exacte.
 */
function compositeDuration(ast: MathNode, quantity: MathNode): Shown | null {
	const written = writtenUnits(ast);
	const used = DURATION_PARTS.filter(([symbol]) => written.includes(symbol));
	if (used.length < 2) return null;
	const seconds = valueIn(quantity, 's');
	if (seconds === null || seconds.d !== 1n) return null;
	const negative = seconds.n < 0n;
	let rest = negative ? -seconds.n : seconds.n;
	const parts: MathNode[] = [];
	const words: string[] = [];
	for (const [symbol, size] of DURATION_PARTS) {
		const count = rest / size;
		rest %= size;
		if (count === 0n) continue;
		const unit = parseUnit(symbol);
		if (unit === null) return null;
		parts.push(withUnit(number(count.toString()), { ...unit, original: symbol }));
		words.push(`${count} ${symbol}`);
	}
	// `1 h 30 min / 2` → 45 min : une seule partie suffit, l'élève a écrit h et min
	if (parts.length === 0) return null;
	const sum = parts.reduce((left, right) => juxtaposedSum(left, right));
	const node = negative ? opposite(sum) : sum;
	const text = `${negative ? '-' : ''}${words.join(' ')}`;
	const shown = { node, text };
	return { exact: shown, decimal: shown, approximate: null };
}

/** La réponse pour le mode demandé, avec la bascule et le bouton ≈. */
function answered(
	shown: Shown,
	mode: QuantityMode,
	quantity: MathNode,
	written?: QuantityAnswer
): QuantityOutcome {
	return {
		ok: true,
		answer: mode === 'decimal' ? shown.decimal : shown.exact,
		exact: shown.exact,
		decimal: shown.decimal,
		approximate: mode === 'exact' ? shown.approximate : null,
		quantity,
		...(written !== undefined && { written })
	};
}

/**
 * Ce qui empêche de calculer ces grandeurs, en français, ou `null` — le même
 * refus que `computeQuantity`, sans calculer (une valeur de l'atelier, lot C).
 */
export function quantityProblem(ast: MathNode): string | null {
	if (multipliesTemperature(ast)) return TEMPERATURE_PRODUCT_MESSAGE;
	const dimensions = checkDimensions(ast);
	return 'message' in dimensions ? dimensions.message : null;
}

/**
 * Calculer une expression qui contient des grandeurs.
 *
 * - une grandeur : `10[km]/1[h]` → `10 km/h` ;
 * - des nombres quand les unités se simplifient : `3[h]/1[min]` → `180` ;
 * - un zéro garde son unité : `3[m]-3[m]` → `0 m` ;
 * - l'unité dérivée nommée suit l'unité écrite : `19.62 m.kg/s^2 = 19.62 N`.
 */
export function computeQuantity(written: MathNode, mode: QuantityMode): QuantityOutcome {
	const ast = unitsOverQuantities(written);
	if (multipliesTemperature(ast)) return { ok: false, message: TEMPERATURE_PRODUCT_MESSAGE };
	const dimensions = checkDimensions(ast);
	if ('message' in dimensions) return { ok: false, message: dimensions.message };
	const resultUnit = dimensions.unit;

	const reduced = tidy(ast, { unitChoice: 'written' });
	if (reducedQuantity(reduced)) {
		// `tidy` a pu choisir une unité que l'élève n'a pas tapée (`3[kW]*2[h]` →
		// `21600000 J`) : une unité tapée l'emporte si la valeur y tombe juste
		const chosen = writtenUnits(ast).includes(unitWriting(quantityOf(reduced)!.unit.unit))
			? null
			: expressedInWritten(ast, quantityOf(reduced)!.unit.unit);
		const quantity = chosen?.decimal === true && chosen.written ? chosen.quantity : reduced;
		const composite = compositeDuration(ast, quantity);
		if (composite !== null) return answered(composite, mode, quantity, composite.exact);
		const derived = namedDerived(quantity);
		return answered(
			derived === null ? both(quantity) : equality(quantity, derived),
			mode,
			quantity
		);
	}

	const value = rationalOf(reduced);
	if (resultUnit === null || resultUnit.components.size === 0) {
		if (value !== null) return { ok: 'plain', node: reduced };
		// Des unités qui s'annulent dans une fonction ou une comparaison
		// (`sin(30[°])`, `5[km]>3[m]`) : un calcul de nombres
		const base = hasTemperature(ast) ? null : inBase(ast);
		return base === null ? { ok: false, message: MIXED_MESSAGE } : { ok: 'plain', node: base };
	}
	// Un zéro : `tidy` rend `0` sans unité, l'analyse la retrouve
	if (value !== null && value.n === 0n) {
		const zero = withUnit(number(0), resultUnit);
		return answered(both(zero), mode, zero);
	}
	if (hasTemperature(ast)) return { ok: false, message: TEMPERATURE_SUM_MESSAGE };
	// `tidy` ne réduit pas une racine, une valeur absolue… : le repli exact
	const fallback = expressedInWritten(ast, resultUnit);
	return fallback === null
		? { ok: false, message: MIXED_MESSAGE }
		: answered(both(fallback.quantity), mode, fallback.quantity);
}

// =============================================================================
// Convertir
// =============================================================================

/** Une température d'une échelle à l'autre (°C, °F, K), exactement : `(v + d)·c`. */
function convertTemperature(value: Rational, from: string, to: string): Rational | null {
	const source = exactConversion(from);
	const target = exactConversion(to);
	if (source === null || target === null) return null;
	if (source.piPower !== 0 || target.piPower !== 0) return null;
	const zero: Rational = { n: 0n, d: 1n };
	const kelvins = mulRational(addRational(value, source.offset ?? zero), source.coefficient);
	return subRational(divRational(kelvins, target.coefficient), target.offset ?? zero);
}

function notSameMessage(from: string, to: string): string {
	return `On ne peut pas convertir des ${from} en ${to} : ce ne sont pas les mêmes grandeurs.`;
}

/**
 * `.convert` : la dernière grandeur exprimée dans `target`, exactement —
 * `12.3 km = 12300 m`, `2.5 km/h = 25/36 m/s`, `180 ° = π rad`, `20 °C = 293.15 K`.
 *
 * @param seen - ce que l'élève a vu de la grandeur (`2 h 30 min`), répété à gauche
 */
export function convertQuantity(
	quantity: MathNode | null,
	target: string,
	mode: QuantityMode,
	seen?: QuantityAnswer
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
	if (source === null) return { ok: false, message: MIXED_MESSAGE };
	const from = unitWriting(source.unit.unit);
	const targetUnit: Unit = { ...unit, original: written };

	// Températures : une conversion affine (°C ↔ K), que le facteur seul ne dit pas
	if (isAffine(source.unit.unit) || isAffine(unit)) {
		const sourceValue = rationalOf(
			source.negative ? opposite(source.unit.expression) : source.unit.expression
		);
		const temperatures = source.unit.unit.components.has('K') && unit.components.has('K');
		const temperature =
			sourceValue === null || !temperatures ? null : convertTemperature(sourceValue, from, written);
		if (temperature === null) return { ok: false, message: notSameMessage(from, written) };
		const converted = signedQuantity(rationalNode(temperature), targetUnit);
		return answered(equality(quantity, converted, seen), mode, quantity, seen);
	}

	if (getConversionFactor(source.unit.unit, unit) === null) {
		return { ok: false, message: notSameMessage(from, written) };
	}
	const value = valueIn(quantity, written);
	// Une conversion qui fait entrer π (degrés ↔ radians) passe par le repli exact
	const factor = baseFactor(written);
	const base = value === null ? inBase(quantity) : null;
	const exact =
		value !== null
			? rationalNode(value)
			: base === null || factor === null
				? null
				: exactValue(divide(base, factor, 'fraction'));
	if (exact === null) return { ok: false, message: MIXED_MESSAGE };
	const converted = signedQuantity(exact, targetUnit);
	return answered(equality(quantity, converted, seen), mode, quantity, seen);
}
