/**
 * La lettre `e` TAPÉE est la constante d'Euler pour `integrate` (les deux
 * parseurs la lisent `euler` depuis le 2026-10-10).
 *
 * Avant : seuls `\exponentialE` et `\exp` passaient ; `e^x` tapé avec la lettre
 * était refusé (« non supporté »), dans le LaTeX comme dans l'atelier. Les
 * tests construisaient eˣ avec `euler()`, jamais par la saisie de l'élève.
 *
 * VALEUR : F′ = f numériquement (différence finie centrée), e = Math.E.
 * FORME : le rendu reste `e^{…}` (constante d'Euler, `\exponentialE` en LaTeX),
 * jamais `\exp(…)`, et a la forme de l'écriture de classe (`checkForm`).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate, integrateDefinite } from '../integrate';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';
import { checkForm } from '../../cosmetic-transforms';
import { findNodes } from '../../transforms';
import { isVariable } from '../../guards';
import type { MathNode } from '../../types';
import { runInput, type CalcSession } from '$lib/atelier/calcul';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

const POINTS = [-1.3, -0.4, 0.35, 0.9, 1.7];

/** F′(x) = f(x) aux points, avec e = constante d'Euler dans f */
function expectPrimitive(F: MathNode, f: (x: number) => number, variable = 'x'): void {
	const compiled = compile(F);
	for (const x of POINTS) {
		const h = 1e-5;
		const slope = (compiled({ [variable]: x + h }) - compiled({ [variable]: x - h })) / (2 * h);
		expect(slope).toBeCloseTo(f(x), 5);
	}
}

function primitiveOf(latex: string, variable = 'x'): MathNode {
	const result = integrate(parseLatex(latex), { variable });
	expect(result.status).toBe('exact');
	expect(result.antiderivative).not.toBeNull();
	return result.antiderivative as MathNode;
}

/** Le rendu : e^{…} (Euler), sans \exp ni variable e résiduelle */
function expectEulerForm(F: MathNode, classForms: readonly string[]): void {
	const latex = toLatex(F);
	expect(latex).not.toMatch(/\\exp(?![A-Za-z])/);
	expect(latex).not.toContain('euler');
	expect(findNodes(F, (n) => isVariable(n) && n.name === 'e')).toEqual([]);
	expect(classForms.some((form) => checkForm(latex, form, {}).status !== 'bad_form')).toBe(true);
}

describe('integrate : la lettre e tapée est la constante d’Euler', () => {
	const E = Math.E;

	it.each([
		['e^{x}', (x: number) => E ** x, ['e^{x}']],
		['3e^{2x}', (x: number) => 3 * E ** (2 * x), ['\\frac{3}{2}e^{2x}']],
		['e^{-0.5x}', (x: number) => E ** (-0.5 * x), ['-2e^{-0.5x}', '-2e^{-\\frac{1}{2}x}']],
		['e^{1-x}', (x: number) => E ** (1 - x), ['-e^{1-x}']],
		['\\frac{1}{e^x}', (x: number) => E ** -x, ['-e^{-x}']],
		['x e^{x}', (x: number) => x * E ** x, ['xe^{x}-e^{x}', '(x-1)e^{x}']],
		['2xe^{x^2}', (x: number) => 2 * x * E ** (x * x), ['e^{x^2}']],
		['e^{x}+e', (x: number) => E ** x + E, ['e^{x}+ex']]
	] as const)('∫ %s : valeur et forme', (latex, f, forms) => {
		const F = primitiveOf(latex);
		expectPrimitive(F, f);
		expectEulerForm(F, forms);
	});

	it('∫₀¹ eˣ dx = e − 1 (valeur exacte, écrite e − 1)', () => {
		const result = integrateDefinite(parseLatex('e^{x}'), parseLatex('0'), parseLatex('1'), {
			variable: 'x'
		});
		expect(result.status).toBe('exact');
		expect(result.value).not.toBeNull();
		const value = result.value as MathNode;
		expect(compile(value)({})).toBeCloseTo(E - 1, 10);
		expect(checkForm(toLatex(value), 'e-1', {}).status).not.toBe('bad_form');
	});

	it('∫₀¹ x²e^{-x} dx = 2 − 5e^{-1}, écrite avec e (pas \\exp)', () => {
		const result = integrateDefinite(parseLatex('x^2e^{-x}'), parseLatex('0'), parseLatex('1'), {
			variable: 'x'
		});
		const value = result.value as MathNode;
		expect(compile(value)({})).toBeCloseTo(2 - 5 / E, 10);
		expect(toLatex(value)).not.toMatch(/\\exp(?![A-Za-z])/);
	});

	it('variable t : e^{t} reste Euler', () => {
		const F = primitiveOf('e^{t}', 't');
		expectPrimitive(F, (t) => E ** t, 't');
		expectEulerForm(F, ['e^{t}']);
	});

	it('e est une constante : ∫ 3e^2 dx = 3e^2 x', () => {
		const F = primitiveOf('3e^{2}');
		expectPrimitive(F, () => 3 * E * E);
		expect(findNodes(F, (n) => isVariable(n) && n.name === 'e')).toEqual([]);
	});

	it('\\exp tapé reste \\exp (la notation de l’élève est gardée)', () => {
		expect(toLatex(primitiveOf('\\exp(2x)'))).toMatch(/\\exp\\left/);
	});
});

describe('atelier : .intégrer avec la lettre e', () => {
	const session: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };

	function firstLine(input: string): string {
		const outcome = runInput(session, input);
		expect(outcome.kind).toBe('commande');
		return outcome.kind === 'commande' ? outcome.output.split('\n')[0] : '';
	}

	it('.intégrer e^(2x) → e^(2x)/2, écrit avec e', () => {
		const line = firstLine('.intégrer e^(2x)');
		expect(line).not.toContain('Non résolu');
		expect(line).not.toContain('euler');
		expect(line).not.toContain('exp');
		expect(line).toMatch(/^∫ .* dx = .*e\^/);
	});

	it('.intégrer e^t ; t → e^t (Euler, variable t)', () => {
		const line = firstLine('.intégrer e^t ; t');
		expect(line).not.toContain('Non résolu');
		expect(line).not.toContain('euler');
		expect(line).not.toContain('exp');
		expect(line).toMatch(/^∫ .* dt = e\^\{?\(?t\)?\}?(?: \+ C)?$/);
	});
});
