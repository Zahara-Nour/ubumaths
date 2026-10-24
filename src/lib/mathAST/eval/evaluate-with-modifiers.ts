/**
 * MathAST Evaluation with Modifiers
 *
 * Provides a convenience function for evaluating LaTeX expressions
 * with formatting modifiers (decimal output, positive sign, bracket negative).
 *
 * This module bridges MathAST evaluation with the ubumark
 * parameterization system's EvalModifiers interface.
 *
 * @module mathAST/eval/evaluate-with-modifiers
 */

import type { EvalModifiers } from '$lib/ubumark';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluate, evaluateNodeToApproximatedNumber } from './evaluate';
import { getVariables } from './substitute';
import type { MathNode } from '../types';
import { mapNode } from '../transforms';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { tidy } from '../tidy';
import { parseCustom } from '../parser/custom';
import type { EvalValue, ComplexValueResult } from './types';
import type { Rational } from '../normal/types';
import { divide, number, opposite, withUnit } from '../factory';
import { isNumber, isSuperscript } from '../guards';
import { extractRational } from '../common/numeric';
import { divRational, negRational } from '../normal/rational';
import { decimalString } from '../tidy/decimal';
import { exactValueToShow } from './exact-value';
import { parse as parseUnit, parseUnitTerms } from '../units/parser';
import { exactConversion } from '../units/exact';
import { format as formatUnit } from '../units';
import { analyzeDimensions } from '../dimensional/analyzer';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a value is a MathNode.
 */
function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
}

/**
 * Checks if a value is a ComplexValueResult.
 */
function isComplex(value: EvalValue): value is ComplexValueResult {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
}

// =============================================================================
// Écriture d'un nombre décimal (décisions de David du 2026-10-11)
// =============================================================================
// Jamais la notation JS (`3e-7`, `1e+22`) : le parseur LaTeX lit `e` comme la constante
// d'Euler, et l'élève ne l'a jamais apprise. Le séparateur reste le point : la virgule
// `{,}` est posée au rendu (`toFrenchDecimal`), comme pour tout résultat de `{{eval:…}}`.
// - petit (|x| < 10⁻⁶) : toujours développé (`0.0000003`), même s'il aligne les zéros ;
// - entier EXACT (calculé en rationnels) : toujours en entier, quelle que soit sa taille ;
// - résultat APPROCHÉ ≥ 10¹⁵ : notation scientifique (jamais un chiffre faux) ;
// - `;sci` : notation scientifique, toujours.
// Aucune dépendance au niveau du modèle (décision du 2026-10-11 : la notation scientifique
// passe en 3e dans le nouveau programme, et aucun modèle publié n'est concerné).

/**
 * À partir de là, un flottant ne s'écrit plus en entier : il ne porte que 15 à 16
 * chiffres significatifs exacts (2⁵³ ≈ 9·10¹⁵), les chiffres suivants seraient inventés.
 */
export const MAX_EXPANDED_MAGNITUDE = 1e15;

/** Chiffres significatifs gardés, comme l'ancien `toPrecision(15)` */
const SIGNIFICANT_DIGITS = 15;

/** Mantisse (chiffres sans zéros finaux, signe à part) et exposant décimal de `value` */
function decimalParts(value: number): { negative: boolean; digits: string; exponent: number } {
	const [mantissa, exponentText] = Math.abs(value)
		.toExponential(SIGNIFICANT_DIGITS - 1)
		.split('e');
	const digits = mantissa.replace('.', '').replace(/0+$/, '') || '0';
	return { negative: value < 0, digits, exponent: Number(exponentText) };
}

/** Écriture décimale développée : `0.0000003`, `10000000000000000000000`, `-2.5` */
function expandedDecimal(value: number): string {
	if (value === 0) return '0';
	if (Number.isInteger(value) && Math.abs(value) < MAX_EXPANDED_MAGNITUDE) return value.toString();
	const { negative, digits, exponent } = decimalParts(value);
	let text: string;
	if (exponent < 0) {
		text = `0.${'0'.repeat(-exponent - 1)}${digits}`;
	} else if (digits.length <= exponent + 1) {
		text = digits + '0'.repeat(exponent + 1 - digits.length);
	} else {
		text = `${digits.slice(0, exponent + 1)}.${digits.slice(exponent + 1)}`;
	}
	return negative ? `-${text}` : text;
}

/** Notation scientifique : `3 \times 10^{-7}`, `3.2 \times 10^{5}`, mantisse 1 → `10^{-7}` */
function scientificNotation(value: number): string {
	if (value === 0) return '0';
	const { negative, digits, exponent } = decimalParts(value);
	const mantissa = digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
	const power = `10^{${exponent}}`;
	const text = mantissa === '1' ? power : `${mantissa} \\times ${power}`;
	return negative ? `-${text}` : text;
}

/**
 * Entier EXACT que vaut le calcul (`10^22`, `2^80`, `1.5*10^20`), écrit avec tous ses
 * chiffres — tous vrais, puisque calculés en rationnels ; `null` s'il n'en est pas un.
 */
function exactIntegerWriting(ast: MathNode): string | null {
	try {
		const exact = evaluate(foldIntegerExponents(ast), { mode: 'exact' });
		if (exact.status !== 'value' || !isMathNode(exact.value)) return null;
		const value = rationalOf(exact.value);
		return value !== null && value.d === 1n ? value.n.toString() : null;
	} catch {
		return null;
	}
}

/**
 * Écriture d'un résultat décimal : développée sous 10¹⁵ ; au-delà, tous les chiffres si
 * `exactSource` (le calcul) vaut un entier exact, notation scientifique sinon.
 */
function formatNumber(value: number, exactSource?: MathNode): string {
	if (Math.abs(value) < MAX_EXPANDED_MAGNITUDE) return expandedDecimal(value);
	const exactInteger = exactSource ? exactIntegerWriting(exactSource) : null;
	return exactInteger ?? scientificNotation(value);
}

/**
 * Écriture d'un résultat littéral valable à la fois en syntaxe maison et en LaTeX
 * (`5(3x+2)`, `3x^2`, `-3x`) : il s'insère aussi bien dans une formule maison que dans une
 * formule LaTeX ou une réponse attendue. Une fraction garde l'écriture LaTeX (`\\dfrac{x}{2}`).
 */
function literalWriting(node: MathNode): string {
	let hasDivision = false;
	mapNode(node, (n) => {
		if (n.type === 'division') hasDivision = true;
		return n;
	});
	if (hasDivision) return toLatex(node);
	const custom = toCustom(node);
	// `toCustom` garde un nombre `1e-7` (la syntaxe maison le lit) ; inséré dans une formule
	// LaTeX, il se relirait 1·e − 7 : `toLatex` l'écrit `10^{-7}`
	return /\d[eE][+-]?\d/.test(custom) ? toLatex(node) : custom;
}

/** Une division dont le dénominateur se calcule et vaut 0 */
function hasZeroDenominator(node: MathNode): boolean {
	let zero = false;
	mapNode(node, (n) => {
		if (n.type === 'division') {
			const d = evaluate(n.denominator, { mode: 'decimal' });
			if (d.status === 'value' && d.value === 0) zero = true;
		}
		return n;
	});
	return zero;
}

/** `;+` et `;()` sur un résultat littéral : le signe se lit en tête de l'écriture */
function withSignModifiers(latex: string, modifiers: EvalModifiers): string {
	const negative = latex.startsWith('-');
	if (modifiers.addPositive && !negative) return `+${latex}`;
	if (modifiers.bracketNegative && negative) return `(${latex})`;
	return latex;
}

/**
 * Résultat exact (`\dfrac{9}{7}`, `2 \sqrt{2}`, `\ln(2)`) → syntaxe maison (`9/7`, `2sqrt(2)`), pour
 * le réutiliser dans un autre calcul. Toute autre valeur est rendue telle quelle.
 */
export function evalResultToCustom(value: string): string {
	if (!value.includes('\\')) return value;
	try {
		// `toCustom` écrit la constante d'Euler `e`, relue par `parseCustom`
		const custom = toCustom(parseLatex(value));
		// Aller-retour vérifié : sinon la valeur reste en LaTeX, comme avant
		parseCustom(custom);
		return custom;
	} catch {
		return value;
	}
}

/**
 * Valeur numérique d'un résultat d'évaluation : `3.5`, mais aussi `\dfrac{9}{2}`,
 * `2 \sqrt{2}` ou `3 \times 10^{-7}` (que `parseFloat` lirait NaN, 2 ou 3). NaN si ce
 * n'est pas un nombre.
 */
export function evalResultToNumber(value: string): number {
	// Nombre écrit en entier ou en décimal : lu directement
	if (PLAIN_NUMBER.test(value)) return parseFloat(value);
	// Toute autre écriture passe par le parseur : `10^{-7}` (`;sci`) valait 10 par `parseFloat`
	try {
		return evaluateNodeToApproximatedNumber(parseLatex(value));
	} catch {
		return NaN;
	}
}

/** `12`, `-2.5`, `0.0000003` : un nombre écrit sans autre signe */
const PLAIN_NUMBER = /^\s*-?\d+(\.\d+)?\s*$/;

/** La forme exacte vaut la valeur décimale (garde-fou : jamais de valeur fausse) */
function matchesValue(exact: MathNode, numValue: number): boolean {
	const exactValue = evaluateNodeToApproximatedNumber(exact);
	const tolerance = 1e-9 * Math.max(1, Math.abs(numValue));
	return Math.abs(exactValue - numValue) <= tolerance;
}

/**
 * Une tangente prise en π/2 + kπ : le calcul flottant rend 16331239353195370 au lieu
 * d'échouer (cos(π/2) vaut 6e-17, pas 0). Erreur visible plutôt qu'une fausse valeur.
 */
function assertTangentsDefined(node: MathNode): void {
	mapNode(node, (n) => {
		if (n.type !== 'function' || n.name !== 'tan' || n.args.length !== 1) return n;
		const angle = evaluate(n.args[0], { mode: 'decimal' });
		if (angle.status !== 'value' || typeof angle.value !== 'number') return n;
		const halfTurns = angle.value / Math.PI - 0.5;
		if (Math.abs(halfTurns - Math.round(halfTurns)) < 1e-9) {
			throw new Error(`tan non définie en π/2 + kπ : ${toCustom(n)}`);
		}
		return n;
	});
}

/**
 * Exposant calculable et entier (`4 - 3`, `{4} - {1}`) remplacé par sa valeur.
 *
 * `normalize` ne réduit une puissance de fraction que si l'exposant est un nombre écrit :
 * `(2/3)^{n-k}` restait `\left(\dfrac{2}{3}\right)^{4-3}` en réponse attendue, alors que
 * `(2/3)^n` donnait `\dfrac{16}{81}`. Un exposant non entier (`1/2`) reste tel quel.
 */
function foldIntegerExponents(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isSuperscript(n) || isNumber(n.superscript)) return n;
		if (getVariables(n.superscript).size > 0) return n;
		let exponent: number;
		try {
			exponent = evaluateNodeToApproximatedNumber(n.superscript);
		} catch {
			return n;
		}
		if (!Number.isSafeInteger(exponent)) return n;
		const folded = exponent < 0 ? opposite(number(-exponent)) : number(exponent);
		return { ...n, superscript: folded };
	});
}

/**
 * Résultat exact : `\dfrac{9}{7}`, `-\dfrac{3}{4}`, `2 \sqrt{2}`, entier s'il tombe juste.
 *
 * Décimal si le calcul contient un décimal, ou si la forme exacte ne se calcule
 * pas ou ne vaut pas la valeur décimale (garde-fou : jamais de valeur fausse).
 */
function formatExact(ast: MathNode, numValue: number): string {
	if (Number.isInteger(numValue)) return formatNumber(numValue, ast);
	try {
		const exact = evaluate(foldIntegerExponents(ast), { mode: 'exact' });
		if (exact.status !== 'value' || !isMathNode(exact.value)) return formatNumber(numValue, ast);
		if (!matchesValue(exact.value, numValue)) return formatNumber(numValue, ast);
		// La valeur exacte à afficher commune (lot 5c) : registre décimal de la
		// saisie (S1 : `0,1+0,2 → 0,3`, `1/3+0,5 → 5/6`), `\dfrac{5\pi}{6}`,
		// `\dfrac{\sqrt{21}}{5}` — la bonne réponse de l'élève n'est plus jugée
		// « mauvaise forme » face à `\dfrac{1}{5}\sqrt{21}`
		const shown = exactValueToShow(exact.value, { source: ast });
		// Un nombre garde l'écriture des nombres d'un énoncé (`formatNumber`), lue sur
		// la valeur EXACTE : `cos(π/2)` vaut 0, pas le flottant 6·10⁻¹⁷
		if (isNumber(shown) || (shown.type === 'opposite' && isNumber(shown.operand))) {
			return formatNumber(evaluateNodeToApproximatedNumber(shown), ast);
		}
		return toLatex(shown);
	} catch {
		return formatNumber(numValue, ast);
	}
}

// =============================================================================
// Grandeurs (lot 2 du chantier Grandeurs, docs/archive/wip/grandeurs-eval-progress.md)
// =============================================================================

/** Le calcul contient une grandeur (`7[mm]`, `3[h]`) */
function hasQuantity(node: MathNode): boolean {
	let found = false;
	mapNode(node, (n) => {
		if (n.type === 'unit') found = true;
		return n;
	});
	return found;
}

/** Valeur exacte d'un nombre, d'un opposé ou d'un quotient de nombres ; `null` sinon */
export function rationalOf(node: MathNode): Rational | null {
	if (node.type === 'opposite') {
		const inner = rationalOf(node.operand);
		return inner === null ? null : negRational(inner);
	}
	if (node.type === 'division') {
		const n = rationalOf(node.numerator);
		const d = rationalOf(node.denominator);
		return n === null || d === null || d.n === 0n ? null : divRational(n, d);
	}
	return extractRational(node);
}

/** `x` exprimé en `unit` : un nombre (quotient par `1[unit]`), ou `null` si la dimension diffère */
export function valueIn(ast: MathNode, unit: string): Rational | null {
	const parsed = parseUnit(unit);
	if (parsed === null) throw new Error(`Unité inconnue : [${unit}]`);
	const ratio = tidy(divide(ast, withUnit(number(1), parsed), 'fraction'), {
		unitChoice: 'written'
	});
	return hasQuantity(ratio) ? null : rationalOf(ratio);
}

/** Écriture décimale exacte d'un rationnel signé, ou `null` si elle est infinie */
function signedDecimal(r: Rational): string | null {
	const text = decimalString(r);
	if (text === null) return null;
	return r.n < 0n ? `-${text}` : text;
}

/** Une unité qui écrit deux fois la même dimension (`min.km/h`) : incohérente */
function repeatsDimension(unitWriting: string): boolean {
	const terms = parseUnitTerms(unitWriting);
	if (terms === null) return true;
	const bases = new Set<string>();
	for (const { symbol } of terms) {
		const own = exactConversion(symbol);
		if (own === null || own.components.size !== 1) continue;
		const [[base]] = own.components;
		if (bases.has(base)) return true;
		bases.add(base);
	}
	return false;
}

/**
 * Le résultat mis au propre doit être UNE grandeur à écriture décimale finie :
 * `28[mm]`, `-2[m]`. Sinon erreur visible (jamais d'unité jetée en silence).
 */
function quantityWriting(reduced: MathNode, source: MathNode): string {
	const quantity = reduced.type === 'opposite' ? reduced.operand : reduced;
	if (quantity.type !== 'unit') {
		throw new Error(
			`Le calcul ne donne pas une seule grandeur (dimensions incompatibles ?) : ${toCustom(source)} → ${toCustom(reduced)}`
		);
	}
	if (quantity.expression.type !== 'number') {
		throw new Error(
			`Grandeur sans écriture décimale finie : ${toCustom(source)} → ${toCustom(reduced)} (imposer une unité avec ;[unité], ou réécrire la question)`
		);
	}
	const writing = quantity.unit.original ?? '';
	if (repeatsDimension(writing)) {
		throw new Error(`Unité incohérente dans le résultat : ${toCustom(reduced)}`);
	}
	return toCustom(reduced);
}

/** `;[unité]` — la grandeur exprimée dans l'unité imposée */
function expressedIn(ast: MathNode, unit: string): string {
	const value = valueIn(ast, unit);
	if (value === null) {
		throw new Error(`Unité incompatible : ${toCustom(ast)} ne s'exprime pas en [${unit}]`);
	}
	const text = signedDecimal(value);
	if (text === null) {
		throw new Error(`Pas d'écriture décimale finie de ${toCustom(ast)} en [${unit}]`);
	}
	return `${text}[${unit}]`;
}

/**
 * `;hms` — une durée en heures, minutes, secondes : `135[min]` → `{2[h]}{15[min]}`,
 * affiché « 2 h 15 min » en LaTeX comme en syntaxe maison ; `60[min]` → `1[h]`.
 *
 * L'écriture est une JUXTAPOSITION, que le parseur lit comme une somme marquée (la même
 * durée, lecture-grandeurs PR 5) ; collée à `*` ou `/`, elle est refusée. Elle sert à
 * l'affichage, pas à une réponse attendue.
 */
function hmsWriting(ast: MathNode): string {
	const seconds = valueIn(ast, 's');
	if (seconds === null) throw new Error(`;hms : ${toCustom(ast)} n'est pas une durée`);
	if (seconds.d !== 1n || seconds.n < 0n) {
		throw new Error(`;hms : ${toCustom(ast)} n'est pas un nombre entier de secondes positif`);
	}
	const total = seconds.n;
	const parts: Array<[bigint, string]> = [
		[total / 3600n, 'h'],
		[(total % 3600n) / 60n, 'min'],
		[total % 60n, 's']
	];
	const written = parts.filter(([value]) => value !== 0n).map(([v, u]) => `${v}[${u}]`);
	if (written.length === 0) return '0[s]';
	return written.length === 1 ? written[0] : written.map((part) => `{${part}}`).join('');
}

/** Une grandeur de durée (`15[min]`, `{2[h]}`) */
function isDuration(node: MathNode): boolean {
	const inner = node.type === 'delimiter' ? node.content : node;
	if (inner.type !== 'unit') return false;
	const conversion = exactConversion(inner.unit.original ?? '');
	return (
		conversion !== null && conversion.components.size === 1 && conversion.components.get('s') === 1
	);
}

/**
 * Un produit de deux durées (`2[h]*15[min]`) : aucun exercice ne le calcule — refusé. La
 * durée composée de `;hms` (`{2[h]}{15[min]}`) n'en est plus un : elle se lit comme une somme.
 */
function multipliesDurations(ast: MathNode): boolean {
	let found = false;
	mapNode(ast, (n) => {
		if (n.type === 'multiplication' && productFactors(n).filter(isDuration).length >= 2) {
			found = true;
		}
		return n;
	});
	return found;
}

/** Les facteurs d'un produit, parenthèses et produits imbriqués aplatis : `2[h]*(3*15[min])` */
function productFactors(node: MathNode): MathNode[] {
	if (node.type === 'multiplication') {
		return [...productFactors(node.left), ...productFactors(node.right)];
	}
	if (node.type === 'delimiter' && node.content.type === 'multiplication') {
		return productFactors(node.content);
	}
	return [node];
}

/**
 * Un calcul avec des grandeurs qui vaut 0 (`3[m]-3[m]`, `3[h]*0`) : `tidy` rend `0`, sans
 * unité. L'analyse dimensionnelle la retrouve — pour une valeur nulle, `0[m^2]` et
 * `0[mm^2]` sont la même grandeur. `null` si le résultat est un nombre (`0[h]/1[min]`).
 */
function zeroQuantityUnit(ast: MathNode): string | null {
	const analysis = analyzeDimensions(ast, {
		variables: new Map(),
		options: { strictMode: true, allowDimensionlessMix: false, allowFractionalExponents: true }
	});
	if (!analysis.valid || analysis.resultUnit === null) return null;
	if (analysis.resultUnit.components.size === 0) return null;
	return formatUnit(analysis.resultUnit, 'original');
}

/**
 * Un calcul avec des grandeurs : `tidy` (unité écrite d'abord) garde l'unité ; un
 * quotient de même dimension redevient un nombre (`3[h]/1[min]` → 180).
 */
function evaluateQuantity(ast: MathNode, modifiers: EvalModifiers): string {
	if (multipliesDurations(ast)) {
		throw new Error(
			`Produit de durées : ${toCustom(ast)} (une durée ne se multiplie pas par une durée)`
		);
	}
	if (modifiers.hms) {
		if (modifiers.scientific) {
			throw new Error(`;sci : une durée écrite par ;hms n'a pas de notation scientifique`);
		}
		return hmsWriting(ast);
	}
	if (modifiers.unit !== undefined) {
		const expressed = expressedIn(ast, modifiers.unit);
		return withSignModifiers(withScientificQuantity(expressed, modifiers), modifiers);
	}
	const reduced = tidy(ast, { unitChoice: 'written' });
	if (!hasQuantity(reduced)) {
		const value = rationalOf(reduced);
		const zeroUnit = value !== null && value.n === 0n ? zeroQuantityUnit(ast) : null;
		if (zeroUnit !== null) return `0[${zeroUnit}]`;
		return evaluateAstWithModifiers(reduced, modifiers);
	}
	return withSignModifiers(
		withScientificQuantity(quantityWriting(reduced, ast), modifiers),
		modifiers
	);
}

/** Grandeur écrite en syntaxe maison : `-0.0000003[m]` → signe, nombre, unité */
const QUANTITY_WRITING = /^(-?)(\d+(?:\.\d+)?)\[([^\]]+)\]$/;

/**
 * `;sci` sur une grandeur : le nombre en notation scientifique, en syntaxe maison
 * (`3*10^{-7}[m]`, `10^{-7}[m]`), que le parseur maison relit à la même grandeur.
 */
function withScientificQuantity(writing: string, modifiers: EvalModifiers): string {
	if (!modifiers.scientific) return writing;
	const match = QUANTITY_WRITING.exec(writing);
	if (!match) throw new Error(`;sci : grandeur non reconnue : ${writing}`);
	const [, sign, magnitude, unit] = match;
	const { digits, exponent } = decimalParts(Number(magnitude));
	const mantissa = digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
	const power = `10^{${exponent}}`;
	return `${sign}${mantissa === '1' ? power : `${mantissa}*${power}`}[${unit}]`;
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Evaluate a MathNode AST with optional formatting modifiers.
 *
 * Matches the interface expected by the ubumark parameterization system.
 * The AST usually comes from parseCustom + substitute (variable-resolver).
 *
 * Résultat exact par défaut, comme TinyMath : `\dfrac{9}{7}`, `2 \sqrt{2}`
 * (décimal si le calcul contient un décimal). Modifiers:
 * - `decimal` (`;d`): écriture décimale (1/2 → 0.5)
 * - `addPositive`: Add + sign for positive or zero results (0 → +0)
 * - `bracketNegative`: Wrap negative results in parentheses
 * - `derivative`: Not implemented (reserved for future use)
 *
 * @param ast - MathNode AST to evaluate
 * @param modifiers - Optional formatting modifiers
 * @returns Formatted result as string
 * @throws Error if evaluation fails
 *
 * @example Basic evaluation
 * ```typescript
 * evaluateAstWithModifiers(parseLatex('3+4'), {})           // Returns: '7'
 * evaluateAstWithModifiers(parseLatex('2^3'), {})           // Returns: '8'
 * ```
 *
 * @example Decimal modifier
 * ```typescript
 * evaluateAstWithModifiers(parseLatex('1/3'), { decimal: true })  // Returns: '0.3333333333333333'
 * evaluateAstWithModifiers(parseLatex('\\frac{1}{2}'), { decimal: true })  // Returns: '0.5'
 * ```
 *
 * @example Positive sign modifier
 * ```typescript
 * evaluateAstWithModifiers(parseLatex('5'), { addPositive: true })      // Returns: '+5'
 * evaluateAstWithModifiers(parseLatex('-3'), { addPositive: true })     // Returns: '-3' (no change for negative)
 * evaluateAstWithModifiers(parseLatex('0'), { addPositive: true })      // Returns: '+0' (« y0 » serait lu comme un produit)
 * ```
 *
 * @example Bracket negative modifier
 * ```typescript
 * evaluateAstWithModifiers(parseLatex('-3'), { bracketNegative: true })  // Returns: '(-3)'
 * evaluateAstWithModifiers(parseLatex('5'), { bracketNegative: true })   // Returns: '5' (no change for positive)
 * ```
 *
 * @example Combined modifiers
 * ```typescript
 * evaluateAstWithModifiers(parseLatex('2/3'), { decimal: true, addPositive: true })  // Returns: '+0.6666666666666666'
 * evaluateAstWithModifiers(parseLatex('-1/4'), { decimal: true, bracketNegative: true })  // Returns: '(-0.25)'
 * ```
 */
export function evaluateAstWithModifiers(
	ast: MathNode,
	modifiers: EvalModifiers = {},
	literalLetters: ReadonlySet<string> = new Set()
): string {
	// Grandeurs : `evaluate` ignore l'unité par construction — le calcul passe par `tidy`.
	// Un calcul littéral (lettres tirées) garde son chemin ci-dessous.
	const quantityRequested = modifiers.hms === true || modifiers.unit !== undefined;
	if (quantityRequested || (hasQuantity(ast) && getVariables(ast).size === 0)) {
		return evaluateQuantity(ast, modifiers);
	}

	// Valeur numérique d'abord (signe des modificateurs, garde-fou de formatExact)
	const result = evaluate(ast, { mode: 'decimal' });

	// Handle non-value results
	if (result.status === 'unevaluable') {
		// Calcul littéral (comme TinyMath) : il reste des lettres → expression RÉDUITE par
		// tidy, jamais développée (`2*3*x` → `6x`, `3a+2b+5a` → `8a+2b`)
		// Seulement pour des lettres TIRÉES (`literalLetters`) : une lettre venue d'une faute de
		// frappe (`{{eval:invalid}}`) ou d'une variable non définie reste une erreur
		const letters = [...getVariables(ast)];
		if (letters.length > 0 && letters.every((letter) => literalLetters.has(letter))) {
			if (modifiers.scientific) {
				throw new Error(`;sci : ${toCustom(ast)} n'est pas un nombre (calcul littéral)`);
			}
			const reduced = tidy(ast);
			// `a/(b-c)` avec b = c : dénominateur nul, comme dans un calcul numérique
			if (hasZeroDenominator(reduced)) throw new Error('Division by zero');
			return withSignModifiers(literalWriting(reduced), modifiers);
		}
		throw new Error(result.reason);
	}
	if (result.status === 'indeterminate') {
		throw new Error(`Indeterminate form: ${result.form}`);
	}
	assertTangentsDefined(ast);

	// Get the numeric value
	let numValue: number;
	if (isComplex(result.value)) {
		throw new Error('Complex numbers are not supported in evaluateAstWithModifiers');
	} else if (isMathNode(result.value)) {
		numValue = evaluateNodeToApproximatedNumber(result.value);
	} else if (typeof result.value === 'boolean') {
		throw new Error('Boolean results are not supported in evaluateAstWithModifiers');
	} else {
		numValue = result.value;
	}

	// Format the output : exact par défaut (comme TinyMath), décimal avec `;d`
	if (!Number.isFinite(numValue)) {
		throw new Error(`Résultat non fini : ${toCustom(ast)} (trop grand ou non défini)`);
	}

	// `;sci` : toujours la notation scientifique ; `;d` : décimal ; sinon exact, ou décimal.
	// Un entier exact s'écrit toujours en entier (voir `formatNumber`)
	let formattedOutput = modifiers.scientific
		? scientificNotation(numValue)
		: modifiers.decimal
			? formatNumber(numValue, ast)
			: formatExact(ast, numValue);

	// Apply formatting modifiers
	// `>= 0` : 0 s'écrit « +0 », sinon `y{{c;+}}` donne « y0 », lu comme un produit
	if (modifiers.addPositive && numValue >= 0) {
		if (!formattedOutput.startsWith('+')) {
			formattedOutput = '+' + formattedOutput;
		}
	}

	if (modifiers.bracketNegative && numValue < 0) {
		if (!formattedOutput.startsWith('(')) {
			formattedOutput = '(' + formattedOutput + ')';
		}
	}

	return formattedOutput;
}
