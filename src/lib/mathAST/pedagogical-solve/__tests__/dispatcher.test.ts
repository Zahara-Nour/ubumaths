/**
 * Tests for `generateEquationSteps` (the polymorphic dispatcher).
 *
 * Validates that :
 * - Linear equations are routed to `generateLinearEquationSteps`.
 * - Quadratic equations are routed to `generateQuadraticEquationSteps`.
 * - `primaire` is bumped to `college` for linear.
 * - `primaire | college` is bumped to `lycee` for quadratic.
 * - Cubic / non-polynomial equations throw `UnsupportedEquationDegree`.
 * - The barrel re-exports the expected public surface.
 *
 * @see docs/wip/quadratic-stepper-progress.md
 */

import { describe, it, expect } from 'vitest';
import {
	generateEquationSteps,
	generateLinearEquationSteps,
	generateQuadraticEquationSteps,
	LinearEquationRenderer,
	QuadraticEquationRenderer,
	PedagogicalQuadraticNotImplemented,
	UnsupportedEquationDegree,
	STRATEGIES,
	STRATEGIES_QUADRATIC
} from '../index';
import type { EquationStep } from '../index';
import { add, implicitMultiply, number, power, relation, variable as varNode } from '../../factory';
import type { RelationNode } from '../../types';

const x = varNode('x');

function eqLinear(): RelationNode {
	return relation('=', add(implicitMultiply(number('2'), x), number('3')), number('7'));
}

function eqQuadratic(): RelationNode {
	return relation(
		'=',
		add(add(power(x, number('2')), implicitMultiply(number('5'), x)), number('6')),
		number('0')
	);
}

function eqCubic(): RelationNode {
	return relation('=', power(x, number('3')), number('8'));
}

function findOpKinds(steps: readonly EquationStep[]): string[] {
	return steps.map((s) => s.operation?.kind).filter((k): k is string => Boolean(k));
}

// =============================================================================

describe('generateEquationSteps (dispatcher)', () => {
	describe('routing', () => {
		it('linéaire : 2x + 3 = 7 → routé vers generateLinearEquationSteps', () => {
			const steps = generateEquationSteps(eqLinear(), { level: 'college' });
			const kinds = findOpKinds(steps);
			// Sentinel : `read-solution` (singular) is linear ; quadratic uses
			// `read-solutions` (plural).
			expect(kinds).toContain('read-solution');
			expect(kinds).not.toContain('read-solutions');
		});

		it('quadratique : x² + 5x + 6 = 0 → routé vers generateQuadraticEquationSteps', () => {
			const steps = generateEquationSteps(eqQuadratic(), { level: 'lycee' });
			const kinds = findOpKinds(steps);
			expect(kinds).toContain('read-solutions');
			expect(kinds).toContain('compute-discriminant');
		});

		it('cubique : x³ = 8 → throw UnsupportedEquationDegree', () => {
			expect(() => generateEquationSteps(eqCubic(), { level: 'lycee' })).toThrow(
				UnsupportedEquationDegree
			);
		});

		it('UnsupportedEquationDegree.degree contient le degré', () => {
			try {
				generateEquationSteps(eqCubic(), { level: 'lycee' });
				expect.fail('should have thrown');
			} catch (err) {
				expect(err).toBeInstanceOf(UnsupportedEquationDegree);
				expect((err as UnsupportedEquationDegree).degree).toBe(3);
			}
		});

		it('équation déjà résolue `x = 5` (degré 0 après standardisation) routée vers linear', () => {
			const eq = relation('=', x, number('5'));
			expect(() => generateEquationSteps(eq, { level: 'lycee' })).not.toThrow();
		});

		it('tautologie `0 = 0` (sans variable) → throw (pas d’inconnue à résoudre)', () => {
			const eq = relation('=', number('0'), number('0'));
			expect(() => generateEquationSteps(eq, { level: 'lycee' })).toThrow(/cannot detect/);
		});
	});

	describe('level bump', () => {
		it('primaire bumpé en college pour linéaire', () => {
			const stepsBumped = generateEquationSteps(eqLinear(), { level: 'primaire' });
			const stepsCollege = generateEquationSteps(eqLinear(), { level: 'college' });
			expect(findOpKinds(stepsBumped)).toEqual(findOpKinds(stepsCollege));
		});

		it('primaire bumpé en lycee pour quadratique', () => {
			const stepsBumped = generateEquationSteps(eqQuadratic(), { level: 'primaire' });
			const stepsLycee = generateEquationSteps(eqQuadratic(), { level: 'lycee' });
			expect(findOpKinds(stepsBumped)).toEqual(findOpKinds(stepsLycee));
		});

		it('college bumpé en lycee pour quadratique', () => {
			const stepsBumped = generateEquationSteps(eqQuadratic(), { level: 'college' });
			const stepsLycee = generateEquationSteps(eqQuadratic(), { level: 'lycee' });
			expect(findOpKinds(stepsBumped)).toEqual(findOpKinds(stepsLycee));
		});

		it('lycee passe-tel-quel pour quadratique', () => {
			const stepsLycee = generateEquationSteps(eqQuadratic(), { level: 'lycee' });
			expect(findOpKinds(stepsLycee)).toContain('discriminant-positive');
		});

		it('superieur passe-tel-quel pour quadratique', () => {
			const stepsSuperieur = generateEquationSteps(eqQuadratic(), { level: 'superieur' });
			expect(findOpKinds(stepsSuperieur)).not.toContain('identify-equation');
		});
	});

	describe('options', () => {
		it('respecte options.variable: t', () => {
			const t = varNode('t');
			const eq = relation('=', add(implicitMultiply(number('2'), t), number('3')), number('7'));
			const steps = generateEquationSteps(eq, { level: 'college', variable: 't' });
			expect(steps.length).toBeGreaterThan(0);
		});

		it('détecte automatiquement la variable quand omise', () => {
			const steps = generateEquationSteps(eqQuadratic(), { level: 'lycee' });
			expect(steps.length).toBeGreaterThan(0);
		});

		it('throw si plusieurs variables non disambiguïsées', () => {
			const y = varNode('y');
			const eq = relation('=', add(implicitMultiply(number('2'), x), y), number('3'));
			expect(() => generateEquationSteps(eq, { level: 'college' })).toThrow();
		});
	});

	describe('PedagogicalQuadraticNotImplemented propagation', () => {
		it('le throw du pipeline quadratique est propagé tel quel', () => {
			const m = varNode('m');
			const eqParam = relation(
				'=',
				add(
					add(implicitMultiply(m, power(x, number('2'))), implicitMultiply(number('2'), x)),
					number('1')
				),
				number('0')
			);
			expect(() => generateEquationSteps(eqParam, { level: 'lycee', variable: 'x' })).toThrow(
				PedagogicalQuadraticNotImplemented
			);
		});
	});
});

describe('barrel re-exports', () => {
	it('expose les fonctions individuelles (rétrocompat consumers)', () => {
		expect(typeof generateLinearEquationSteps).toBe('function');
		expect(typeof generateQuadraticEquationSteps).toBe('function');
	});

	it('expose les renderers', () => {
		expect(typeof LinearEquationRenderer).toBe('function');
		expect(typeof QuadraticEquationRenderer).toBe('function');
	});

	it('expose les classes d’erreur', () => {
		expect(typeof PedagogicalQuadraticNotImplemented).toBe('function');
		expect(typeof UnsupportedEquationDegree).toBe('function');
	});

	it('expose les tables STRATEGIES', () => {
		expect(STRATEGIES.lycee).toBeDefined();
		expect(STRATEGIES_QUADRATIC.lycee).toBeDefined();
	});
});
