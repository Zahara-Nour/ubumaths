/**
 * Dérivée d'une racine n-ième — l'INDICE compte (2026-10-06)
 *
 * `\sqrt[3]{x}` est un nœud `sqrt` à un argument, l'indice dans `base`. Le
 * moteur et le module pédagogique l'ignoraient : `(∛x)′` sortait `1/(2√x)`.
 *
 * Écriture de classe retenue : (ⁿ√u)′ = u′ / (n · ⁿ√(u^{n−1})),
 * par exemple (∛x)′ = 1/(3∛(x²)) ; et pour un radicande puissance
 * (ⁿ√(v^p))′ = p·v′ / (n · ⁿ√(v^{n−p})), par exemple (⁵√(x²))′ = 2/(5·⁵√(x³)).
 *
 * Chaque cas est vérifié en VALEUR (différence finie centrée) et en FORME,
 * par chaque chemin : moteur, correction péda, étapes, atelier.
 */

import { describe, it, expect } from 'vitest';
import type { MathNode } from '$lib/mathAST/types';
import { parseLatex } from '$lib/mathAST/parser';
import { differentiate } from '$lib/mathAST/differentiation';
import {
	generatePedagogicalDifferentiationSteps,
	withTidyStep,
	type PedagogicalDifferentiationStep
} from '$lib/mathAST/pedagogical-differentiation';
import { toLatex } from '$lib/mathAST/latex-generator';
import { compile } from '$lib/mathAST/eval';
import { checkForm } from '$lib/mathAST/cosmetic-transforms';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '$lib/atelier/calcul';

// =============================================================================
// Types
// =============================================================================

interface Case {
	readonly latex: string;
	/** Saisie atelier (`sqrt[3](x)`). */
	readonly custom: string;
	readonly f: (x: number) => number;
	/** Forme de classe attendue ; `undefined` = valeur seule. */
	readonly expected?: string;
	/**
	 * Forme du moteur BRUT quand elle diffère : `differentiate` ne regroupe pas
	 * un coefficient extérieur (`3·2/(5…)`), c'est la mise au propre qui le fait.
	 */
	readonly engineExpected?: string;
}

// =============================================================================
// Constantes
// =============================================================================

const POINTS = [0.3, 0.7, 1.3, 2.4, 5.1];

const CASES: readonly Case[] = [
	{
		latex: '\\sqrt[3]{x}',
		custom: 'sqrt[3](x)',
		f: Math.cbrt,
		expected: '\\frac{1}{3\\sqrt[3]{x^2}}'
	},
	{
		latex: '\\sqrt[4]{x}',
		custom: 'sqrt[4](x)',
		f: (x) => x ** 0.25,
		expected: '\\frac{1}{4\\sqrt[4]{x^3}}'
	},
	{
		latex: '\\sqrt[3]{2x+1}',
		custom: 'sqrt[3](2x+1)',
		f: (x) => Math.cbrt(2 * x + 1),
		expected: '\\frac{2}{3\\sqrt[3]{(2x+1)^2}}'
	},
	{
		latex: '3\\sqrt[5]{x^2}',
		custom: '3sqrt[5](x^2)',
		f: (x) => 3 * x ** 0.4,
		expected: '\\frac{6}{5\\sqrt[5]{x^3}}',
		engineExpected: '3\\frac{2}{5\\sqrt[5]{x^3}}'
	},
	{
		latex: '\\sqrt[3]{x^2+1}',
		custom: 'sqrt[3](x^2+1)',
		f: (x) => Math.cbrt(x * x + 1),
		expected: '\\frac{2x}{3\\sqrt[3]{(x^2+1)^2}}'
	},
	{
		latex: 'x\\sqrt[3]{x}',
		custom: 'x*sqrt[3](x)',
		f: (x) => x * Math.cbrt(x)
	}
];

// =============================================================================
// Fonctions
// =============================================================================

function numericDerivative(g: (x: number) => number, x: number): number {
	const h = 1e-4 * Math.max(1, Math.abs(x));
	return (g(x - 2 * h) - 8 * g(x - h) + 8 * g(x + h) - g(x + 2 * h)) / (12 * h);
}

/** Vérifie `node ≈ f′` en chaque point ; rend le premier écart, ou `null`. */
function valueGap(node: MathNode, f: (x: number) => number): string | null {
	const fn = compile(node);
	for (const x of POINTS) {
		const expected = numericDerivative(f, x);
		const got = fn({ x });
		if (!(Math.abs(got - expected) <= 1e-6 * Math.max(1, Math.abs(expected)))) {
			return `x=${x} : attendu ${expected}, obtenu ${got} (« ${toLatex(node)} »)`;
		}
	}
	return null;
}

function pedagogical(latex: string) {
	return generatePedagogicalDifferentiationSteps(parseLatex(latex), {
		variable: 'x',
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
}

function allSteps(
	steps: readonly PedagogicalDifferentiationStep[]
): PedagogicalDifferentiationStep[] {
	return steps.flatMap((s) => [s, ...allSteps(s.subSteps ?? [])]);
}

// =============================================================================
// Tests
// =============================================================================

describe('racine n-ième — moteur (differentiate)', () => {
	it.each(CASES)('$latex : valeur', ({ latex, f }) => {
		expect(valueGap(differentiate(parseLatex(latex), { variable: 'x' }), f)).toBeNull();
	});

	it.each(CASES.filter((c) => c.expected !== undefined))(
		'$latex : forme $expected',
		({ latex, expected, engineExpected }) => {
			const rendered = toLatex(differentiate(parseLatex(latex), { variable: 'x' }));
			const valid = checkForm(rendered, engineExpected ?? expected ?? '', {}).valid;
			expect(valid, rendered).toBe(true);
		}
	);

	it('⁴√(x²) = √|x| : indice ET puissance pairs, le signe de x est gardé (x < 0)', () => {
		const derivative = differentiate(parseLatex('\\sqrt[4]{x^2}'), { variable: 'x' });
		const fn = compile(derivative);
		for (const x of [-2.4, -0.7, 0.7, 2.4]) {
			const expected = numericDerivative((t) => Math.sqrt(Math.abs(t)), x);
			expect(fn({ x }), `x=${x} « ${toLatex(derivative)} »`).toBeCloseTo(expected, 6);
		}
	});

	it('√x (indice 2 implicite) reste 1/(2√x)', () => {
		const rendered = toLatex(differentiate(parseLatex('\\sqrt{x}'), { variable: 'x' }));
		expect(checkForm(rendered, '\\frac{1}{2\\sqrt{x}}', {}).valid, rendered).toBe(true);
	});
});

describe('racine n-ième — correction pédagogique (étapes + mise au propre)', () => {
	it.each(CASES)('$latex : valeur de la réponse', ({ latex, f }) => {
		const tidied = withTidyStep([], pedagogical(latex).derivative);
		expect(valueGap(tidied.derivative, f)).toBeNull();
		// Affiché = calculé : le LaTeX montré, relu, a la même valeur
		expect(valueGap(parseLatex(tidied.derivativeLatex), f)).toBeNull();
	});

	it.each(CASES.filter((c) => c.expected !== undefined))(
		'$latex : forme $expected',
		({ latex, expected }) => {
			const tidied = withTidyStep([], pedagogical(latex).derivative);
			const valid = checkForm(tidied.derivativeLatex, expected ?? '', {}).valid;
			expect(valid, tidied.derivativeLatex).toBe(true);
		}
	);

	it.each(CASES)('$latex : chaque étape vérifie after ≈ (before)′', ({ latex }) => {
		for (const step of allSteps(pedagogical(latex).steps)) {
			const before = compile(step.before);
			expect(
				valueGap(step.after, (x) => before({ x })),
				step.rule
			).toBeNull();
		}
	});

	it('∛x : règle dédiée, qui nomme l’indice (pas « dérivée de √x »)', () => {
		const [step] = pedagogical('\\sqrt[3]{x}').steps;
		expect(step.rule).toBe('derivative-of-nth-root');
	});

	it('∛(2x+1) : règle de la racine n-ième composée', () => {
		const [step] = pedagogical('\\sqrt[3]{2x+1}').steps;
		expect(step.rule).toBe('nth-root');
	});
});

describe('racine n-ième — atelier (.dériver sqrt[n](…))', () => {
	it.each(CASES)('$custom : valeur', ({ custom, f }) => {
		const session = { atelier: new Atelier(), engine: new WebReplEngine() };
		const result = runInput(session, `.dériver ${custom}`);
		expect(result.kind).toBe('commande');
		const latex = result.kind === 'commande' ? (result.latex ?? '') : '';
		expect(valueGap(parseLatex(latex), f)).toBeNull();
	});
});
