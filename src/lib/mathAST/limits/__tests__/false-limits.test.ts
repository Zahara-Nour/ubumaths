/**
 * Limites FAUSSES relevées en revue (2026-10-06) : le moteur rendait une
 * valeur là où il n'y en a pas, ou une valeur fausse. Règle : mieux vaut
 * « non supportée » qu'une valeur fausse. Chaque attendu est vérifié
 * numériquement (commentaire au-dessus du cas).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { classifyWithSign } from '../sign-tracking';
import { positiveInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { LimitDirection, LimitResult } from '../types';
import type { MathNode } from '../../types';

function target(at: string): MathNode {
	if (at === '+inf') return positiveInfinity();
	return parseLatex(at);
}

function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function limitOf(input: string, at: string, dir: LimitDirection = 'both'): string {
	return describeLimit(evaluateLimit(parseLatex(input), 'x', target(at), dir));
}

/** Aucune valeur : ni exacte, ni infinie, ni approchée. */
function hasNoValue(result: string): boolean {
	return /^(does-not-exist|unsupported|indeterminate) null$/.test(result);
}

describe('borne ∞ écrite par le parseur (`\\infty`, `+\\infty`) : pas de substitution directe', () => {
	// x/eˣ, x²/eˣ, x⁵/eˣ → 0 ; eˣ/x³ → +∞ ; ln x / x → 0 (croissances comparées ;
	// en x = 50 : 1e-20, 7e-19, 6e-14, 6e16, 0.078 → 0)
	it.each([
		['\\frac{x}{e^x}', 'exact 0'],
		['\\frac{x^2}{e^x}', 'exact 0'],
		['\\frac{x^5}{e^x}', 'exact 0'],
		['\\frac{e^x}{x^3}', '+inf'],
		['\\frac{\\ln x}{x}', 'exact 0']
	])('%s en +∞ → %s', (input, expected) => {
		for (const at of ['+\\infty', '\\infty']) {
			const result = limitOf(input, at);
			expect(result.endsWith(expected), `${input} en ${at} : ${result}`).toBe(true);
			expect(result).not.toContain('\\infty');
		}
	});

	it('la limite écrite \\lim_{x\\to+\\infty} est calculée, pas substituée', () => {
		const result = describeLimit(evaluateLimit(parseLatex('\\lim_{x\\to+\\infty}\\frac{x}{e^x}')));
		expect(result).toBe('exact 0');
	});
});

describe('produit infini en un point : gauche ≠ droite → pas de limite bilatérale', () => {
	// (x+1)/x : 0⁻ → −∞, 0⁺ → +∞ ; 1/(x(x−1)) : 0⁻ → +∞, 0⁺ → −∞ ; x·(1/x)·(1/x) = 1/x
	it.each([
		['\\frac{1}{x}\\cdot(x+1)'],
		['\\frac{1}{x}\\cdot\\frac{1}{x-1}'],
		['x\\cdot\\frac{1}{x}\\cdot\\frac{1}{x}']
	])('%s en 0 → aucune valeur', (input) => {
		const result = limitOf(input, '0');
		expect(hasNoValue(result), result).toBe(true);
	});

	it('les limites latérales restent justes', () => {
		expect(limitOf('\\frac{1}{x}\\cdot(x+1)', '0', 'left')).toBe('infinite -inf');
		expect(limitOf('\\frac{1}{x}\\cdot(x+1)', '0', 'right')).toBe('infinite +inf');
		expect(limitOf('\\frac{1}{x}\\cdot\\frac{1}{x-1}', '0', 'right')).toBe('infinite -inf');
	});
});

describe('facteur oscillant : jamais de valeur', () => {
	// x·sin x, x²·sin x en +∞ ; sin(1/x)/x en 0 : oscillent entre −∞ et +∞
	it.each([
		['\\sin x\\cdot x', '+inf', 'both'],
		['x\\cdot\\sin x\\cdot x', '+inf', 'both'],
		['\\sin(\\frac{1}{x})\\cdot\\frac{1}{x}', '0', 'both'],
		['\\sin(\\frac{1}{x})\\cdot\\frac{1}{x}', '0', 'right'],
		['\\sin(\\frac{1}{x})\\cdot\\frac{1}{x}', '0', 'left']
	] as const)('%s en %s (%s) → aucune valeur', (input, at, dir) => {
		const result = limitOf(input, at, dir);
		expect(hasNoValue(result), result).toBe(true);
	});
});

describe('pôle sous la substitution directe', () => {
	// (x−π)·tan(x/2) en π : −2 (π ± 1e-5 → −2.0000000000) ; jamais 0
	it('(x−π)·tan(x/2) en π → −2 ou aucune valeur, jamais 0', () => {
		const result = limitOf('(x-\\pi)\\cdot\\tan(\\frac{x}{2})', '\\pi');
		expect(result === 'exact -2' || hasNoValue(result), result).toBe(true);
	});

	// tan(x/2)(x−π)/x en π : −2/π ≈ −0.63662 ; jamais « 0/π »
	it('tan(x/2)·(x−π)·(1/x) en π → −2/π ou aucune valeur', () => {
		const result = limitOf('\\tan(x/2)(x-\\pi)\\frac{1}{x}', '\\pi');
		expect(
			result === 'exact -\\dfrac{2}{\\pi}' ||
				result === 'exact \\dfrac{-2}{\\pi}' ||
				hasNoValue(result),
			result
		).toBe(true);
	});

	// tan x en π/2⁻ : tan(π/2 − 1e-6) = 1e6 → +∞
	it('tan x en π/2⁻ → +∞, pas « tan(π/2) »', () => {
		expect(limitOf('\\tan x', '\\frac{\\pi}{2}', 'left')).toBe('infinite +inf');
	});
});

describe('limites justes inchangées', () => {
	it.each([
		['\\frac{\\sin x}{x}', '0', 'both', 'exact 1'],
		['x e^{-x}', '+inf', 'both', 'exact 0'],
		['\\frac{1}{x}', '0', 'right', 'infinite +inf'],
		['\\frac{1}{x}', '0', 'both', 'does-not-exist null'],
		['3', '0', 'both', 'exact 3'],
		['x^2+2x-1', '1', 'both', 'exact 2'],
		['x^3-x', '+inf', 'both', 'infinite +inf'],
		['\\frac{x^2-1}{x-1}', '1', 'both', 'exact 2'],
		['\\frac{1}{x^2}', '0', 'both', 'infinite +inf']
	] as const)('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limitOf(input, at, dir)).toBe(expected);
	});
});

describe('infini + borné oscillant (revue PR #906) : bornes structurelles', () => {
	// sin, cos ∈ [−1, 1] : ±∞ + borné → ±∞ ; borné / (→ ±∞) → 0 ;
	// ±∞ × borné de signe strict (2 + sin x ∈ [1, 3]) → ±∞
	it.each([
		['x+\\sin x', '+inf', 'infinite +inf'],
		['x-\\cos x', '-inf', 'infinite -inf'],
		['x^2+\\cos x', '-inf', 'infinite +inf'],
		['e^x+\\sin x', '+inf', 'infinite +inf'],
		['\\ln x+\\sin x', '+inf', 'infinite +inf'],
		['2x+3\\cos x', '+inf', 'infinite +inf'],
		['x(2+\\sin x)', '+inf', 'infinite +inf'],
		['\\frac{x}{2+\\sin x}', '+inf', 'infinite +inf'],
		['\\frac{2+\\sin x}{x}', '+inf', 'exact 0'],
		['\\frac{\\sin x}{\\sqrt{x}}', '+inf', 'exact 0'],
		['\\frac{\\cos x}{\\ln x}', '+inf', 'exact 0']
	] as const)('%s en %s → %s', (input, at, expected) => {
		const approach = at === '-inf' ? '-\\infty' : '+\\infty';
		expect(limitOf(input, approach)).toBe(expected);
	});

	it.each([['x\\sin x'], ['\\sin x']])('%s en +∞ → aucune valeur', (input) => {
		const result = limitOf(input, '+\\infty');
		expect(hasNoValue(result), result).toBe(true);
	});
});

describe('bord du domaine en bilatéral : la limite du seul côté défini', () => {
	// convention lycée : un seul côté dans le domaine → limite de ce côté
	it.each([
		['x\\ln x', '0', 'exact 0'],
		['\\ln x', '0', 'infinite -inf'],
		['\\ln(x-1)', '1', 'infinite -inf'],
		['\\sqrt{x}', '0', 'exact 0']
	] as const)('%s en %s (both) → %s', (input, at, expected) => {
		expect(limitOf(input, at, 'both')).toBe(expected);
	});
});

describe('pôles hors tan : jamais une valeur finie issue d’un dénominateur ≈ 0', () => {
	// 1/cos x en π/2⁻ : cos > 0 → +∞ ; π/2⁺ → −∞ ; bilatéral : pas de limite
	it('1/cos x en π/2⁻ → +∞', () => {
		expect(limitOf('\\frac{1}{\\cos x}', '\\frac{\\pi}{2}', 'left')).toBe('infinite +inf');
	});

	it('1/cos x en π/2 (both) → aucune valeur', () => {
		const result = limitOf('\\frac{1}{\\cos x}', '\\frac{\\pi}{2}', 'both');
		expect(hasNoValue(result), result).toBe(true);
	});

	it('sin x / cos x en π/2⁻ → +∞', () => {
		expect(limitOf('\\frac{\\sin x}{\\cos x}', '\\frac{\\pi}{2}', 'left')).toBe('infinite +inf');
	});

	it('1/cos² x en π/2 → +∞', () => {
		expect(limitOf('\\frac{1}{\\cos^2 x}', '\\frac{\\pi}{2}', 'both')).toBe('infinite +inf');
	});

	it('cot x en π/2 → 0', () => {
		expect(limitOf('\\cot x', '\\frac{\\pi}{2}', 'both')).toBe('exact 0');
	});

	it('tan x en π/2 (both) → pas de limite', () => {
		expect(limitOf('\\tan x', '\\frac{\\pi}{2}', 'both')).toBe('does-not-exist null');
	});
});

describe('classifyWithSign en bilatéral (commentaire de la fonction)', () => {
	// « Un côté hors domaine (inconnu) ne contredit rien : ln x en 0 reste −∞ »
	it('ln x en 0 (both) → −∞', () => {
		expect(classifyWithSign(parseLatex('\\ln x'), 'x', parseLatex('0'), 'both').type).toBe(
			'neg-infinity'
		);
	});

	// 1/x en 0 : 0⁻ → −∞, 0⁺ → +∞ → aucun signe
	it('1/x en 0 (both) → inconnu', () => {
		expect(classifyWithSign(parseLatex('\\frac{1}{x}'), 'x', parseLatex('0'), 'both').type).toBe(
			'unknown'
		);
	});

	// cos(x)² en π/2 : zéro exact, positif des deux côtés → 0⁺
	it('cos(x)² en π/2 (both) → 0⁺', () => {
		const expr = parseLatex('\\cos(x)^2');
		expect(classifyWithSign(expr, 'x', parseLatex('\\frac{\\pi}{2}'), 'both').type).toBe(
			'zero-plus'
		);
	});
});

describe('borné × (→ 0) en +∞', () => {
	// sin x · (1/x) ∈ [−1/x, 1/x] → 0
	it('sin x · 1/x en +∞ → 0', () => {
		expect(limitOf('\\sin x\\cdot\\frac{1}{x}', '+\\infty')).toBe('exact 0');
	});
});

describe('e^{±1/x} à un côté en 0 (régression de la revue 2) : la variable sous l’exposant', () => {
	// 0⁻ : 1/x → −∞, e^{1/x} → 0 ; 0⁺ : −1/x → −∞, e^{−1/x} → 0
	// (x = ∓1e-3 : e^{-1000} ≈ 0 → 1, 1, 0, −1, 1, 1)
	it.each([
		['1+e^{\\frac{1}{x}}', 'left', 'exact 1'],
		['1+e^{-\\frac{1}{x}}', 'right', 'exact 1'],
		['x+e^{-\\frac{1}{x}}', 'right', 'exact 0'],
		['e^{\\frac{1}{x}}-1', 'left', 'exact -1'],
		['\\frac{1}{1+e^{\\frac{1}{x}}}', 'left', 'exact 1'],
		['\\frac{1}{1+e^{-\\frac{1}{x}}}', 'right', 'exact 1']
	] as const)('%s en 0 (%s) → %s', (input, dir, expected) => {
		expect(limitOf(input, '0', dir)).toBe(expected);
	});

	// 0⁻ → 1, 0⁺ → 0 : pas de limite bilatérale (main rendait « exact 0 »)
	it('1/(1+e^{1/x}) en 0 (both) → aucune valeur', () => {
		const result = limitOf('\\frac{1}{1+e^{\\frac{1}{x}}}', '0', 'both');
		expect(hasNoValue(result), result).toBe(true);
	});
});

describe('ln(0) non réduit : jamais une valeur exacte', () => {
	// ln(ln x) en 1⁺ : ln x → 0⁺ → −∞ (x = 1+1e-6 : ln(1e-6) ≈ −13.8)
	it('ln(ln x) en 1⁺ → −∞', () => {
		expect(limitOf('\\ln(\\ln x)', '1', 'right')).toMatch(/ -inf$/);
	});

	// ln(sin x) en 0 : à gauche sin x < 0 hors domaine → limite à droite −∞
	it('ln(sin x) en 0 (both) → −∞', () => {
		expect(limitOf('\\ln(\\sin x)', '0', 'both')).toMatch(/ -inf$/);
	});

	it.each([
		['\\ln(\\ln x)', '1', 'both'],
		['\\ln(\\sin x)', '0', 'right'],
		['\\log(\\sin x)', '0', 'right']
	] as const)('%s en %s (%s) → jamais « ln(0) »', (input, at, dir) => {
		const result = limitOf(input, at, dir);
		expect(result).not.toMatch(/ln|log/);
		expect(result.startsWith('exact') && !result.endsWith('inf'), result).toBe(false);
	});
});

describe('pôles de cot, sec, csc à un côté', () => {
	// cot(±1e-6) = ±1e6 ; csc(1e-6) = 1e6 ; cot(π − 1e-6) = −1e6 ; sec(π/2 − 1e-6) = 1e6
	it.each([
		['\\cot x', '0', 'right', '+inf'],
		['\\cot x', '0', 'left', '-inf'],
		['\\csc x', '0', 'right', '+inf'],
		['\\csc x', '0', 'left', '-inf'],
		['\\cot x', '\\pi', 'left', '-inf'],
		['\\sec x', '\\frac{\\pi}{2}', 'left', '+inf'],
		['\\sec x', '\\frac{\\pi}{2}', 'right', '-inf']
	] as const)('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limitOf(input, at, dir)).toMatch(new RegExp(` \\${expected}$`));
	});

	it.each([
		['\\cot x', '0'],
		['\\csc x', '0'],
		['\\sec x', '\\frac{\\pi}{2}']
	] as const)('%s en %s (both) → n’existe pas', (input, at) => {
		expect(limitOf(input, at, 'both')).toBe('does-not-exist null');
	});
});

describe('racine cubique d’un négatif : jamais « n’existe pas » (revue de #906)', () => {
	// ∛ est définie sur ℝ ; l'évaluateur numérique refuse pourtant √ d'un
	// négatif quel que soit l'indice — ça ne prouve rien sur le domaine
	it.each([
		['\\sqrt[3]{x}', '0', 'left'],
		['\\sqrt[3]{x-1}', '1', 'left'],
		['\\sqrt[3]{x}', '-1', 'both'],
		['\\frac{1}{\\sqrt[3]{x}}', '0', 'left']
	] as const)('%s en %s (%s) ne répond pas « n’existe pas »', (input, at, dir) => {
		expect(limitOf(input, at, dir)).not.toMatch(/^does-not-exist/);
	});

	it('√x reste non définie à gauche de 0', () => {
		expect(limitOf('\\sqrt{x}', '0', 'left')).toMatch(/^does-not-exist/);
	});
});

describe('oscillation sans borne en +∞ : aucune valeur (oracle osc-08)', () => {
	// eˣ·sin x, x²·cos x : |f| grandit, le signe alterne à chaque demi-période.
	// En x = 50 : e⁵⁰·sin 50 ≈ −1,4e21 ; en x = 51,5 : ≈ +5,9e21 → ni +∞ ni −∞.
	// Ni un facteur constant (3·), ni une constante ajoutée (2 −) n'y changent rien.
	it.each([
		'e^x\\sin x',
		'3e^x\\sin x',
		'3(e^x\\sin x)',
		'2-3e^x\\sin x',
		'x^2\\cos x',
		'-e^x\\cos(2x)'
	])('%s en +∞ → aucune valeur', (input) => {
		const result = limitOf(input, '+inf');
		expect(hasNoValue(result), `${input} : ${result}`).toBe(true);
	});

	it('le débordement de eˣ ne donne pas de signe : (eˣ sin x) n’est classé ni +∞ ni −∞', () => {
		const sign = classifyWithSign(parseLatex('(e^x\\sin x)'), 'x', positiveInfinity(), 'both');
		expect(sign.type).toBe('unknown');
	});

	// Non-régressions : borné de signe strict, borné × 0, ∞ + borné
	it.each([
		['e^x(2+\\sin x)', 'infinite +inf'],
		['e^{-x}\\sin x', 'exact 0'],
		['x+\\sin x', 'infinite +inf'],
		['e^x', 'infinite +inf'],
		['-e^{2x}', 'infinite -inf']
	])('%s en +∞ → %s', (input, expected) => {
		expect(limitOf(input, '+inf')).toBe(expected);
	});
});
