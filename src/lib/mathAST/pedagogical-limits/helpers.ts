/**
 * Pedagogical Limits — Internal Helpers
 *
 * Utility functions shared by the pipeline strategies. None of these are part
 * of the public API ; consumers should go through `pipeline.ts` and the
 * barrel.
 *
 * @module mathAST/pedagogical-limits/helpers
 */

import type { MathNode } from '../types';
import type { IndeterminateForm, LimitDirection } from '../limits/types';
import { toLatex } from '../latex-generator';
import { mapNode } from '../transforms';
import {
	isAddition,
	isDivision,
	isFunction,
	isInfinity,
	isMultiplication,
	isNegativeInfinity,
	isNumber,
	isOpposite,
	isPositiveInfinity,
	isPositive,
	isSubtraction,
	isSuperscript,
	isVariable
} from '../guards';
import {
	add,
	divide,
	euler,
	func,
	multiply,
	number,
	power,
	subtract,
	variable as makeVariable
} from '../factory';
import { extractExactRational, numericNode } from '../common/numeric';
import { readableText } from '../variations/display';
import type { Rational } from '../normal/types';
import { absRational, isNegative } from '../normal/rational';
import { divideOutRoot, linearFactorText, rationalPolynomialNode, toPolynomial } from '../factor';

// =============================================================================
// Approach classification
// =============================================================================

/**
 * Kind of approach point — useful for branching strategy selection.
 */
export type ApproachKind = 'finite' | 'positive-infinity' | 'negative-infinity';

/**
 * Classify the approach point.
 */
export function classifyApproach(approach: MathNode): ApproachKind {
	if (isPositiveInfinity(approach)) return 'positive-infinity';
	if (isNegativeInfinity(approach)) return 'negative-infinity';
	return 'finite';
}

/**
 * `true` iff the approach point is `±∞`.
 */
export function isAtInfinity(approach: MathNode): boolean {
	return isInfinity(approach);
}

// =============================================================================
// Numeric evaluation helpers
// =============================================================================

/**
 * Evaluate an expression numerically by substituting `varName = value`.
 *
 * Returns `null` when:
 * - the expression contains other variables (besides `varName`)
 * - division by zero is encountered
 * - the result is non-finite (NaN / ±Infinity from the JS arithmetic)
 *
 * Used to test whether a polynomial root is `varName = a` (i.e. `f(a) === 0`),
 * to check whether direct substitution yields a finite result, and to
 * estimate the value of complex sub-expressions.
 *
 * Walks the AST recursively. (L'ancien jumeau `evaluateSimple` de
 * `limits/algebraic.ts` a été supprimé au lot 3a de l'ADR 0024 : ce module
 * est le seul à évaluer ainsi.)
 */
export function evaluateAtPoint(expr: MathNode, varName: string, value: number): number | null {
	// Transparent unwrap of delimiter nodes (parens emitted by the custom parser).
	if (expr.type === 'delimiter') return evaluateAtPoint(expr.content, varName, value);

	switch (expr.type) {
		case 'number': {
			const v = parseFloat(expr.value);
			return Number.isFinite(v) ? v : null;
		}
		case 'variable':
			return expr.name === varName ? value : null;
		case 'addition': {
			const l = evaluateAtPoint(expr.left, varName, value);
			const r = evaluateAtPoint(expr.right, varName, value);
			return l !== null && r !== null ? l + r : null;
		}
		case 'subtraction': {
			const l = evaluateAtPoint(expr.left, varName, value);
			const r = evaluateAtPoint(expr.right, varName, value);
			return l !== null && r !== null ? l - r : null;
		}
		case 'multiplication': {
			const l = evaluateAtPoint(expr.left, varName, value);
			const r = evaluateAtPoint(expr.right, varName, value);
			return l !== null && r !== null ? l * r : null;
		}
		case 'division': {
			const n = evaluateAtPoint(expr.numerator, varName, value);
			const d = evaluateAtPoint(expr.denominator, varName, value);
			if (n === null || d === null) return null;
			if (Math.abs(d) < 1e-15) return null;
			const q = n / d;
			return Number.isFinite(q) ? q : null;
		}
		case 'superscript': {
			const b = evaluateAtPoint(expr.base, varName, value);
			const e = evaluateAtPoint(expr.superscript, varName, value);
			if (b === null || e === null) return null;
			const v = Math.pow(b, e);
			return Number.isFinite(v) ? v : null;
		}
		case 'opposite': {
			const v = evaluateAtPoint(expr.operand, varName, value);
			return v === null ? null : -v;
		}
		case 'positive': {
			return evaluateAtPoint(expr.operand, varName, value);
		}
		case 'function': {
			if (expr.args.length !== 1) return null;
			const arg = evaluateAtPoint(expr.args[0], varName, value);
			if (arg === null) return null;
			const name = expr.name.toLowerCase();
			let v: number;
			switch (name) {
				case 'sin':
					v = Math.sin(arg);
					break;
				case 'cos':
					v = Math.cos(arg);
					break;
				case 'tan':
					v = Math.tan(arg);
					break;
				case 'exp':
					v = Math.exp(arg);
					break;
				case 'ln':
				case 'log': {
					if (arg <= 0) return null;
					// Base explicite : log_b(a) = ln(a)/ln(b) ; `\log` sans base est décimal
					if (expr.base !== undefined) {
						const base = evaluateAtPoint(expr.base, varName, value);
						if (base === null || base <= 0 || base === 1) return null;
						v = Math.log(arg) / Math.log(base);
					} else {
						v = name === 'ln' ? Math.log(arg) : Math.log10(arg);
					}
					break;
				}
				case 'sqrt':
					if (arg < 0) return null;
					v = Math.sqrt(arg);
					break;
				case 'abs':
					v = Math.abs(arg);
					break;
				default:
					return null;
			}
			return Number.isFinite(v) ? v : null;
		}
		default:
			return null;
	}
}

// =============================================================================
// Division par une racine commune (noyau `factor/`)
// =============================================================================

/**
 * Divise N et D une fois par (x − a), exactement (noyau `factor/`, ADR 0024) :
 * les deux quotients écrits (négatifs en soustractions), ou `null` si l'un
 * n'est pas un polynôme en `varName` ou n'a pas `a` pour racine.
 *
 * Exemple : (x² − 9, x + 3) en a = −3 → (x − 3, 1).
 */
export function divideByCommonRoot(
	numerator: MathNode,
	denominator: MathNode,
	varName: string,
	a: Rational
): { numerator: MathNode; denominator: MathNode } | null {
	const num = toPolynomial(numerator, varName);
	const den = toPolynomial(denominator, varName);
	if (num === null || den === null) return null;
	const n = divideOutRoot(num, a, 1);
	const d = divideOutRoot(den, a, 1);
	if (n.multiplicity === 0 || d.multiplicity === 0) return null;
	const x = makeVariable(varName);
	return {
		numerator: rationalPolynomialNode(n.quotient, x),
		denominator: rationalPolynomialNode(d.quotient, x)
	};
}

// =============================================================================
// Approach formatting
// =============================================================================

/**
 * Format an approach point for use in human-readable titles/descriptions.
 */
export function formatApproachShort(approach: MathNode): string {
	if (isPositiveInfinity(approach)) return '+∞';
	if (isNegativeInfinity(approach)) return '−∞';
	if (isNumber(approach)) return approach.value;
	if (isVariable(approach)) return approach.name;
	if (isOpposite(approach) && isNumber(approach.operand)) return `−${approach.operand.value}`;
	const exact = extractExactRational(approach);
	if (exact !== null) return `${isNegative(exact) ? '−' : ''}${formatRational(absRational(exact))}`;
	return '?';
}

/**
 * Une valeur en texte pour les titres (prose, pas de LaTeX) : `3/2`, `−1/4`,
 * `+∞`, sinon l'écriture lisible de `readableText`, racines et π en symboles
 * (`3√2`, `√(x+1)`, `π/4`).
 */
export function formatValueShort(node: MathNode): string {
	const short = formatApproachShort(node);
	if (short !== '?') return short;
	return readableText(node)
		.replace(/sqrt\((\w+)\)/g, '√$1')
		.replace(/sqrt\(/g, '√(')
		.replace(/\\?\bpi\b/g, 'π')
		.replace(/^-/, '−');
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Une puissance de la variable en texte, pour les titres et explications : `x`, `x²`, `x¹⁰` */
export function formatPowerShort(node: MathNode): string {
	if (isVariable(node)) return node.name;
	if (isSuperscript(node) && isVariable(node.base) && isNumber(node.superscript)) {
		const digits = [...node.superscript.value].map((d) => SUPERSCRIPT_DIGITS[Number(d)]);
		return `${node.base.name}${digits.join('')}`;
	}
	return formatValueShort(node);
}

/**
 * Le facteur entier de la racine a pour les titres, comme un élève l'écrit :
 * `(x − 2)`, `(x + 3)`, `(2x − 1)` en 1/2 (V23).
 */
export function formatLinearFactor(varName: string, a: Rational): string {
	return linearFactorText(varName, a);
}

function formatRational(r: Rational): string {
	return r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`;
}

// =============================================================================
// Prose : les maths entre `$…$` (V25)
// =============================================================================

/**
 * Une formule pour la prose des titres et explications, entre `$…$` :
 * `InlineMarkdown` (ubumark) l'affiche en maths. Jamais d'Unicode (`+∞`, `x²`)
 * dans la prose : `$+\\infty$`, `$x^{2}$`.
 */
export function inlineMath(node: MathNode): string {
	return `$${toLatex(node)}$`;
}

/** Le point d'approche, côté compris : `$0^+$`, `$2^-$`, `$+\\infty$` */
export function approachMath(approach: MathNode, direction: LimitDirection = 'both'): string {
	const latex = toLatex(approach);
	if (direction === 'left') return `$${latex}^-$`;
	if (direction === 'right') return `$${latex}^+$`;
	return `$${latex}$`;
}

const FORM_LATEX: Readonly<Record<IndeterminateForm, string>> = {
	'0/0': '\\frac{0}{0}',
	'∞/∞': '\\frac{\\infty}{\\infty}',
	'0*∞': '0 \\times \\infty',
	'∞-∞': '\\infty - \\infty',
	'0^0': '0^{0}',
	'∞^0': '\\infty^{0}',
	'1^∞': '1^{\\infty}',
	none: ''
};

/** Une forme indéterminée en LaTeX : `$\\frac{0}{0}$`, `$\\infty - \\infty$` */
export function formMath(form: IndeterminateForm | undefined): string {
	return form && form !== 'none' ? `$${FORM_LATEX[form]}$` : 'indéterminée';
}

// =============================================================================
// Exponentielle : e^u (écriture de l'élève) ⇄ \\exp(u) (table de référence)
// =============================================================================

/**
 * `e^{u}` → `\\exp(u)`, et la parenthèse obligatoire autour de la base d'une
 * puissance ôtée (`\\left(1 + \\frac{1}{x}\\right)^x`) : la forme que lisent
 * les motifs de `KNOWN_LIMITS` (`e^x/x` n'y était pas reconnu). Pour la
 * reconnaissance seulement : l'étape garde l'écriture de l'élève. Les autres
 * parenthèses restent : la table ne s'élargit pas au-delà de ces écritures.
 */
export function toKnownLimitShape(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isSuperscript(n)) return n;
		if (n.base.type === 'constant' && n.base.constant === 'euler') {
			return func('exp', [n.superscript]);
		}
		if (n.base.type === 'delimiter' && (n.base.semantic ?? 'grouping') === 'grouping') {
			return power(n.base.content, n.superscript);
		}
		return n;
	});
}

/** `\\exp(1)` → e, `\\exp(u)` → `e^{u}` : la valeur écrite comme en classe */
export function withEulerPowers(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isFunction(n) || n.name !== 'exp' || n.args.length !== 1) return n;
		const arg = n.args[0];
		return isNumber(arg) && arg.value === '1' ? euler() : power(euler(), arg);
	});
}

// =============================================================================
// Conjugate / rationalisation
// =============================================================================

/**
 * `true` if `expr` is a square root (either `sqrt(...)` function call or
 * `(...)^{1/2}` superscript form).
 */
export function isSqrt(expr: MathNode): boolean {
	if (isFunction(expr) && expr.name.toLowerCase() === 'sqrt') return true;
	if (isSuperscript(expr) && isDivision(expr.superscript)) {
		const num = expr.superscript.numerator;
		const den = expr.superscript.denominator;
		return isNumber(num) && num.value === '1' && isNumber(den) && den.value === '2';
	}
	return false;
}

/** Extract the argument of a square root, or null if `expr` isn't a sqrt.
 *
 * Defensive check on the superscript branch : only `^{1/2}` powers are
 * accepted, not arbitrary `^n`. Without this guard, `getSqrtArg(x^3)`
 * would silently return `x` even though `x^3` is not a square root.
 */
export function getSqrtArg(expr: MathNode): MathNode | null {
	if (isFunction(expr) && expr.name.toLowerCase() === 'sqrt') {
		return expr.args[0] ?? null;
	}
	if (isSqrt(expr) && isSuperscript(expr)) {
		return expr.base;
	}
	return null;
}

/**
 * Look for a conjugate in `expr` (typically the numerator of a fraction with
 * a 0/0 indeterminate form involving square roots).
 *
 * Recognised shapes :
 *
 * - `√a − b`  → conjugate `√a + b`,  expanded `a − b²`
 * - `b − √a`  → conjugate `b + √a`,  expanded `b² − a`
 * - `√a + b`  → conjugate `√a − b`,  expanded `a − b²`
 * - `b + √a`  → conjugate `b − √a`,  expanded `b² − a`
 *
 * Returns `null` for non-conjugate-able shapes. `b` may be any non-sqrt
 * sub-expression (typically a number or a polynomial term).
 *
 * Mirrors the private `findConjugate` of `limits/algebraic.ts`. Replicating
 * here keeps the pedagogical pipeline free from a private-import dependency
 * and lets us extend the supported shapes over time.
 */
export function findConjugate(expr: MathNode): { conjugate: MathNode; expanded: MathNode } | null {
	// Transparent unwrap of delimiter nodes (parens emitted by parseCustomSafe).
	if (expr.type === 'delimiter') return findConjugate(expr.content);

	if (isSubtraction(expr)) {
		// √a − b → conjugate √a + b ; (√a)² − b² = a − b²
		if (isSqrt(expr.left) && !isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.left);
			if (sqrtArg) {
				return {
					conjugate: add(expr.left, expr.right),
					expanded: subtract(sqrtArg, squareIfNeeded(expr.right))
				};
			}
		}
		// b − √a → conjugate b + √a ; b² − a
		if (!isSqrt(expr.left) && isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.right);
			if (sqrtArg) {
				return {
					conjugate: add(expr.left, expr.right),
					expanded: subtract(squareIfNeeded(expr.left), sqrtArg)
				};
			}
		}
	}

	if (isAddition(expr)) {
		// √a + b → conjugate √a − b ; a − b²
		if (isSqrt(expr.left) && !isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.left);
			if (sqrtArg) {
				return {
					conjugate: subtract(expr.left, expr.right),
					expanded: subtract(sqrtArg, squareIfNeeded(expr.right))
				};
			}
		}
		// b + √a → conjugate b − √a ; b² − a
		if (!isSqrt(expr.left) && isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.right);
			if (sqrtArg) {
				return {
					conjugate: subtract(expr.left, expr.right),
					expanded: subtract(squareIfNeeded(expr.left), sqrtArg)
				};
			}
		}
	}

	return null;
}

function squareIfNeeded(node: MathNode): MathNode {
	// Numeric constants : evaluate the square eagerly so the simplified
	// numerator looks clean (`1²` → `1`, `(2)²` → `4`).
	if (isNumber(node)) {
		const v = parseFloat(node.value);
		if (Number.isFinite(v)) return numericNode(v * v);
	}
	// Already x^2 — no need to re-square. Tighten on `^2` specifically so
	// `x^3` is correctly squared to `x^6` (was a latent bug : the previous
	// `if (isSuperscript(node)) return node` short-circuited any power).
	if (isSuperscript(node) && isNumber(node.superscript) && node.superscript.value === '2') {
		return node;
	}
	return power(node, number('2'));
}

// =============================================================================
// Direction handling
// =============================================================================

/**
 * Default the direction to `'both'` when omitted, matching `LimitDirection`'s
 * runtime convention.
 */
export function normalizeDirection(direction: LimitDirection | undefined): LimitDirection {
	return direction ?? 'both';
}

// =============================================================================
// Re-export commonly used guards (convenience for strategy files)
// =============================================================================

export {
	isAddition,
	isDivision,
	isFunction,
	isInfinity,
	isMultiplication,
	isNegativeInfinity,
	isNumber,
	isOpposite,
	isPositive,
	isPositiveInfinity,
	isSubtraction,
	isSuperscript,
	isVariable
};

// Re-export commonly used factories so strategy files don't have to import
// from both `helpers.ts` and `factory.ts`.
export { add, divide, multiply, number, numericNode, power, subtract, makeVariable };
