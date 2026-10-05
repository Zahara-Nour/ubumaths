/**
 * Atelier — (e^u)' = u'·e^u, sans ln(e).
 *
 * ⚠️ Vu par David le 2026-10-05 : la dérivée de e^x sortait `e^x ln(e)` par
 * les trois chemins de l'atelier — `.diff` (moteur), `.dériver` (étapes
 * pédagogiques) et `g = f'` (dérivée calculée par l'atelier lui-même). La
 * base d'Euler passait par la règle de l'exponentielle généralisée
 * (a^u)' = a^u·ln(a)·u', sans que ln(e) soit jamais simplifié.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { deriveSteps } from '../derive-steps';
import { expressionOf } from '../engine';

describe('.diff (moteur)', () => {
	const diff = (input: string) => new WebReplEngine().execute(`.diff ${input}`).output;

	it('e^x', () => {
		expect(diff('e^x')).toBe('d/dx(e^x) = e^x\nLaTeX: e^x');
	});

	it('x*e^x', () => {
		expect(diff('x*e^x')).toBe('d/dx(x*e^x) = e^x+xe^x\nLaTeX: e^x + x e^x');
	});

	it('2^x garde ln(2)', () => {
		expect(diff('2^x')).toBe('d/dx(2^x) = 2^xln(2)\nLaTeX: 2^x \\ln\\left( 2 \\right)');
	});
});

describe('.dériver (étapes)', () => {
	const answer = (input: string) => deriveSteps(input, 'f')?.answer;

	it.each([
		['e^x', "f'(x) = \\exponentialE^x"],
		['e^(3x)', "f'(x) = 3 \\exponentialE^{3 x}"],
		['2e^(-x)', "f'(x) = -2 \\exponentialE^{-x}"],
		['e^(x^2)', "f'(x) = 2 x \\exponentialE^{x^2}"],
		['x*e^x', "f'(x) = \\exponentialE^x + x \\exponentialE^x"],
		['2^x', "f'(x) = \\ln\\left( 2 \\right) 2^x"]
	])('%s', (input, expected) => {
		expect(answer(input)).toBe(expected);
	});

	it("le titre est celui de l'exponentielle, sans ln(e) nulle part", () => {
		const derived = deriveSteps('e^(3x)', 'f');
		expect(derived?.steps[0].title).toBe("Dérivée de l'exponentielle");
		expect(JSON.stringify(derived)).not.toContain('\\\\ln');
	});
});

describe("g = f' (dérivée calculée par l'atelier)", () => {
	const derivativeOf = (definition: string) => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition }, 'text');
		atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');
		const expression = expressionOf(atelier, 'g');
		return expression.ok ? expression.expression : null;
	};

	it.each([
		// `e` : l'atelier écrit le nombre d'Euler `e`, que le grapheur et le
		// moteur lisent (`\euler` leur était illisible, fix/atelier-euler)
		['e^x', 'e^x'],
		['e^(3x)', '3e^{3x}'],
		['2e^(-x)', '-2e^{-x}'],
		['e^(x^2)', '2xe^{x^2}'],
		['x*e^x', 'e^x+xe^x'],
		['2^x', 'ln(2)*2^x']
	])('%s', (definition, expected) => {
		expect(derivativeOf(definition)?.replace(/\s/g, '')).toBe(expected);
	});
});
