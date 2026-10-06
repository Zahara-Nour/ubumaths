/**
 * Primitives FAUSSES relevées par la revue de #913 (2026-10-06) : tests de
 * VALEUR (F′ = f numériquement, intégrale définie = Simpson), jamais de forme.
 *
 * - fractions rationnelles à facteur linéaire RÉPÉTÉ : un terme de la
 *   décomposition disparaissait (coefficients inférieurs mis à 0) ;
 * - paramètre littéral avec puissance ≥ 2 au dénominateur : statut exact et
 *   F = 0 (coefficients « en attente » rendus tels quels) ;
 * - coefficient écrit en division ou irrationnel, paramètres dans f(ax+b).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate, integrateDefinite } from '../integrate';
import { compile } from '../../eval/compile';

// =============================================================================
// Constantes
// =============================================================================

const POINTS: readonly number[] = [
	-2.7, -1.3, -0.45, 0.35, 0.85, 1.65, 2.45, 3.3, 4.2, 6.1, 7.5, 9.2
];

const PARAMETERS: readonly Readonly<Record<string, number>>[] = [
	{ a: 2.5, b: -1.5, k: 1.7, m: -2.2 },
	{ a: -0.6, b: 3.2, k: -0.9, m: 0.35 },
	{ a: 0.4, b: -2.2, k: -2.5, m: 4 }
];

// =============================================================================
// Outils
// =============================================================================

/** Premier écart F′ ≠ f aux points où f est définie, ou null */
function derivativeMismatch(latex: string, vars: Record<string, number> = {}): string | null {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.status !== 'exact' || result.antiderivative === null) return `statut ${result.status}`;
	const F = compile(result.antiderivative);
	const f = compile(parseLatex(latex));
	let checked = 0;
	for (const x of POINTS) {
		const fx = f({ ...vars, x });
		if (!Number.isFinite(fx) || Math.abs(fx) > 1e6) continue;
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const slope = (F({ ...vars, x: x + h }) - F({ ...vars, x: x - h })) / (2 * h);
		checked++;
		if (!(Math.abs(slope - fx) <= 1e-5 * Math.max(1, Math.abs(fx)))) {
			return `F′(${x}) = ${slope} ≠ f(${x}) = ${fx}`;
		}
	}
	return checked >= 3 ? null : 'moins de 3 points';
}

// =============================================================================
// Tests
// =============================================================================

describe('fractions rationnelles : facteur linéaire répété', () => {
	it.each([
		'\\frac{1}{x(x+1)^2}',
		'\\frac{1}{(x+1)^2(x-1)}',
		'\\frac{2}{x(x-1)^2}',
		'\\frac{1}{(x-2)^2(x+3)}',
		'\\frac{x+5}{(x+1)^3}',
		'\\frac{1}{x^2(x+1)}',
		'\\frac{3x^2+1}{(x-1)^3}'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it('∫₂³ 1/((x+1)²(x−1)) dx = ¼ln(3/2) − 1/24', () => {
		const result = integrateDefinite(
			parseLatex('\\frac{1}{(x+1)^2(x-1)}'),
			parseLatex('2'),
			parseLatex('3'),
			{ variable: 'x' }
		);
		expect(result.status).toBe('exact');
		const value = compile(result.value!)({});
		expect(value).toBeCloseTo(Math.log(1.5) / 4 - 1 / 24, 10);
	});
});

describe('paramètre littéral, puissance ≥ 2 au dénominateur : jamais F = 0', () => {
	it.each(['\\frac{k}{(x+m)^2}', '\\frac{3}{(x+m)^2}', '\\frac{k}{(x+1)^2}', '\\frac{1}{(x-a)^3}'])(
		'%s : F′ = f pour chaque jeu de paramètres',
		(latex) => {
			for (const vars of PARAMETERS) expect(derivativeMismatch(latex, vars)).toBeNull();
		}
	);

	it('une fraction partielle à racine littérale non résolue est refusée, pas rendue nulle', () => {
		const result = integrate(parseLatex('\\frac{1}{(x-a)(x-m)^2}'), { variable: 'x' });
		if (result.status === 'exact') {
			for (const vars of PARAMETERS) {
				expect(derivativeMismatch('\\frac{1}{(x-a)(x-m)^2}', vars)).toBeNull();
			}
		} else {
			expect(result.antiderivative).toBeNull();
		}
	});
});

describe('f(ax+b) : coefficient en division, irrationnel ou littéral', () => {
	it.each([
		'\\sin(\\frac{x}{3})',
		'\\cos(\\frac{2x}{5}-3)',
		'\\exp(-\\frac{x}{2})',
		'\\sqrt[3]{x+1}',
		'\\cos(\\pi x)',
		'\\cos(\\sqrt{2}x+1)'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it.each(['\\ln(\\frac{x}{2})', '\\sqrt{\\frac{x}{2}+1}'])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it.each([
		'\\exponentialE^{kx}',
		'\\sin(ax+b)',
		'\\frac{1}{ax+b}',
		'\\frac{1}{(ax+b)^2}',
		'(ax+b)^3'
	])('%s : F′ = f pour chaque jeu de paramètres', (latex) => {
		for (const vars of PARAMETERS) expect(derivativeMismatch(latex, vars)).toBeNull();
	});

	it('√(ax+b) : F′ = f pour chaque jeu de paramètres', () => {
		// a x + b > 0 aux points retenus ; les autres sont écartés (f non définie)
		for (const vars of PARAMETERS) {
			expect(derivativeMismatch('\\sqrt{ax+b}', vars)).toBeNull();
		}
	});
});
