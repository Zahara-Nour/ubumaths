/**
 * V13 : une inconnue indicée (`x_1`, `u_n`) est UNE inconnue. Le parseur la
 * lit comme un indice de base `x` : `solve` répondait « Type d'equation non
 * supporte » pour `x_1 + 1 = 3`, quand la console (qui aplatit les indices,
 * `indexVariables`) répondait 2.
 */
import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { findNodes } from '../../transforms';
import type { MathNode, RelationNode } from '../../types';

function relationOf(latex: string): RelationNode {
	return parseLatex(latex) as RelationNode;
}

function values(latex: string, variable?: string): string[] {
	return solve(relationOf(latex), variable === undefined ? {} : { variable }).solutions.map((s) =>
		toLatex(s.value)
	);
}

/** Aucune variable aplatie (`x_1` en un seul nom) ne sort du solveur. */
function hasFlattenedName(node: MathNode): boolean {
	return findNodes(node, (n) => n.type === 'variable' && n.name.includes('_')).length > 0;
}

describe('Inconnues indicées (V13)', () => {
	it.each([
		['x_1+1=3', '2'],
		['3x_1+1=7', '2'],
		['5x_{12}-2=8', '2'],
		['u_n+2=5', '3'],
		['3u_{n+1}=9', '3']
	])('%s : la solution est %s', (latex, expected) => {
		const result = solve(relationOf(latex));
		expect(result.status).toBe('unique');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual([expected]);
	});

	it('e_1 est une inconnue, pas la constante d’Euler', () => {
		expect(values('e_1+1=3')).toEqual(['2']);
	});

	it('inconnue nommée explicitement : x_1', () => {
		const result = solve(relationOf('2x_1+1=7'), { variable: 'x_1' });
		expect(result.variable).toBe('x_1');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual(['3']);
	});

	it('inconnue x à côté d’un x_1 : la solution cite x_1 tel qu’écrit', () => {
		const result = solve(relationOf('2x+x_1=5'), { variable: 'x' });
		expect(result.solutions).toHaveLength(1);
		const solution = result.solutions[0].value;
		expect(hasFlattenedName(solution)).toBe(false);
		expect(findNodes(solution, (n) => n.type === 'subscript')).toHaveLength(1);
	});

	it('second degré : x_1^2 = 4', () => {
		expect(values('x_1^2=4').sort()).toEqual(['-2', '2']);
	});

	it('les étapes réécrivent l’indice tel qu’écrit', () => {
		const result = solve(relationOf('3x_1+1=7'), { verbosity: 'detailed' });
		expect(result.steps.length).toBeGreaterThan(0);
		for (const step of result.steps) {
			expect(hasFlattenedName(step.before)).toBe(false);
			expect(hasFlattenedName(step.after)).toBe(false);
		}
	});
});
