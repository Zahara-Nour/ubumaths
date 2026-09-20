/**
 * Le panel de `simplify()` — colonne « attendu » validée par David
 * (docs/wip/tidy-phase0.md §C, 2026-09-20).
 *
 * `simplify` = tidy → règles → « développer seulement si moins cher » → tidy.
 * Les attendus sont en syntaxe maison, tels que `toCustom` les imprime.
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';

const s = (input: string) => toCustom(simplify(parseCustom(input)).result);
const l = (input: string) => toLatex(simplify(parseLatex(input)).result);

describe('panel — fractions', () => {
	it.each([
		['2/6+1/4', '7/12'],
		['1/2+1/3', '5/6'],
		['3/6', '1/2'],
		['2/4*6/8', '3/8'],
		['(2x)/(4y)', 'x/{2y}']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — radicaux', () => {
	it.each([
		['sqrt(8)', '2sqrt(2)'],
		['sqrt(12)+sqrt(3)', '3sqrt(3)'],
		['sqrt(2)*sqrt(8)', '4'],
		['sqrt(9)', '3'],
		['1/sqrt(2)', 'sqrt(2)/2']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — regroupement', () => {
	it.each([
		['x+x', '2x'],
		['x^2+x^2', '2x^2'],
		['3x+2x-x', '4x'],
		['2x+3-x+1', 'x+4'],
		['x*x', 'x^2'],
		['x*x*x', 'x^3'],
		['2(x+1)^2+3(x+1)^2', '5(x+1)^2'],
		['(x+1)^2*(x+1)', '(x+1)^3'],
		['x^2*cos(x)+cos(x)*x^2', '2x^2cos(x)']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — polynômes : développer seulement si moins cher', () => {
	it.each([
		['(x+1)^2', '(x+1)^2'],
		['(x+1)^2-x^2', '2x+1'],
		['(3x+2)^2-x^2+5x-3', '8x^2+17x+1'],
		['(3x+2)^2+5x-3+2x', '9x^2+19x+1'],
		['(x+1)*(x-1)', 'x^2-1'],
		['2*(x+h)^2-2*x^2', '4hx+2h^2'],
		['x*(x+1)', 'x^2+x']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — produits et coefficients', () => {
	it.each([
		['2*3*x', '6x'],
		['3*(x+1)^2*2', '6(x+1)^2'],
		['2*x*3*y', '6xy'],
		['2*3*x*(x^2+1)^2', '6x(x^2+1)^2'],
		['2*x*sin(x)+x^2*cos(x)', 'x^2cos(x)+2xsin(x)']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});

	it('exp(x)+x*exp(x) : hors périmètre, ni factorisé ni développé', () => {
		const out = s('exp(x)+x*exp(x)');
		expect(areEquivalent(parseCustom(out), parseCustom('exp(x)+x*exp(x)'))).toBe(true);
		expect(out).not.toMatch(/\(x\+1\)|\(1\+x\)/);
	});
});

describe('panel — fractions rationnelles, identités, valeurs remarquables', () => {
	it.each([
		['(x^2-1)/(x+1)', 'x-1'],
		['(x^2+2x+1)/(x+1)', 'x+1'],
		['x/x', '1'],
		['sin(x)^2+cos(x)^2', '1'],
		['1-sin(x)^2', 'cos(x)^2'],
		['exp(x)*exp(2x)', 'exp(3x)'],
		['ln(exp(x))', 'x'],
		['sin(0)', '0']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — signes et neutres', () => {
	it.each([
		['-(-x)', 'x'],
		['x+(-3)', 'x-3'],
		['(-x)/(-y)', 'x/y'],
		['-(x+2)', '-(x+2)'],
		['x+0', 'x'],
		['x*1', 'x'],
		['x*0', '0']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — grandeurs (avant la PR 3 : l’unité survit)', () => {
	it.each([
		['12[km]', '12[km]'],
		['12[km]+3[km]', '15[km]'],
		['2[km]*3[km]', '6[km^2]']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('panel — rendu LaTeX des fractions (ce que l’élève lit dans le grapheur)', () => {
	// Revue du 2026-09-20 : un délimiteur posé par tidy autour d'un numérateur
	// composite donnait `\dfrac{\left( x + 1 \right)}{2}`. Aucun test ne
	// regardait le LaTeX.
	it.each([
		['\\frac{x+1}{2}', '\\dfrac{x + 1}{2}'],
		['\\frac{2}{x+1}', '\\dfrac{2}{x + 1}'],
		['\\frac{ab}{2}', '\\dfrac{a b}{2}'],
		['\\frac{2x}{4y}', '\\dfrac{x}{2 y}'],
		['\\frac{1}{x}+\\frac{1}{y}', '\\dfrac{x + y}{x y}'],
		['\\frac{3}{2}x^2', '\\dfrac{3 x^2}{2}'],
		['2(x+1)', '2 \\left( x + 1 \\right)'],
		['(x+1)^2', '\\left( x + 1 \\right)^2']
	])('%s → %s', (input, expected) => {
		expect(l(input)).toBe(expected);
	});
});

describe('panel — invariants de simplify', () => {
	it.each(['(x+1)^2-x^2', '2*(x+h)^2-2*x^2', '(x^2-1)/(x+1)', '2(x+1)^2+3(x+1)^2', 'x*(x+1)'])(
		'conserve la valeur : %s',
		(input) => {
			const node = parseCustom(input);
			expect(areEquivalent(simplify(node).result, node)).toBe(true);
		}
	);

	it('développer ne gagne jamais à coût égal', () => {
		// (x+1)² coûte 9, x²+2x+1 coûte 21 : la forme factorisée reste.
		expect(s('(x+1)^2')).toBe('(x+1)^2');
		expect(s('(x+1)^3')).toBe('(x+1)^3');
	});
});
