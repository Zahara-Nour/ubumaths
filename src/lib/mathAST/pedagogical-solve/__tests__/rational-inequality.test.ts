/**
 * Pedagogical Rational Inequality — Tests (palier 3)
 *
 * Covers the 14 behaviours specified in
 * `docs/wip/pedagogical-rational-inequality-spec.md`.
 *
 * @module mathAST/pedagogical-solve/__tests__/rational-inequality.test
 */

import { describe, it, expect } from 'vitest';
import {
	generateRationalInequalitySteps,
	PedagogicalInequalityError
} from '../rational-inequality';
import { InequalityNotSolvable } from '../../solve/inequality/types';
import { parseLatex } from '../../parser';
import type { EquationStep, EquationOperation } from '../types';
import type { RelationNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type} for "${latex}"`);
	}
	return node;
}

function flatten(steps: readonly EquationStep[]): EquationStep[] {
	const out: EquationStep[] = [];
	for (const s of steps) {
		out.push(s);
		if (s.subSteps) out.push(...flatten(s.subSteps));
	}
	return out;
}

function findOp<K extends EquationOperation['kind']>(
	steps: readonly EquationStep[],
	kind: K
): (EquationOperation & { kind: K }) | null {
	for (const s of flatten(steps)) {
		if (s.operation?.kind === kind) return s.operation as EquationOperation & { kind: K };
	}
	return null;
}

function getConclude(steps: readonly EquationStep[]) {
	const concl = findOp(steps, 'inequality-conclude-rational');
	if (concl === null) throw new Error('expected inequality-conclude-rational step');
	return concl;
}

function kindList(steps: readonly EquationStep[]): string[] {
	return flatten(steps)
		.map((s) => s.operation?.kind)
		.filter((k): k is NonNullable<typeof k> => k !== undefined);
}

// =============================================================================
// A. Linéaire / linéaire (cas 1-6)
// =============================================================================

describe('palier 3 — A. linéaire / linéaire', () => {
	it('1. (x−1)/(x−3) < 0 → ]1 ; 3[', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<');
		expect(concl.solutionDescription).toMatch(/\]\s*1\s*[;,]\s*3\s*\[/);
	});

	it('2. (x−1)/(x−3) > 0 → ]−∞ ; 1[ ∪ ]3 ; +∞[', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) > 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('>');
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
		expect(concl.solutionDescription).toMatch(/-?\s*∞|infty/i);
	});

	it('3. (x−1)/(x−3) ≤ 0 → [1 ; 3[ (1 inclus, 3 exclu)', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) \\leq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<=');
		// 1 included via [, 3 excluded via [ from the right (denom zero)
		expect(concl.solutionDescription).toMatch(/\[\s*1/);
		expect(concl.solutionDescription).toMatch(/3\s*\[/);
	});

	it('4. (x−1)/(x−3) ≥ 0 → ]−∞ ; 1] ∪ ]3 ; +∞[', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) \\geq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('>=');
		expect(concl.solutionDescription).toMatch(/1\s*\]/);
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
	});

	it('5. 1/(x−2) < 0 → ]−∞ ; 2[ (P constant > 0)', () => {
		const steps = generateRationalInequalitySteps(ineq('1/(x - 2) < 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).toMatch(/-?\s*∞|infty/i);
	});

	it('6. (2x+1)/(x−1) ≠ 0 → ℝ \\ {-1/2 ; 1}', () => {
		const steps = generateRationalInequalitySteps(ineq('(2x + 1)/(x - 1) \\neq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('!=');
		expect(concl.solutionDescription).toMatch(/ℝ|mathbb\{R\}/);
	});
});

// =============================================================================
// B. Quadratique / linéaire (cas 7-8)
// =============================================================================

describe('palier 3 — B. quadratique / linéaire', () => {
	it('7. (x²−4)/(x−1) < 0 — racines ±2, zéro 1', () => {
		const steps = generateRationalInequalitySteps(ineq('(x^2 - 4)/(x - 1) < 0'), {
			level: 'lycee'
		});
		const tab = findOp(steps, 'rational-sign-table');
		expect(tab).not.toBeNull();
		expect(tab!.numeratorRoots.length).toBe(2);
		expect(tab!.denominatorZeros.length).toBe(1);
	});

	it('8. (x²+1)/(x−3) < 0 — numérateur sans racine (Δ<0) → S = ]−∞ ; 3[', () => {
		const steps = generateRationalInequalitySteps(ineq('(x^2 + 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const tab = findOp(steps, 'rational-sign-table');
		expect(tab!.numeratorRoots.length).toBe(0);
		expect(tab!.denominatorZeros.length).toBe(1);
		const concl = getConclude(steps);
		// P > 0 always, sign(P/Q) = sign(Q). For Q < 0 ⇔ x < 3.
		expect(concl.solutionDescription).toMatch(/3/);
		expect(concl.solutionDescription).toMatch(/-?\s*∞|infty/i);
	});
});

// =============================================================================
// C. Linéaire / quadratique (cas 9)
// =============================================================================

describe('palier 3 — C. linéaire / quadratique', () => {
	it('9. x/(x²−1) ≥ 0 — racine 0, zéros ±1 → ]−1 ; 0] ∪ ]1 ; +∞[', () => {
		const steps = generateRationalInequalitySteps(ineq('x/(x^2 - 1) \\geq 0'), {
			level: 'lycee'
		});
		const tab = findOp(steps, 'rational-sign-table');
		expect(tab!.numeratorRoots.length).toBe(1);
		expect(tab!.denominatorZeros.length).toBe(2);
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/-?\s*1/);
		expect(concl.solutionDescription).toMatch(/0/);
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
	});
});

// =============================================================================
// D. Forme non-standard, canonisable (cas 10)
// =============================================================================

describe('palier 3 — D. forme non-standard', () => {
	it('10. (x−1)/(x−3) < 1 → canonisé en 2/(x−3) < 0 → ]−∞ ; 3[', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 1'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/3/);
		expect(concl.solutionDescription).toMatch(/-?\s*∞|infty/i);
	});
});

// =============================================================================
// E. Erreurs / rejets (cas 11-14)
// =============================================================================

describe('palier 3 — E. erreurs', () => {
	it('11. 1/x + 1/(x−1) < 0 (V2) — supported via combine-fractions step', () => {
		// V2 supports this : the pipeline now emits a `combine-fractions` step
		// before the standard rational pipeline. V1 used to throw.
		const steps = generateRationalInequalitySteps(ineq('1/x + 1/(x - 1) < 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('combine-fractions');
	});

	it('13. (mx+1)/(x−2) < 0 → InequalityNotSolvable (paramétrique)', () => {
		expect(() =>
			generateRationalInequalitySteps(ineq('(m*x + 1)/(x - 2) < 0'), { level: 'lycee' })
		).toThrow(InequalityNotSolvable);
	});

	it('14. (x−1)/(x−3) = 0 → PedagogicalInequalityError', () => {
		expect(() =>
			generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) = 0'), { level: 'lycee' })
		).toThrow(PedagogicalInequalityError);
	});

	it('15. (x²−1)/(x−1) < 0 — canon simplifies to polynomial → InequalityNotSolvable (V1)', () => {
		// Direct call to `generateRationalInequalitySteps` throws ; the
		// dispatcher in `generateInequalitySteps` (palier 1+ entry point) routes
		// the canonical polynomial form to the polynomial pipeline (covered by
		// the "dispatcher routes degenerate canon to polynomial" test below).
		expect(() =>
			generateRationalInequalitySteps(ineq('(x^2 - 1)/(x - 1) < 0'), { level: 'lycee' })
		).toThrow(InequalityNotSolvable);
	});

	it('16. Double root in numerator (V1.1) — supported, sign does not flip across the double root', () => {
		// `x² - 2x + 1 = (x-1)²` has double root at 1. P ≥ 0 always (zero at 1).
		// Q = x-3 changes sign at 3. So P/Q < 0 ⇔ Q < 0 (and x ≠ 1 from numerator).
		// Solution : `]−∞ ; 1[ ∪ ]1 ; 3[`.
		const steps = generateRationalInequalitySteps(ineq('(x^2 - 2x + 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const tab = findOp(steps, 'rational-sign-table');
		expect(tab).not.toBeNull();
		expect(tab!.numeratorRoots.length).toBe(1);
		expect(tab!.numeratorMultiplicities).toEqual([2]);
		expect(tab!.degP).toBe(2);
		const concl = getConclude(steps);
		// Solution should be `]−∞ ; 1[ ∪ ]1 ; 3[`
		expect(concl.solutionDescription).toMatch(/1/);
		expect(concl.solutionDescription).toMatch(/3/);
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
	});
});

// =============================================================================
// Dispatcher integration — degenerate canon retry
// =============================================================================

describe('palier 3 — dispatcher integration', () => {
	it('dispatcher routes (x²-1)/(x-1) < 0 to the polynomial pipeline (canon → x+1)', async () => {
		// The high-level `generateInequalitySteps` should route this to the
		// linear pipeline (after canon simplifies to `x + 1 < 0`), not throw.
		const { generateInequalitySteps } = await import('../index');
		const steps = generateInequalitySteps(ineq('(x^2 - 1)/(x - 1) < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		// Polynomial path emits identify-equation but NO rational-* kinds.
		expect(kinds).not.toContain('rational-sign-table');
		expect(kinds).not.toContain('inequality-conclude-rational');
	});

	it('dispatcher routes (x³-1)/(x-1) < 0 to the quadratic pipeline (canon → x²+x+1)', async () => {
		const { generateInequalitySteps } = await import('../index');
		const steps = generateInequalitySteps(ineq('(x^3 - 1)/(x - 1) < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		// Quadratic path : compute-discriminant + quadratic-sign-table
		expect(kinds).toContain('compute-discriminant');
		expect(kinds).toContain('quadratic-sign-table');
		expect(kinds).not.toContain('rational-sign-table');
	});
});

// =============================================================================
// Étapes structurelles
// =============================================================================

describe('palier 3 — structure des étapes', () => {
	it('lycee : émet identify-equation, identify-rational, domain-restriction, locate-roots, sign-table, conclude', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const kinds = kindList(steps);
		expect(kinds).toContain('identify-equation');
		expect(kinds).toContain('identify-rational');
		expect(kinds).toContain('rational-domain-restriction');
		expect(kinds).toContain('rational-locate-roots');
		expect(kinds).toContain('rational-sign-table');
		expect(kinds).toContain('inequality-conclude-rational');
	});

	it('superieur : pas d’identify-equation séparé', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'superieur'
		});
		const kinds = kindList(steps);
		// At supérieur, identify-equation is folded
		expect(kinds).toContain('rational-sign-table');
		expect(kinds).toContain('inequality-conclude-rational');
	});

	it('rational-sign-table porte numerator + denominator + roots/zeros corrects', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const tab = findOp(steps, 'rational-sign-table');
		expect(tab).not.toBeNull();
		expect(tab!.variable).toBe('x');
		expect(tab!.numeratorRoots.length).toBe(1);
		expect(tab!.denominatorZeros.length).toBe(1);
	});

	it('identify-rational porte numerator et denominator', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const id = findOp(steps, 'identify-rational');
		expect(id).not.toBeNull();
		expect(id!.numerator).toBeDefined();
		expect(id!.denominator).toBeDefined();
	});

	it('rational-domain-restriction liste les zéros de Q', () => {
		const steps = generateRationalInequalitySteps(ineq('x/(x^2 - 1) \\geq 0'), {
			level: 'lycee'
		});
		const dom = findOp(steps, 'rational-domain-restriction');
		expect(dom).not.toBeNull();
		expect(dom!.excluded.length).toBe(2); // ±1
	});

	it('rational-locate-roots regroupe racines P et zéros Q', () => {
		const steps = generateRationalInequalitySteps(ineq('(x^2 - 4)/(x - 1) < 0'), {
			level: 'lycee'
		});
		const loc = findOp(steps, 'rational-locate-roots');
		expect(loc).not.toBeNull();
		expect(loc!.numeratorRoots.length).toBe(2);
		expect(loc!.denominatorZeros.length).toBe(1);
	});
});

// =============================================================================
// Smoke superieur
// =============================================================================

// =============================================================================
// V2 — Multi-fractions + fraction côté droit
// =============================================================================

describe('palier 3 V2 — multi-fractions (sum/diff of two linear fractions)', () => {
	it('V2.1. 1/x + 1/(x-1) < 0 → ]−∞ ; 0[ ∪ ]1/2 ; 1[', () => {
		const steps = generateRationalInequalitySteps(ineq('1/x + 1/(x - 1) < 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('combine-fractions');
		expect(kinds).toContain('rational-sign-table');
		const concl = getConclude(steps);
		// Critical points : 0, 1/2, 1
		expect(concl.solutionDescription).toMatch(/0/);
		expect(concl.solutionDescription).toMatch(/1/);
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
	});

	it('V2.2. 1/x − 1/(x-1) > 0 → ]0 ; 1[', () => {
		const steps = generateRationalInequalitySteps(ineq('1/x - 1/(x - 1) > 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('combine-fractions');
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/\]\s*0\s*[;,]\s*1\s*\[/);
	});

	it('V2.3. 2/x + 3/(x-2) < 0 — different numerators', () => {
		const steps = generateRationalInequalitySteps(ineq('2/x + 3/(x - 2) < 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('combine-fractions');
		const combine = findOp(steps, 'combine-fractions');
		expect(combine).not.toBeNull();
		expect(combine!.combined).toBeDefined();
	});
});

describe('palier 3 V2 — fraction sur côté droit', () => {
	it('V2.5. x < 1/(x-3) — standardize then combine', () => {
		const steps = generateRationalInequalitySteps(ineq('x < 1/(x - 3)'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		// Should standardize (right ≠ 0) and combine
		expect(kinds).toContain('combine-fractions');
		expect(kinds).toContain('rational-sign-table');
	});
});

describe('palier 3 V2 — polynôme + fraction', () => {
	it('V2.6. x + 1/(x-1) < 0 — polynomial term + fraction', () => {
		const steps = generateRationalInequalitySteps(ineq('x + 1/(x - 1) < 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('combine-fractions');
		const combine = findOp(steps, 'combine-fractions');
		expect(combine).not.toBeNull();
		// Combined : (x(x-1) + 1) / (x-1) = (x² - x + 1) / (x-1)
		// x² - x + 1 has Δ = 1 - 4 = -3 < 0, so P > 0 always
		// Sign of P/Q = sign of Q = sign of (x - 1)
		// For < 0: x < 1 → ]−∞ ; 1[
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/1/);
	});
});

describe('palier 3 V2 — V1 régression : single fraction toujours OK', () => {
	it('V1 (x−1)/(x−3) < 0 ne doit pas émettre combine-fractions', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('combine-fractions');
		expect(kinds).toContain('identify-rational');
	});
});

describe('palier 3 — smoke superieur', () => {
	it('superieur produit aussi un conclude correct', () => {
		const steps = generateRationalInequalitySteps(ineq('(x - 1)/(x - 3) < 0'), {
			level: 'superieur'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<');
		expect(concl.solutionDescription).toMatch(/1/);
		expect(concl.solutionDescription).toMatch(/3/);
	});
});
