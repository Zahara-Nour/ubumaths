/**
 * Shared Numeric Evaluation Utilities
 *
 * Common functions for evaluating MathNode expressions numerically.
 *
 * @module mathAST/common/numeric
 */

import type { FunctionNode, MathNode } from '../types';
import type { Rational } from '../normal/types';
import { isNumber } from '../guards';
import { inverseNotationAsFunction } from './function-power';
import { realNthRoot } from '../eval/real-root';
import { number, opposite, fraction } from '../factory';
import {
	rational,
	fromInteger,
	negRational,
	floatToRational,
	divRational
} from '../normal/rational';

/**
 * Pôles : `'infinity'` rend ±∞ (signe du numérateur) sur une division par 0 et
 * laisse passer les débordements ; `'undefined'` rend `null` dès qu'une valeur
 * intermédiaire n'est pas finie (dénominateur < 1e-15 compris).
 */
export type PoleMode = 'infinity' | 'undefined';

/**
 * Fonctions lues par chaque réglage : celles de l'évaluateur d'origine, sans
 * plus (simplify-carte lot 6a). La partie entière ou le signe en `'undefined'`
 * ferait conclure une « substitution directe » sur un saut (⌊x⌋ en 1) ; `log`
 * en `'infinity'` changerait les limites du moteur.
 */
const FUNCTIONS_BY_POLE_MODE: Record<PoleMode, ReadonlySet<string>> = {
	infinity: new Set([
		'sin',
		'cos',
		'tan',
		'exp',
		'ln',
		'sqrt',
		'abs',
		'arcsin',
		'arccos',
		'arctan',
		'floor',
		'ceil',
		'sign',
		'sgn'
	]),
	undefined: new Set(['sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs'])
};

/**
 * Get numeric value from a MathNode if it's a number or opposite(number).
 *
 * @param node - The MathNode to extract a numeric value from
 * @returns The numeric value or null if not a number
 *
 * @example
 * getNumericValue(number('3'))           // 3
 * getNumericValue(opposite(number('5'))) // -5
 * getNumericValue(variable('x'))         // null
 */
export function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return Number.isFinite(val) ? val : null;
	}
	if (node.type === 'opposite' && isNumber(node.operand)) {
		const val = parseFloat(node.operand.value);
		return Number.isFinite(val) ? -val : null;
	}
	return null;
}

/**
 * Écriture décimale d'un nombre JS, relue à l'identique par `parseLatex` ET `parseCustom`.
 *
 * `String(3e-7)` = '3e-7' et `String(1e21)` = '1e+21' : notation JS, que le parseur LaTeX
 * relit 3e − 7 (e = constante d'Euler) et que l'élève n'a jamais apprise. Ici, tous les
 * chiffres de `String(n)` sont gardés (aller-retour exact), seule la virgule bouge :
 * `0.0000003`, `1000000000000000000000`, `-2.5`. À utiliser partout où un nombre JS devient
 * une chaîne relue par un parseur. Un nombre non fini (`Infinity`, `NaN`) est rendu tel
 * que `String` l'écrit : l'appelant décide de son sort.
 */
export function numberToLatexSafe(value: number): string {
	const text = String(value);
	if (!Number.isFinite(value) || !/e/i.test(text)) return text;
	const negative = text.startsWith('-');
	const [mantissa, exponentText] = (negative ? text.slice(1) : text).split(/e/i);
	const pointIndex = mantissa.indexOf('.');
	const digits = mantissa.replace('.', '');
	const point = (pointIndex === -1 ? mantissa.length : pointIndex) + Number(exponentText);
	let written: string;
	if (point <= 0) written = `0.${'0'.repeat(-point)}${digits}`;
	else if (point >= digits.length) written = digits + '0'.repeat(point - digits.length);
	else written = `${digits.slice(0, point)}.${digits.slice(point)}`;
	return negative ? `-${written}` : written;
}

/**
 * Create a MathNode from a numeric value (or pre-formatted numeric string).
 * Negative values (or strings starting with '-') are wrapped in opposite().
 * Strings starting with '+' have the prefix stripped.
 *
 * Accepts a string variant to preserve formatting from `.toFixed(n)` /
 * `.toPrecision(n)` / `.toExponential(n)` without reparsing through Number.
 *
 * @param value - The numeric value (number) or pre-formatted decimal (string)
 * @returns A MathNode representing the value (canonical: positive number, or opposite of positive)
 *
 * @example
 * numericNode(3)              // number('3')
 * numericNode(-5)             // opposite(number('5'))
 * numericNode('3.14')         // number('3.14')
 * numericNode('-2.5000000000') // opposite(number('2.5000000000'))   (preserves trailing zeros)
 */
export function numericNode(value: number | string): MathNode {
	if (typeof value === 'number') {
		if (value < 0) {
			return opposite(number(Math.abs(value).toString()));
		}
		return number(value.toString());
	}
	if (value.length > 0) {
		if (value[0] === '-') {
			return opposite(number(value.slice(1)));
		}
		if (value[0] === '+') {
			return number(value.slice(1));
		}
	}
	return number(value);
}

/**
 * Parse a decimal numeric string into an exact Rational.
 *
 * Examples:
 *   "1.7"     → 17/10
 *   "1.500"   → 1500/1000 → 3/2 (after rational() reduction)
 *   "42"      → 42/1
 *   "0.001"   → 1/1000
 *   "1e3"     → 1000/1 (scientific via parseFloat + floatToRational)
 *   "1.5e-3"  → 15/10000 (scientific via parseFloat + floatToRational)
 *
 * Returns null if the string cannot be parsed.
 */
function parseDecimalToRational(value: string): Rational | null {
	const s = value.trim();
	if (s.length === 0) return null;

	// Scientific notation: fall back to floatToRational (IEEE754 round-trip).
	// Acceptable here because scientific notation in user input is rare and
	// already implies finite precision.
	if (s.includes('e') || s.includes('E')) {
		const f = parseFloat(s);
		if (!Number.isFinite(f)) return null;
		try {
			return floatToRational(f);
		} catch {
			return null;
		}
	}

	// Decimal with explicit fractional part: parse exactly via BigInt.
	if (s.includes('.')) {
		const parts = s.split('.');
		// Reject malformed strings with multiple dots like "1.2.3".
		if (parts.length !== 2) return null;
		const [intPart, decPart] = parts;
		// Both parts are unsigned digit sequences (factory rejects signed literals).
		// intPart may be empty (".5"), decPart must have at least one digit.
		if (!/^\d*$/.test(intPart) || !/^\d+$/.test(decPart)) return null;
		try {
			const numerator = BigInt((intPart || '0') + decPart);
			const denominator = 10n ** BigInt(decPart.length);
			return rational(numerator, denominator);
		} catch {
			return null;
		}
	}

	// Pure integer.
	if (!/^\d+$/.test(s)) return null;
	try {
		return fromInteger(BigInt(s));
	} catch {
		return null;
	}
}

/**
 * Extract an exact Rational from a numeric MathNode.
 *
 * Recognises both canonical forms:
 *   number('N')               → +N
 *   opposite(number('N'))     → -N
 *   positive(number('N'))     → +N
 *   delimiter(...)            → recurse on content
 *
 * Decimal values are parsed exactly via BigInt — no parseFloat round-off.
 *
 * @param node - The MathNode to extract a rational from
 * @returns A Rational or null if the node is not a numeric literal
 *
 * @example
 * extractRational(number('1.7'))             // 17/10
 * extractRational(opposite(number('1.5')))   // -3/2 (after rational() reduction)
 * extractRational(variable('x'))             // null
 */
export function extractRational(node: MathNode): Rational | null {
	if (isNumber(node)) {
		return parseDecimalToRational(node.value);
	}
	if (node.type === 'opposite') {
		const inner = extractRational(node.operand);
		return inner ? negRational(inner) : null;
	}
	if (node.type === 'positive') {
		return extractRational(node.operand);
	}
	if (node.type === 'delimiter') {
		return extractRational(node.content);
	}
	return null;
}

/**
 * Rationnel EXACT porté par un nœud numérique : littéral (voir
 * `extractRational`) ou quotient de deux littéraux (`\frac{1}{2}`, `-\frac{3}{4}`).
 * Rend null pour tout le reste (radicaux, variables, constantes).
 */
export function extractExactRational(node: MathNode): Rational | null {
	const literal = extractRational(node);
	if (literal !== null) return literal;
	if (node.type === 'opposite') {
		const inner = extractExactRational(node.operand);
		return inner ? negRational(inner) : null;
	}
	if (node.type === 'delimiter') return extractExactRational(node.content);
	if (node.type === 'division') {
		const n = extractExactRational(node.numerator);
		const d = extractExactRational(node.denominator);
		if (n === null || d === null || d.n === 0n) return null;
		return divRational(n, d);
	}
	return null;
}

/**
 * Nœud d'un rationnel exact : entier, ou fraction `n/d` ; un négatif est
 * porté par `opposite` (jamais de littéral négatif).
 */
export function rationalToNode(r: Rational): MathNode {
	const negative = r.n < 0n;
	const magnitude = negative ? -r.n : r.n;
	const positiveNode =
		r.d === 1n
			? number(magnitude.toString())
			: fraction(number(magnitude.toString()), number(r.d.toString()));
	return negative ? opposite(positiveNode) : positiveNode;
}

/**
 * Recursively evaluate an expression numerically with variable substitution.
 *
 * Supports basic arithmetic operations, powers, and common mathematical functions
 * (`\sin^2`, `\cos^{-1}` = arccos, `\sqrt[n]{}` réelle compris).
 * Returns null for expressions that cannot be evaluated (e.g., unknown variables,
 * unsupported functions, or undefined operations).
 *
 * Évaluateur flottant de `limits/sign-tracking` et `limits/indeterminate`, et
 * d'`evaluateAtPoint` des limites pédagogiques (réglage `'undefined'`).
 * ⚠️ π et e ne sont PAS évalués (`null`) : le moteur des limites prend alors le
 * chemin exact, et les évaluer ferait de `lim (x+1)/(πx)` un décimal
 * (simplify-carte § 96, écart connu, `docs/systeme/mathast/README.md`).
 *
 * @param expr - The expression to evaluate
 * @param varName - The variable name to substitute
 * @param varValue - The value to substitute for the variable
 * @param poles - Ce que rend une division par 0 (voir `PoleMode`)
 * @returns The numeric result or null if evaluation fails
 *
 * @example
 * // Evaluate x^2 + 1 at x = 3
 * evaluateNumeric(parseExpression('x^2 + 1'), 'x', 3) // 10
 */
export function evaluateNumeric(
	expr: MathNode,
	varName: string,
	varValue: number,
	poles: PoleMode = 'infinity'
): number | null {
	return evaluateAt(expr, varName, varValue, poles);
}

function evaluateAt(
	expr: MathNode,
	varName: string,
	varValue: number,
	poles: PoleMode
): number | null {
	const value = evaluateAtRaw(expr, varName, varValue, poles);
	if (poles === 'undefined' && value !== null && !Number.isFinite(value)) return null;
	return value;
}

function evaluateAtRaw(
	expr: MathNode,
	varName: string,
	varValue: number,
	poles: PoleMode
): number | null {
	const at = (node: MathNode) => evaluateAt(node, varName, varValue, poles);
	switch (expr.type) {
		case 'number': {
			const val = parseFloat(expr.value);
			return Number.isFinite(val) ? val : null;
		}

		case 'variable':
			return expr.name === varName ? varValue : null;

		case 'addition': {
			const left = at(expr.left);
			const right = at(expr.right);
			return left === null || right === null ? null : left + right;
		}

		case 'subtraction': {
			const left = at(expr.left);
			const right = at(expr.right);
			return left === null || right === null ? null : left - right;
		}

		case 'multiplication': {
			const left = at(expr.left);
			const right = at(expr.right);
			return left === null || right === null ? null : left * right;
		}

		case 'division': {
			const num = at(expr.numerator);
			const den = at(expr.denominator);
			if (num === null || den === null) return null;
			if (poles === 'undefined') return Math.abs(den) < 1e-15 ? null : num / den;
			if (den === 0) return num > 0 ? Infinity : num < 0 ? -Infinity : null;
			return num / den;
		}

		case 'opposite': {
			const operand = at(expr.operand);
			return operand === null ? null : -operand;
		}

		case 'positive':
			return at(expr.operand);

		case 'delimiter':
			return at(expr.content);

		case 'superscript': {
			const base = at(expr.base);
			const exp = at(expr.superscript);
			if (base === null || exp === null) return null;
			return powerOrNull(base, exp);
		}

		case 'function':
			return evaluateFunctionAt(expr, varName, varValue, poles);

		default:
			return null;
	}
}

/** `Math.pow`, `null` quand le résultat n'est pas réel (NaN) */
function powerOrNull(base: number, exponent: number): number | null {
	const result = Math.pow(base, exponent);
	return Number.isNaN(result) ? null : result;
}

function evaluateFunctionAt(
	expr: FunctionNode,
	varName: string,
	varValue: number,
	poles: PoleMode
): number | null {
	// Liste du réglage lue sur le nom ÉCRIT : `\cos^{-1}` est lu là où `cos` l'est
	if (!FUNCTIONS_BY_POLE_MODE[poles].has(expr.name.toLowerCase())) return null;
	// `\cos^{-1}(x)` = arccos(x), pas 1/cos(x) ; réciproque inconnue : refus
	const reciprocal = inverseNotationAsFunction(expr);
	if (reciprocal?.isInverse || (!reciprocal && expr.isInverse)) return null;
	const target = reciprocal ?? expr;
	if (target.args.length !== 1) return null;
	const at = (node: MathNode) => evaluateAt(node, varName, varValue, poles);
	const arg = at(target.args[0]);
	if (arg === null) return null;
	const value = functionValue(target.name.toLowerCase(), target, arg, at);
	if (value === null || target.power === undefined) return value;
	// `\sin^2(x)` = (sin x)²
	const power = at(target.power);
	return power === null ? null : powerOrNull(value, power);
}

function functionValue(
	name: string,
	expr: FunctionNode,
	arg: number,
	at: (node: MathNode) => number | null
): number | null {
	switch (name) {
		case 'sin':
			return Math.sin(arg);
		case 'cos':
			return Math.cos(arg);
		case 'tan':
			return Math.tan(arg);
		case 'exp':
			return Math.exp(arg);
		case 'ln':
		case 'log': {
			// ln(0) = −∞ : divisé par ln(b) < 0, log_b(0) = +∞ pour 0 < b < 1
			if (arg < 0) return null;
			// Base explicite : log_b(a) = ln(a)/ln(b) ; `\log` sans base est décimal
			if (expr.base !== undefined) {
				const base = at(expr.base);
				if (base === null || base <= 0 || base === 1) return null;
				return Math.log(arg) / Math.log(base);
			}
			return name === 'ln' ? Math.log(arg) : Math.log10(arg);
		}
		case 'sqrt': {
			// `\sqrt[n]{x}` : racine n-ième réelle (indice impair : définie pour x < 0)
			if (expr.base === undefined) return arg >= 0 ? Math.sqrt(arg) : null;
			const index = at(expr.base);
			return index === null ? null : realNthRoot(arg, index);
		}
		case 'abs':
			return Math.abs(arg);
		case 'arcsin':
			return arg >= -1 && arg <= 1 ? Math.asin(arg) : null;
		case 'arccos':
			return arg >= -1 && arg <= 1 ? Math.acos(arg) : null;
		case 'arctan':
			return Math.atan(arg);
		case 'floor':
			return Math.floor(arg);
		case 'ceil':
			return Math.ceil(arg);
		case 'sign':
		case 'sgn':
			return Math.sign(arg);
		default:
			return null;
	}
}
