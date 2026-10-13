/**
 * Écart V47 (2026-10-13) : les inéquations ne lisaient pas le domaine de
 * définition. `solveInequality` étudie le signe de f − g APRÈS mise en forme
 * canonique (`normalize`), qui simplifie `\frac{3x}{3x}` en 1 et `\ln x − \ln x`
 * en 0 : le domaine calculé ensuite était celui de l'expression simplifiée.
 * `\frac{3x}{3x}\geq 1` rendait S = ℝ, 0 compris ; `\frac{2x^2-2}{x+1}\leq 0`
 * rendait ]-∞ ; 1], −1 compris. Même défaut que V43 pour les équations
 * identités (PR #1270).
 */

import { describe, it, expect } from 'vitest';
import { solveInequality, InequalityNotSolvable } from '../index';
import { parseLatex } from '../../../parser';
import { formatInterval } from '../../../domain/format';
import { closedEndpoint, interval, intervalSet } from '../../../domain/factory';
import { number, opposite } from '../../../factory';
import { WebReplEngine } from '../../../cli/web/web-repl-engine';
import { INEQUALITY_UNSOLVED_MESSAGE } from '../../../cli/commands/solve.command';
import type { RelationNode } from '../../../types';

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

function solutionOf(latex: string): string {
	return formatInterval(solveInequality(relationOf(latex), { variable: 'x' }).solution);
}

function consoleOf(command: string): { success: boolean; output: string; error?: string } {
	const result = new WebReplEngine().execute(`.solve ${command}`);
	return { success: result.success, output: result.output, error: result.error?.message };
}

describe('les valeurs interdites sont exclues de l’ensemble solution', () => {
	it.each([
		['\\frac{3x}{3x}\\geq 1', ']-∞ ; 0[ ∪ ]0 ; +∞['],
		['\\frac{3x^2}{2x}\\geq 0', ']0 ; +∞['],
		['\\frac{2x-2}{2x-2}<2', ']-∞ ; 1[ ∪ ]1 ; +∞['],
		['\\frac{2x^2-2}{x+1}\\leq 0', ']-∞ ; -1[ ∪ ]-1 ; 1]'],
		['2\\sqrt{x}\\cdot\\frac{x}{x}\\geq 0', ']0 ; +∞['],
		['2\\ln x-2\\ln x\\geq 0', ']0 ; +∞['],
		['\\frac{3|x|-6}{3|x|-6}\\geq 1', ']-∞ ; -2[ ∪ ]-2 ; 2[ ∪ ]2 ; +∞[']
	])('%s : S = %s', (inequality, expected) => {
		expect(solutionOf(inequality)).toBe(expected);
	});

	it('\\frac{3x}{3x}\\geq 1 : tout le domaine, statut « all-real »', () => {
		const result = solveInequality(relationOf('\\frac{3x}{3x}\\geq 1'), { variable: 'x' });
		expect(result.status).toBe('all-real');
		expect(formatInterval(result.domain)).toBe('ℝ \\ {0}');
		expect(formatInterval(result.solution)).toBe(']-∞ ; 0[ ∪ ]0 ; +∞[');
	});

	it('un domaine imposé est intersecté avec le domaine de définition', () => {
		// [-5 ; 5] imposé : √x n'existe que pour x ≥ 0
		const imposed = intervalSet([
			interval(closedEndpoint(opposite(number('5'))), closedEndpoint(number('5')))
		]);
		const result = solveInequality(relationOf('2\\sqrt{x}<4'), { variable: 'x', domain: imposed });
		expect(formatInterval(result.solution)).toBe('[0 ; 4[');
	});
});

describe('exclusion périodique et domaine imposé : partiel seulement si un pôle y tombe', () => {
	const between = (lo: string, hi: string) =>
		intervalSet([interval(closedEndpoint(parseLatex(lo)), closedEndpoint(parseLatex(hi)))]);
	// -1 écrit opposite(1) par le parseur, jamais number('-1')

	it('\\tan(x)\\geq 0 sur [-1 ; 1] : aucun pôle, S = [0 ; 1], statut complete', () => {
		const result = solveInequality(relationOf('2\\tan(x)\\geq 0'), {
			variable: 'x',
			domain: between('-1', '1')
		});
		expect(result.status).toBe('complete');
		expect(formatInterval(result.solution)).toBe('[0 ; 1]');
	});

	it('\\frac{1}{\\cos x}>0 sur [-1 ; 1] : aucun pôle, tout l’intervalle', () => {
		const result = solveInequality(relationOf('\\frac{3}{\\cos x}>0'), {
			variable: 'x',
			domain: between('-1', '1')
		});
		expect(result.status).toBe('all-real');
	});

	it('\\tan(x)\\geq 0 sur [1 ; 2] : π/2 dans l’intervalle, partiel', () => {
		const result = solveInequality(relationOf('2\\tan(x)\\geq 0'), {
			variable: 'x',
			domain: between('1', '2')
		});
		expect(result.status).toBe('partial');
	});

	it('\\frac{3\\sin x}{3\\sin x}\\geq 1 sur [-1 ; 3] : 0 dans l’intervalle, partiel', () => {
		const result = solveInequality(relationOf('\\frac{3\\sin x}{3\\sin x}\\geq 1'), {
			variable: 'x',
			domain: between('-1', '3')
		});
		expect(result.status).toBe('partial');
	});
});

describe('verrous : justes avant le correctif', () => {
	it.each([
		['\\frac{2(x-1)^2}{x-1}>0', ']1 ; +∞['],
		['\\frac{2}{x}\\geq 0', ']0 ; +∞['],
		['2x+1>3', ']1 ; +∞['],
		['3x^2-12\\leq 0', '[-2 ; 2]']
	])('%s : S = %s', (inequality, expected) => {
		expect(solutionOf(inequality)).toBe(expected);
	});
});

describe('domaine non déterminé exactement : refus honnête', () => {
	it('\\frac{x^5-x+1}{x^5-x+1}\\geq 1 : InequalityNotSolvable (x⁵ − x + 1 ≠ 0 non résolue)', () => {
		expect(() =>
			solveInequality(relationOf('\\frac{x^5-x+1}{x^5-x+1}\\geq 1'), { variable: 'x' })
		).toThrow(InequalityNotSolvable);
	});

	it('\\frac{3\\sin x}{3\\sin x}\\geq 1 : exclusion périodique, résultat partiel (jamais « all-real »)', () => {
		const result = solveInequality(relationOf('\\frac{3\\sin x}{3\\sin x}\\geq 1'), {
			variable: 'x'
		});
		expect(result.status).toBe('partial');
	});
});

describe('console : .résoudre', () => {
	it.each([
		['\\frac{3x}{3x}\\geq 1', 'S = ℝ \\ {0}'],
		['\\frac{3x}{3x}>0 dans [-1;1]', 'S = [-1 ; 0[ ∪ ]0 ; 1]'],
		['\\frac{2x}{2x}\\geq 1 dans [0;1]', 'S = ]0 ; 1]'],
		['\\frac{2x^2-2}{x+1}\\leq 0 dans [-3;3]', 'S = [-3 ; -1[ ∪ ]-1 ; 1]'],
		['2\\ln x-2\\ln x\\geq 0 dans [-2;3]', 'S = ]0 ; 3]']
	])('%s → %s', (command, expected) => {
		const r = consoleOf(command);
		expect(r.success).toBe(true);
		expect(r.output).toBe(expected);
	});

	it.each([
		'\\frac{x^5-x+1}{x^5-x+1}\\geq 1',
		'\\frac{x^5-x+1}{x^5-x+1}\\geq 1 dans [-2;2]',
		'\\frac{3\\sin x}{3\\sin x}\\geq 1',
		'\\frac{3\\sin x}{3\\sin x}\\geq 1 dans [-1;3]'
	])('%s : refus honnête', (command) => {
		const r = consoleOf(command);
		expect(r.success).toBe(false);
		expect(r.error).toBe(INEQUALITY_UNSOLVED_MESSAGE);
	});
});
