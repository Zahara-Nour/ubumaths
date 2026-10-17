/**
 * Écart V43 (2026-10-13) : une identité résolue « dans » un intervalle rendait
 * TOUT l'intervalle, valeurs interdites comprises. `\frac{|x|-2}{|x|-2}=1 dans
 * [-5;5]` annonçait S = [-5 ; 5] alors que −2 et 2 n'annulent pas seulement le
 * dénominateur : l'expression n'y est pas définie. Sans `dans`, la console
 * était juste (S = ℝ \ {−2 ; 2}) : le domaine de `solve` est exact, c'est la
 * branche « identité » de `.résoudre … dans` qui ne le lisait pas.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';
import { parseLatex } from '../../../parser';
import { solve } from '../../../solve/solve';
import { formatInterval } from '../../../domain/format';
import type { RelationNode } from '../../../types';

function run(command: string): { success: boolean; output: string; latex: string } {
	const result = new WebReplEngine().execute(command);
	return {
		success: result.success,
		output: result.output,
		latex: (result.latex ?? '').replace(/\s/g, '')
	};
}

describe('identité dans un intervalle : les valeurs interdites sont exclues', () => {
	it('\\frac{|x|-2}{|x|-2}=1 dans [-5;5] : −2 et 2 exclus', () => {
		const r = run('.solve \\frac{|x|-2}{|x|-2}=1 dans [-5;5]');
		expect(r.success).toBe(true);
		expect(r.output).toBe('S = [-5 ; 5] \\ {-2 ; 2}');
		expect(r.latex).toBe('S=[-5;5]\\setminus\\left\\{-2\\,;\\,2\\right\\}');
	});

	it('\\frac{2|x-1|-4}{2|x-1|-4}=1 dans [0;5] : 3 exclu (−1 hors de l’intervalle)', () => {
		const r = run('.solve \\frac{2|x-1|-4}{2|x-1|-4}=1 dans [0;5]');
		expect(r.output).toBe('S = [0 ; 5] \\ {3}');
	});

	it('\\frac{3x}{3x}=1 dans [-1;1] : 0 exclu (sans valeur absolue, même branche)', () => {
		const r = run('.solve \\frac{3x}{3x}=1 dans [-1;1]');
		expect(r.output).toBe('S = [-1 ; 1] \\ {0}');
	});

	it('\\frac{x-2}{x-2}=1 dans [3;5] : la valeur interdite est hors de l’intervalle', () => {
		const r = run('.solve \\frac{x-2}{x-2}=1 dans [3;5]');
		expect(r.output).toBe('Tous les nombres de [3 ; 5]');
		expect(r.latex).toBe('S=\\left[3;5\\right]');
	});

	it('\\frac{2x}{2x}=1 dans [0;1] : la valeur interdite sur une borne l’ouvre', () => {
		expect(run('.solve \\frac{2x}{2x}=1 dans [0;1]').output).toBe('S = ]0 ; 1]');
	});

	it('\\frac{3\\sin x}{3\\sin x}=1 dans [-1;3] : exclusion périodique, refus honnête', () => {
		// 0 est interdit ; le domaine ℝ \\ {kπ} ne se restreint pas encore à l'intervalle
		const r = run('.solve \\frac{3\\sin x}{3\\sin x}=1 dans [-1;3]');
		expect(r.success).toBe(false);
		expect(r.output).not.toContain('Tous les nombres');
	});

	it('\\ln(x)-\\ln(x)=0 dans [-2;3] : seulement ]0 ; 3]', () => {
		const r = run('.solve \\ln(x)-\\ln(x)=0 dans [-2;3]');
		expect(r.output).toBe('S = ]0 ; 3]');
	});
});

describe('sans « dans » : le domaine de solve était déjà exact (verrou)', () => {
	it.each([
		['\\frac{|x|-2}{|x|-2}=1', 'ℝ \\ {-2 ; 2}'],
		['\\frac{3|x|-6}{3|x|-6}=1', 'ℝ \\ {-2 ; 2}'],
		['\\frac{2|x-1|-4}{2|x-1|-4}=1', 'ℝ \\ {-1 ; 3}']
	])('%s : infinité de solutions sur %s', (equation, domain) => {
		const result = solve(parseLatex(equation) as RelationNode, { variable: 'x' });
		expect(result.status).toBe('infinite');
		expect(result.domain && formatInterval(result.domain)).toBe(domain);
	});

	it('\\frac{x^2-4}{|x|-2}=0 : pas de solution (±2 interdites)', () => {
		const result = solve(parseLatex('\\frac{x^2-4}{|x|-2}=0') as RelationNode, { variable: 'x' });
		expect(result.status).toBe('no-solution');
	});
});

describe('domaine non déterminé : refus honnête, jamais « tout l’intervalle » ni « S = ℝ »', () => {
	const unsolved = 'Je ne sais pas encore résoudre cette équation.';
	it.each([
		// x⁵ − x + 1 s'annule vers −1,167 ; x = cos x vers 0,739 ; eˣ = x + 2 vers −1,84 et 1,15
		'\\frac{x^5-x+1}{x^5-x+1}=1 dans [-2;2]',
		'\\frac{x-\\cos x}{x-\\cos x}=1 dans [-1;1]',
		'\\frac{e^x-x-2}{e^x-x-2}=1 dans [-3;3]',
		'\\sqrt{x^5-x+1}-\\sqrt{x^5-x+1}=0 dans [-2;2]',
		'\\frac{x^5-x+1}{x^5-x+1}=1',
		'\\frac{2x-\\cos x}{2x-\\cos x}=1',
		'\\sqrt{x^5-x+1}-\\sqrt{x^5-x+1}=0',
		'\\frac{2\\tan x}{2\\tan x}=1'
	])('%s', (command) => {
		const result = new WebReplEngine().execute(`.solve ${command}`);
		expect(result.success).toBe(false);
		expect(result.error?.message).toBe(unsolved);
	});

	it('solve expose les contraintes non résolues du domaine', () => {
		const result = solve(parseLatex('\\frac{x^5-x+1}{x^5-x+1}=1') as RelationNode, {
			variable: 'x'
		});
		expect(result.domainUnresolved?.length ?? 0).toBeGreaterThan(0);
	});

	it('domaine exact : pas de contrainte non résolue exposée', () => {
		const result = solve(parseLatex('\\frac{|x|-2}{|x|-2}=1') as RelationNode, { variable: 'x' });
		expect(result.domainUnresolved).toBeUndefined();
	});
});

describe('verrous (justes avant la revue)', () => {
	it('\\frac{x}{x}=1 dans ]0;1] : tout l’intervalle', () => {
		expect(run('.solve \\frac{x}{x}=1 dans ]0;1]').output).toBe('Tous les nombres de ]0 ; 1]');
	});

	it('\\frac{x-2}{x-2}=1 dans [2;2] : pas de solution', () => {
		const r = run('.solve \\frac{x-2}{x-2}=1 dans [2;2]');
		expect(r.output).toBe('Pas de solution dans cet intervalle');
		expect(r.latex).toBe('S=\\emptyset');
	});

	it('\\frac{\\sqrt{x^2-1}}{\\sqrt{x^2-1}}=1 dans [-3;3] : réunion', () => {
		expect(run('.solve \\frac{\\sqrt{x^2-1}}{\\sqrt{x^2-1}}=1 dans [-3;3]').output).toBe(
			'S = [-3 ; -1[ ∪ ]1 ; 3]'
		);
	});

	it.each([
		['x=x', 'S = ℝ'],
		['0=0', 'S = ℝ']
	])('%s sans intervalle : tout réel', (equation) => {
		expect(run(`.solve ${equation}`).output).toContain('toute valeur est solution');
	});

	it('2(x+1)=2x+2 dans [-1;1] : tout l’intervalle', () => {
		expect(run('.solve 2(x+1)=2x+2 dans [-1;1]').output).toBe('Tous les nombres de [-1 ; 1]');
	});
});
