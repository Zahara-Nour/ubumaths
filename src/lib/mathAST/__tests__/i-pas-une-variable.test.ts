/**
 * Calculer « par rapport à i » est refusé (décision de David, 2026-10-11) :
 * `i` est l'unité imaginaire, jamais une variable — même mécanisme que `e`
 * (`e-pas-une-variable.test.ts`). Chaque module refuse par son mécanisme
 * habituel, avec le message « i est l’unité imaginaire, pas une variable ».
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
import { generatePedagogicalIntegrationSteps } from '../pedagogical-integration/pipeline';
import { isRelation } from '../guards';
import type { RelationNode } from '../types';

const MESSAGE = /i est l’unité imaginaire, pas une variable/;

function relation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error('relation attendue');
	return node;
}

describe('calcul par rapport à i : refus explicite', () => {
	it('integrate : non supporté, avec le message', () => {
		const result = integrate(parseLatex('3i^{2}'), { variable: 'i' });
		expect(result.status).toBe('unsupported');
		expect(result.antiderivative).toBeNull();
		expect(result.error).toMatch(MESSAGE);
	});

	it('integrateDefinite : non supporté, sans repli numérique', () => {
		const result = integrateDefinite(parseLatex('3i^{2}'), number('0'), number('1'), {
			variable: 'i'
		});
		expect(result.status).toBe('unsupported');
		expect(result.value).toBeNull();
		expect(result.error).toMatch(MESSAGE);
	});

	it('differentiate : DifferentiationError', () => {
		expect(() => differentiate(parseLatex('3i^{2}'), { variable: 'i' })).toThrow(
			DifferentiationError
		);
		expect(() => differentiate(parseLatex('3i^{2}'), { variable: 'i' })).toThrow(MESSAGE);
	});

	it('solve : SolveError', () => {
		expect(() => solve(relation('2i=x'), { variable: 'i' })).toThrow(SolveError);
		expect(() => solve(relation('2i=x'), { variable: 'i' })).toThrow(MESSAGE);
	});

	it('solveInequality : SolveInequalityError', () => {
		expect(() => solveInequality(relation('2i>x'), { variable: 'i' })).toThrow(
			SolveInequalityError
		);
		expect(() => solveInequality(relation('2i>x'), { variable: 'i' })).toThrow(MESSAGE);
	});

	it('evaluateLimit : LimitError INVALID_VARIABLE', () => {
		expect(() => evaluateLimit(parseLatex('3i^{2}'), 'i', number('0'))).toThrow(LimitError);
		expect(() => evaluateLimit(parseLatex('3i^{2}'), 'i', number('0'))).toThrow(MESSAGE);
	});

	it('taylorExpand : TaylorError', () => {
		expect(() => taylorExpand(parseLatex('3i^{2}'), { variable: 'i' })).toThrow(TaylorError);
		expect(() => taylorExpand(parseLatex('3i^{2}'), { variable: 'i' })).toThrow(MESSAGE);
	});

	it('computeVariations : VariationError', () => {
		expect(() => computeVariations(parseLatex('3i^{2}'), { variable: 'i' })).toThrow(
			VariationError
		);
		expect(() => computeVariations(parseLatex('3i^{2}'), { variable: 'i' })).toThrow(MESSAGE);
	});

	it.each([
		'.diff 3i^2 ; i',
		'.int 3i^2 ; i',
		'.solve 2i=x ; i',
		'.diff 3i^2 pour i',
		'.int 3i^2 pour i'
	])('CLI %s : le refus dit pourquoi', (command) => {
		const result = new WebReplEngine().execute(command);
		expect(result.success).toBe(false);
		expect(result.error?.message).toMatch(MESSAGE);
	});

	it('par rapport à x, rien ne change : ∫ 3i x dx existe', () => {
		expect(integrate(parseLatex('3i x'), { variable: 'x' }).status).toBe('exact');
	});

	it('le refus de e est inchangé', () => {
		expect(() => differentiate(parseLatex('3e^{2}'), { variable: 'e' })).toThrow(
			/e est la constante d’Euler, pas une variable/
		);
	});
});

/**
 * Même logique que `e_1` : `getVariables` nomme une variable indicée par sa base,
 * donc `i_1` donne la variable détectée `i`. Le refus ne vise que `i` DEMANDÉ
 * quand l'arbre ne contient aucune variable `i` (seule une base indicée en produit).
 */
describe('i indicé (i_1) : pas de refus', () => {
	it('solve(i_1 + 2 = 5) sans inconnue imposée : pas d’exception', () => {
		expect(() => solve(relation('i_1+2=5'))).not.toThrow();
	});

	it('integrate(i_1) : pas de refus « unité imaginaire »', () => {
		const result = integrate(parseLatex('i_1'));
		expect(result.error ?? '').not.toMatch(MESSAGE);
	});

	it('pedagogical-integration(i_1) : pas d’exception « unité imaginaire »', () => {
		let message = '';
		try {
			generatePedagogicalIntegrationSteps(parseLatex('i_1'), { level: 'lycee' });
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).not.toMatch(MESSAGE);
	});
});
