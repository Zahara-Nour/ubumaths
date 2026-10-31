/**
 * L28 (docs/wip/ecarts-a-trier.md) : pour lever |f| d'un côté, la limite
 * évalue f en a ± 10⁻⁸. Ce point d'essai était écrit à la main en nœud
 * `number` (`String(value)`), donc en littéral négatif (`"-1e-8"`) à gauche
 * de 0 — interdit par la fabrique (invariant 1 du README mathAST). Il passe
 * désormais par `numericNode` : `opposite(number("1e-8"))`.
 *
 * On intercepte les substitutions faites par le moteur et on vérifie la forme
 * de chaque nœud substitué ; la valeur rendue reste assertée à côté.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MathNode } from '../../types';

const substitutedValues: MathNode[] = [];

vi.mock('../../eval/substitute', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../eval/substitute')>();
	return {
		...actual,
		substitute: (...args: Parameters<typeof actual.substitute>) => {
			for (const value of Object.values(args[1])) {
				if (value && typeof value === 'object' && 'type' in value) {
					substitutedValues.push(value as MathNode);
				}
			}
			return actual.substitute(...args);
		}
	};
});

const { evaluateLimit } = await import('../evaluate');
const { parseLatex } = await import('../../parser');
const { toLatex } = await import('../../latex-generator');

/** Les littéraux `number` signés, partout dans l'arbre. */
function signedNumberLiterals(node: MathNode): string[] {
	const found: string[] = [];
	const visit = (n: unknown): void => {
		if (!n || typeof n !== 'object') return;
		if (Array.isArray(n)) {
			n.forEach(visit);
			return;
		}
		const record = n as Record<string, unknown>;
		if (
			record.type === 'number' &&
			typeof record.value === 'string' &&
			/^[-+]/.test(record.value)
		) {
			found.push(record.value);
		}
		for (const key of Object.keys(record)) {
			if (key !== 'metadata') visit(record[key]);
		}
	};
	visit(node);
	return found;
}

describe('valeur absolue d’un côté : le point d’essai a ± 10⁻⁸ est un nœud de la fabrique', () => {
	beforeEach(() => {
		substitutedValues.length = 0;
	});

	it.each([
		['\\frac{3|x|}{2x}', '0', 'left', '-\\dfrac{3}{2}'],
		['\\frac{3|x|}{2x}', '0', 'right', '\\dfrac{3}{2}'],
		['\\frac{5|x-1|}{2x-2}', '1', 'left', '-\\dfrac{5}{2}']
	] as const)('%s en %s (%s) → %s', (input, at, dir, expected) => {
		const result = evaluateLimit(parseLatex(input), 'x', parseLatex(at), dir);
		expect(result.value && toLatex(result.value)).toBe(expected);
		expect(substitutedValues.length).toBeGreaterThan(0);
		expect(substitutedValues.flatMap(signedNumberLiterals)).toEqual([]);
	});
});
