/**
 * Calculer « par rapport à e » est refusé (décision de David, 2026-10-10) :
 * `e` est la constante d'Euler, jamais une variable. Avant, l'appelant qui
 * imposait `e` recevait un résultat faux (`∫ e² de` = `e³`, `d/de(e²)` = 0).
 * Chaque module refuse par son mécanisme habituel.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { integrate, integrateDefinite } from '../integration/integrate';
import { differentiate } from '../differentiation/differentiate';
import { DifferentiationError } from '../differentiation/types';
import { solve } from '../solve/solve';
import { SolveError } from '../solve/types';
import { solveInequality } from '../solve/inequality';
import { SolveInequalityError } from '../solve/inequality/types';
import { evaluateLimit } from '../limits/evaluate';
import { LimitError } from '../limits/types';
import { taylorExpand } from '../taylor/expand';
import { TaylorError } from '../taylor/types';
import { computeVariations } from '../variations/compute';
import { VariationError } from '../variations/types';
import { number } from '../factory';
import { WebReplEngine } from '../cli/web/web-repl-engine';
import { isRelation } from '../guards';
import type { RelationNode } from '../types';

const MESSAGE = /e est la constante d’Euler, pas une variable/;

function relation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error('relation attendue');
	return node;
}

describe('calcul par rapport à e : refus explicite', () => {
	it('integrate : non supporté, avec le message', () => {
		const result = integrate(parseLatex('3e^{2}'), { variable: 'e' });
		expect(result.status).toBe('unsupported');
		expect(result.antiderivative).toBeNull();
		expect(result.error).toMatch(MESSAGE);
	});

	it('integrateDefinite : non supporté, sans repli numérique', () => {
		const result = integrateDefinite(parseLatex('3e^{2}'), number('0'), number('1'), {
			variable: 'e'
		});
		expect(result.status).toBe('unsupported');
		expect(result.value).toBeNull();
		expect(result.error).toMatch(MESSAGE);
	});

	it('differentiate : DifferentiationError', () => {
		expect(() => differentiate(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(
			DifferentiationError
		);
		expect(() => differentiate(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(MESSAGE);
	});

	it('solve : SolveError', () => {
		expect(() => solve(relation('2e=x'), { variable: 'e' })).toThrow(SolveError);
		expect(() => solve(relation('2e=x'), { variable: 'e' })).toThrow(MESSAGE);
	});

	it('solveInequality : SolveInequalityError', () => {
		expect(() => solveInequality(relation('2e>x'), { variable: 'e' })).toThrow(
			SolveInequalityError
		);
		expect(() => solveInequality(relation('2e>x'), { variable: 'e' })).toThrow(MESSAGE);
	});

	it('evaluateLimit : LimitError INVALID_VARIABLE', () => {
		expect(() => evaluateLimit(parseLatex('3e^{2}'), 'e', number('0'))).toThrow(LimitError);
		expect(() => evaluateLimit(parseLatex('3e^{2}'), 'e', number('0'))).toThrow(MESSAGE);
	});

	it('taylorExpand : TaylorError', () => {
		expect(() => taylorExpand(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(TaylorError);
		expect(() => taylorExpand(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(MESSAGE);
	});

	it('computeVariations : VariationError', () => {
		expect(() => computeVariations(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(
			VariationError
		);
		expect(() => computeVariations(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(MESSAGE);
	});

	it.each(['.diff 3e^2 ; e', '.int 3e^2 ; e', '.solve 2e=x ; e'])(
		'CLI %s : le refus dit pourquoi',
		(command) => {
			const result = new WebReplEngine().execute(command);
			expect(result.success).toBe(false);
			expect(result.error?.message).toMatch(MESSAGE);
		}
	);

	it('par rapport à x, rien ne change : ∫ 3e^2 dx existe', () => {
		expect(integrate(parseLatex('3e^{2}'), { variable: 'x' }).status).toBe('exact');
	});
});
