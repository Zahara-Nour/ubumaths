/**
 * Unit tests for evaluateWithModifiers function
 *
 * Tests the convenience API for evaluating LaTeX expressions
 * with formatting modifiers (decimal, addPositive, bracketNegative).
 */

import { describe, it, expect } from 'vitest';
import { evaluateWithModifiers, evaluateAstWithModifiers } from '../evaluate-with-modifiers';
import { parseLatex } from '$lib/mathAST/parser';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { evaluate } from '../evaluate';
import { substitute } from '../substitute';

// =============================================================================
// Basic Evaluation Tests
// =============================================================================

describe('evaluateWithModifiers - basic evaluation', () => {
	it('evaluates simple addition: 3+4 -> 7', () => {
		expect(evaluateWithModifiers('3+4', {})).toBe('7');
	});

	it('evaluates simple subtraction: 10-3 -> 7', () => {
		expect(evaluateWithModifiers('10-3', {})).toBe('7');
	});

	it('evaluates simple multiplication: 5*2 -> 10', () => {
		expect(evaluateWithModifiers('5 \\cdot 2', {})).toBe('10');
	});

	it('evaluates power: 2^3 -> 8', () => {
		expect(evaluateWithModifiers('2^3', {})).toBe('8');
	});

	it('evaluates negative number: -5 -> -5', () => {
		expect(evaluateWithModifiers('-5', {})).toBe('-5');
	});

	it('evaluates zero: 0 -> 0', () => {
		expect(evaluateWithModifiers('0', {})).toBe('0');
	});

	it('evaluates complex expression: 3^2 + 4^2 -> 25', () => {
		expect(evaluateWithModifiers('3^2+4^2', {})).toBe('25');
	});
});

// =============================================================================
// Decimal Modifier Tests
// =============================================================================

describe('evaluateWithModifiers - decimal modifier', () => {
	it('converts fraction to decimal: 1/2 -> 0.5', () => {
		const result = evaluateWithModifiers('\\frac{1}{2}', { decimal: true });
		expect(result).toBe('0.5');
	});

	it('converts fraction to decimal: 1/3 -> 0.333...', () => {
		const result = evaluateWithModifiers('\\frac{1}{3}', { decimal: true });
		expect(result.startsWith('0.333')).toBe(true);
	});

	it('converts fraction to decimal: 1/4 -> 0.25', () => {
		const result = evaluateWithModifiers('\\frac{1}{4}', { decimal: true });
		expect(result).toBe('0.25');
	});

	it('converts 2/3 to decimal', () => {
		const result = evaluateWithModifiers('\\frac{2}{3}', { decimal: true });
		expect(result.startsWith('0.666')).toBe(true);
	});

	it('keeps integer as integer even in decimal mode', () => {
		const result = evaluateWithModifiers('6', { decimal: true });
		expect(result).toBe('6');
	});

	it('evaluates expression and converts to decimal', () => {
		const result = evaluateWithModifiers('1+\\frac{1}{2}', { decimal: true });
		expect(result).toBe('1.5');
	});
});

// =============================================================================
// Add Positive Modifier Tests
// =============================================================================

describe('evaluateWithModifiers - addPositive modifier', () => {
	it('adds + sign to positive number: 5 -> +5', () => {
		expect(evaluateWithModifiers('5', { addPositive: true })).toBe('+5');
	});

	it('adds + sign to positive result: 3+4 -> +7', () => {
		expect(evaluateWithModifiers('3+4', { addPositive: true })).toBe('+7');
	});

	it('does not add + sign to negative number: -3 -> -3', () => {
		expect(evaluateWithModifiers('-3', { addPositive: true })).toBe('-3');
	});

	// Décision de David (2026-10-03) : « ;+ » écrit aussi le signe de 0, sinon `y{{c;+}}`
	// donne « y0 », lu comme un produit (mesuré : 3 modèles cassés en production)
	it('adds + sign to zero: 0 -> +0', () => {
		expect(evaluateWithModifiers('0', { addPositive: true })).toBe('+0');
	});

	it('does not add + sign to negative result: 3-5 -> -2', () => {
		expect(evaluateWithModifiers('3-5', { addPositive: true })).toBe('-2');
	});
});

// =============================================================================
// Bracket Negative Modifier Tests
// =============================================================================

describe('evaluateWithModifiers - bracketNegative modifier', () => {
	it('brackets negative number: -3 -> (-3)', () => {
		expect(evaluateWithModifiers('-3', { bracketNegative: true })).toBe('(-3)');
	});

	it('brackets negative result: 3-5 -> (-2)', () => {
		expect(evaluateWithModifiers('3-5', { bracketNegative: true })).toBe('(-2)');
	});

	it('does not bracket positive number: 5 -> 5', () => {
		expect(evaluateWithModifiers('5', { bracketNegative: true })).toBe('5');
	});

	it('does not bracket zero: 0 -> 0', () => {
		expect(evaluateWithModifiers('0', { bracketNegative: true })).toBe('0');
	});

	it('brackets negative fraction result (exact par défaut)', () => {
		const result = evaluateWithModifiers('-\\frac{1}{2}', { bracketNegative: true });
		expect(result).toBe('(-\\dfrac{1}{2})');
	});
});

// =============================================================================
// Combined Modifiers Tests
// =============================================================================

describe('evaluateWithModifiers - combined modifiers', () => {
	it('combines decimal and addPositive for positive result', () => {
		const result = evaluateWithModifiers('\\frac{2}{3}', { decimal: true, addPositive: true });
		expect(result.startsWith('+0.666')).toBe(true);
	});

	it('combines decimal and bracketNegative for negative result', () => {
		const result = evaluateWithModifiers('-\\frac{1}{4}', {
			decimal: true,
			bracketNegative: true
		});
		expect(result).toBe('(-0.25)');
	});

	it('combines addPositive and bracketNegative - positive case', () => {
		const result = evaluateWithModifiers('5', { addPositive: true, bracketNegative: true });
		expect(result).toBe('+5');
	});

	it('combines addPositive and bracketNegative - negative case', () => {
		const result = evaluateWithModifiers('-5', { addPositive: true, bracketNegative: true });
		expect(result).toBe('(-5)');
	});

	it('combines all three modifiers - positive decimal', () => {
		const result = evaluateWithModifiers('\\frac{1}{2}', {
			decimal: true,
			addPositive: true,
			bracketNegative: true
		});
		expect(result).toBe('+0.5');
	});

	it('combines all three modifiers - negative decimal', () => {
		const result = evaluateWithModifiers('-\\frac{1}{2}', {
			decimal: true,
			addPositive: true,
			bracketNegative: true
		});
		expect(result).toBe('(-0.5)');
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('evaluateWithModifiers - edge cases', () => {
	it('handles empty modifiers object', () => {
		expect(evaluateWithModifiers('5', {})).toBe('5');
	});

	it('handles undefined modifiers', () => {
		expect(evaluateWithModifiers('5')).toBe('5');
	});

	it('handles very small decimals', () => {
		const result = evaluateWithModifiers('\\frac{1}{1000}', { decimal: true });
		expect(result).toBe('0.001');
	});

	it('handles large numbers', () => {
		expect(evaluateWithModifiers('2^{10}', {})).toBe('1024');
	});

	it('handles sqrt of perfect square', () => {
		expect(evaluateWithModifiers('\\sqrt{16}', {})).toBe('4');
	});

	it('handles sqrt of non-perfect square in decimal mode', () => {
		const result = evaluateWithModifiers('\\sqrt{2}', { decimal: true });
		expect(result.startsWith('1.414')).toBe(true);
	});
});

// =============================================================================
// Error Cases Tests
// =============================================================================

describe('evaluateWithModifiers - error cases', () => {
	it('throws on expression with unsubstituted variable', () => {
		expect(() => evaluateWithModifiers('x+1', {})).toThrow();
	});

	it('throws on division by zero', () => {
		expect(() => evaluateWithModifiers('\\frac{1}{0}', {})).toThrow('Division by zero');
	});

	it('throws on invalid LaTeX', () => {
		expect(() => evaluateWithModifiers('\\frac{1}', {})).toThrow();
	});
});

// =============================================================================
// evaluateAstWithModifiers Tests
// =============================================================================

describe('evaluateAstWithModifiers - AST input', () => {
	it('evaluates a simple AST: 3+4 -> 7', () => {
		const ast = parseLatex('3+4');
		expect(evaluateAstWithModifiers(ast, {})).toBe('7');
	});

	it('evaluates AST with addPositive modifier', () => {
		const ast = parseLatex('5');
		expect(evaluateAstWithModifiers(ast, { addPositive: true })).toBe('+5');
	});

	it('evaluates AST with bracketNegative modifier', () => {
		const ast = parseLatex('-3');
		expect(evaluateAstWithModifiers(ast, { bracketNegative: true })).toBe('(-3)');
	});

	it('evaluates AST with combined modifiers', () => {
		const ast = parseLatex('-\\frac{1}{2}');
		expect(evaluateAstWithModifiers(ast, { decimal: true, bracketNegative: true })).toBe('(-0.5)');
	});
});

// =============================================================================
// Résultat exact par défaut (comme TinyMath) — `;d` pour le décimal
// =============================================================================

describe('evaluateWithModifiers - résultat exact par défaut', () => {
	it('fraction irréductible : 90/70 → \\dfrac{9}{7}', () => {
		expect(evaluateWithModifiers('\\frac{90}{70}', {})).toBe('\\dfrac{9}{7}');
	});

	it('signe devant la fraction : -6/8 → -\\dfrac{3}{4}', () => {
		expect(evaluateWithModifiers('\\frac{-6}{8}', {})).toBe('-\\dfrac{3}{4}');
	});

	it('somme de fractions : 1/3 + 1/6 → \\dfrac{1}{2}', () => {
		expect(evaluateWithModifiers('\\frac{1}{3}+\\frac{1}{6}', {})).toBe('\\dfrac{1}{2}');
	});

	it('entier si le résultat tombe juste : 12/4 → 3', () => {
		expect(evaluateWithModifiers('\\frac{12}{4}', {})).toBe('3');
	});

	it('racine simplifiée : √8 → 2 \\sqrt{2}', () => {
		expect(evaluateWithModifiers('\\sqrt{8}', {})).toBe('2 \\sqrt{2}');
	});

	it('min de fractions : garde la fraction exacte', () => {
		expect(evaluateWithModifiers('\\min(\\frac{2}{3}, \\frac{2}{9})', {})).toBe('\\dfrac{2}{9}');
	});

	it('un décimal dans le calcul donne un décimal : 0.5 + 0.25 → 0.75', () => {
		expect(evaluateWithModifiers('0.5+0.25', {})).toBe('0.75');
	});

	it('décimal × entier : 1.2 × 3 → 3.6', () => {
		expect(evaluateWithModifiers('1.2 \\times 3', {})).toBe('3.6');
	});

	it('`;d` force le décimal : 7/10 → 0.7', () => {
		expect(evaluateWithModifiers('\\frac{7}{10}', { decimal: true })).toBe('0.7');
	});

	it('`;+` sur une fraction exacte : +\\dfrac{3}{4}', () => {
		expect(evaluateWithModifiers('\\frac{3}{4}', { addPositive: true })).toBe('+\\dfrac{3}{4}');
	});

	it('`;()` sur une fraction négative : (-\\dfrac{3}{4})', () => {
		expect(evaluateWithModifiers('\\frac{-3}{4}', { bracketNegative: true })).toBe(
			'(-\\dfrac{3}{4})'
		);
	});
});

describe('evaluateWithModifiers - exact aussi pour ln, exponentielle, π ; `;d` pour la valeur', () => {
	it('ln(2) exact, 0.693… avec `;d`', () => {
		expect(evaluateWithModifiers('\\ln(2)', {})).toContain('\\ln');
		expect(evaluateWithModifiers('\\ln(2)', { decimal: true }).startsWith('0.693147')).toBe(true);
	});

	it('π reste exact', () => {
		expect(evaluateWithModifiers('12\\pi', {})).toBe('12 \\pi');
	});
});

// Calcul littéral (comme TinyMath) : s'il reste des lettres, le résultat est l'expression
// RÉDUITE par `tidy` — jamais développée (décision de David, lot Calcul littéral).
describe('evaluateAstWithModifiers - expression avec des lettres : réduite par tidy', () => {
	// Lettres tirées : seules celles-ci ouvrent le calcul littéral
	const letters = new Set(['a', 'b', 'x', 'y']);
	const evalCustom = (expr: string, modifiers = {}) =>
		evaluateAstWithModifiers(parseCustom(expr), modifiers, letters);

	it('une lettre qui ne vient pas d’un tirage reste une erreur (faute de frappe)', () => {
		expect(() => evaluateAstWithModifiers(parseCustom('invalid'), {}, letters)).toThrow();
		expect(() => evaluateAstWithModifiers(parseCustom('3*z'), {}, letters)).toThrow();
	});

	it.each([
		['3*a', '3a'],
		['a*3', '3a'],
		['2*3*x', '6x'],
		['3*x+4*x', '7x'],
		['3a+2b+5a', '8a+2b'],
		['x*x*3', '3x^2']
	])('%s → %s', (expr, expected) => {
		expect(evalCustom(expr)).toBe(expected);
	});

	it('pas de développement : 5(2+3x) reste un produit', () => {
		expect(evalCustom('5*(2+3x)')).not.toContain('15');
	});

	it('`;+` : terme signé', () => {
		expect(evalCustom('3*x', { addPositive: true })).toBe('+3x');
		expect(evalCustom('-3*x', { addPositive: true })).toBe('-3x');
	});

	it('`;()` : terme négatif entre parenthèses', () => {
		expect(evalCustom('-3*x', { bracketNegative: true })).toBe('(-3x)');
	});

	it('un calcul numérique ne change pas', () => {
		expect(evalCustom('90/70')).toBe('\\dfrac{9}{7}');
	});
});

// `a*(b)^n` avec b = -2 et n lettre libre : tidy retire le délimiteur, et l'écriture
// rendue doit rester (-2)^n — pas -2^n, qui se relit -(2^n) (valeur fausse pour n pair).
describe('evaluateAstWithModifiers - base négative et exposant littéral', () => {
	const letters = new Set(['n', 'x']);
	const evalCustom = (expr: string) => evaluateAstWithModifiers(parseCustom(expr), {}, letters);
	/** Valeur de l'écriture rendue, relue, pour n = 2 */
	const valueAtTwo = (written: string) => {
		const ast = written.includes('\\') ? parseLatex(written) : parseCustom(written);
		const result = evaluate(substitute(ast, { n: 2, x: 2 }), { mode: 'decimal' });
		return result.status === 'value' ? Number(result.value) : NaN;
	};

	it.each([
		['3*{-2}^x', 12],
		['{-2}^n', 4],
		['-3*{-2}^n', -12],
		['{-2}^{n+1}', -8],
		['{-0.5}^n', 0.25],
		['{-1/4}^n', 0.0625],
		['{1/4}^n', 0.0625],
		['-{2}^n', -4]
	])('%s relu vaut %s pour n = 2', (expr, expected) => {
		expect(valueAtTwo(evalCustom(expr))).toBeCloseTo(expected, 10);
	});

	it('3*{-2}^x s’écrit avec la base entre parenthèses', () => {
		expect(evalCustom('3*{-2}^x')).toContain('(-2)^x');
	});

	it('-{2}^n reste -2^n', () => {
		expect(evalCustom('-{2}^n')).toBe('-2^n');
	});
});
