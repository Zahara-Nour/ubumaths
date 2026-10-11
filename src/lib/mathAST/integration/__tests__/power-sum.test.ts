/**
 * Famille PUISSANCE : l'intégrande est ramenée à une somme de c·xᵖ avant la
 * règle de la puissance (c/xⁿ, √x, x·√x, (x² + 1)/x, a/x…).
 *
 * Arbitre de valeur : l'oracle numérique (F′ = f en plusieurs points, pour
 * chaque jeu de paramètres) ; forme : une écriture de classe.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import type { CalcSession } from '$lib/atelier/calcul';
import { parseLatex } from '$lib/mathAST/parser';
import { integrate } from '$lib/mathAST/integration/integrate';
import { DEFAULT_POINTS, type PrimitiveCase } from './oracle/primitives-corpus';
import { judgePrimitive } from './oracle/primitives-oracle';

const session: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };

/** Points strictement positifs (racines carrées) */
const POSITIVE: readonly number[] = [0.3, 0.8, 1.5, 2.4, 3.7, 5.2];

function primitiveCase(
	input: string,
	expected: readonly string[],
	options: { points?: readonly number[]; literal?: boolean; variable?: string } = {}
): PrimitiveCase {
	return {
		family: 'puissance',
		path: 'latex',
		input,
		f: input,
		variable: options.variable ?? 'x',
		points: options.points ?? DEFAULT_POINTS,
		literal: options.literal ?? false,
		expected
	};
}

const CASES: readonly PrimitiveCase[] = [
	primitiveCase('\\frac{1}{x^2}', ['-\\frac{1}{x}']),
	primitiveCase('\\frac{3}{x^3}', ['-\\frac{3}{2x^2}']),
	primitiveCase('\\frac{1}{3x^2}', ['-\\frac{1}{3x}']),
	primitiveCase('\\frac{2}{x^2}+3x', ['-\\frac{2}{x}+\\frac{3}{2}x^2']),
	primitiveCase('\\frac{x^2+1}{x^2}', ['x-\\frac{1}{x}']),
	primitiveCase('\\frac{x^3-2x+1}{x^2}', ['\\frac{1}{2}x^2-2\\ln|x|-\\frac{1}{x}']),
	primitiveCase('\\sqrt{x}', ['\\frac{2}{3}x\\sqrt{x}'], { points: POSITIVE }),
	primitiveCase('5\\sqrt{x}', ['\\frac{10}{3}x\\sqrt{x}'], { points: POSITIVE }),
	primitiveCase('x\\sqrt{x}', ['\\frac{2}{5}x^2\\sqrt{x}'], { points: POSITIVE }),
	primitiveCase('\\frac{1}{x\\sqrt{x}}', ['-\\frac{2}{\\sqrt{x}}'], { points: POSITIVE }),
	primitiveCase('\\sqrt{x}(x+1)', ['\\frac{2}{5}x^2\\sqrt{x}+\\frac{2}{3}x\\sqrt{x}'], {
		points: POSITIVE
	}),
	primitiveCase('\\frac{a}{x}', ['a\\ln|x|'], { literal: true }),
	primitiveCase('\\frac{k}{x^2}', ['-\\frac{k}{x}'], { literal: true }),
	primitiveCase('a\\sqrt{x}', ['\\frac{2}{3}ax\\sqrt{x}'], { literal: true, points: POSITIVE }),
	primitiveCase('\\sqrt{t}', ['\\frac{2}{3}t\\sqrt{t}'], { variable: 't', points: POSITIVE })
];

describe('primitives de la famille puissance', () => {
	it.each(CASES)('$input : F′ = f et écriture de classe', (c) => {
		const verdict = judgePrimitive(c, session);
		expect(verdict).toMatchObject({ status: 'juste', formOk: true });
	});

	it('x⁻¹ reste ln|x| quand elle vient d’une division', () => {
		const verdict = judgePrimitive(
			primitiveCase('\\frac{x+1}{x^2}', ['\\ln|x|-\\frac{1}{x}']),
			session
		);
		expect(verdict).toMatchObject({ status: 'juste', formOk: true });
	});
});

describe('réécritures refusées : jamais de primitive fausse', () => {
	// √(x²) = |x| ≠ x : la réécriture en x serait fausse pour x < 0
	it.each([
		primitiveCase('\\sqrt{x^2}', []),
		primitiveCase('\\frac{1}{\\sqrt{x^2}}', []),
		primitiveCase('\\sqrt{4x^2}', [])
	])('$input est juste ou refusée', (c) => {
		const verdict = judgePrimitive(c, session);
		expect(['juste', 'refus']).toContain(verdict.status);
	});

	it('√(x²) n’est pas intégrée comme x', () => {
		const result = integrate(parseLatex('\\sqrt{x^2}'), { variable: 'x' });
		expect(result.status).toBe('unsupported');
	});
});
