/**
 * Pedagogical Quadratic Inequality — Tests (palier 2b)
 *
 * Covers the 25 behaviours specified in
 * `docs/wip/pedagogical-quadratic-inequality-spec.md`.
 *
 * @module mathAST/pedagogical-solve/__tests__/quadratic-inequality.test
 */

import { describe, it, expect } from 'vitest';
import {
	generateQuadraticInequalitySteps,
	PedagogicalInequalityError,
	UnsupportedInequalityDegree
} from '../quadratic-inequality';
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

/**
 * Polymorphic conclude getter — handles both palier 2b (`inequality-conclude-quadratic`)
 * and palier 2c (`inequality-conclude-from-isolated-square`) since both carry
 * the same `relation` + `solutionDescription` fields.
 */
function getConclude(steps: readonly EquationStep[]) {
	const standard = findOp(steps, 'inequality-conclude-quadratic');
	if (standard !== null) return standard;
	const isolated = findOp(steps, 'inequality-conclude-from-isolated-square');
	if (isolated !== null) return isolated;
	throw new Error('expected an inequality-conclude-* step');
}

// =============================================================================
// Δ > 0, a > 0 (1-5)
// =============================================================================

describe('Δ > 0, a > 0 (parabole vers le haut, 2 racines)', () => {
	it('1. x² − 5x + 6 < 0 → ]2, 3[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<');
		expect(concl.solutionDescription).toMatch(/\]\s*2\s*[;,]\s*3\s*\[/);
	});

	it('2. x² − 5x + 6 > 0 → ]−∞, 2[ ∪ ]3, +∞[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 > 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.relation).toBe('>');
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).toMatch(/3/);
		expect(concl.solutionDescription).toMatch(/∞|infty/i);
	});

	it('3. x² − 5x + 6 ≤ 0 → [2, 3] (closed)', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 \\leq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<=');
		// Solution should be closed: [2, 3] or {2, 3} or similar with brackets/inclusive
		expect(concl.solutionDescription).toMatch(/\[\s*2/);
		expect(concl.solutionDescription).toMatch(/3\s*\]/);
	});

	it('4. x² − 5x + 6 ≥ 0 → ]−∞, 2] ∪ [3, +∞[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 \\geq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('>=');
		expect(concl.solutionDescription).toMatch(/2\s*\]/);
		expect(concl.solutionDescription).toMatch(/\[\s*3/);
	});

	it('5. x² − 5x + 6 ≠ 0 → R \\ {2, 3}', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 \\neq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('!=');
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).toMatch(/3/);
	});
});

// =============================================================================
// Δ > 0, a < 0 (6-7)
// =============================================================================

describe('Δ > 0, a < 0 (parabole vers le bas, 2 racines)', () => {
	it('6. −x² + 5x − 6 < 0 → ]−∞, 2[ ∪ ]3, +∞[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 5x - 6 < 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<');
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).toMatch(/3/);
		expect(concl.solutionDescription).toMatch(/∞|infty/i);
	});

	it('7. −x² + 5x − 6 > 0 → ]2, 3[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 5x - 6 > 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('>');
		expect(concl.solutionDescription).toMatch(/\]\s*2\s*[;,]\s*3\s*\[/);
	});
});

// =============================================================================
// Δ = 0 (8-14)
// =============================================================================

describe('Δ = 0 (racine double)', () => {
	it('8. x² − 4x + 4 < 0 → ∅', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 < 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/∅|vide|empty|aucune/i);
	});

	it('9. x² − 4x + 4 > 0 → R \\ {2}', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 > 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		// R \ {2} or similar
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).toMatch(/ℝ|R|tout|réel/i);
	});

	it('10. x² − 4x + 4 ≤ 0 → {2}', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 \\leq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		// Solution = single point {2}
		expect(concl.solutionDescription).toMatch(/2/);
		// Should mention only the singleton
		expect(concl.solutionDescription).not.toMatch(/∞|infty/i);
	});

	it('11. x² − 4x + 4 ≥ 0 → R', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 \\geq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/ℝ|R|tout réel|tous les réels/i);
	});

	it('13. −x² + 4x − 4 ≥ 0 → {2}', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 4x - 4 \\geq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).not.toMatch(/∞|infty/i);
	});

	it('14. −x² + 4x − 4 ≤ 0 → R', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 4x - 4 \\leq 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/ℝ|R|tout réel|tous les réels/i);
	});
});

// =============================================================================
// Δ < 0 (15-19)
// =============================================================================

describe('Δ < 0 (pas de racines)', () => {
	it('15. x² + 1 < 0 → ∅', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 < 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/∅|vide|empty|aucune/i);
	});

	it('16. x² + 1 > 0 → R', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 > 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/ℝ|R|tout réel|tous les réels/i);
	});

	it('17. x² + 1 ≥ 0 → R', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 \\geq 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/ℝ|R|tout réel|tous les réels/i);
	});

	it('18. −x² − 1 < 0 → R', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 - 1 < 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/ℝ|R|tout réel|tous les réels/i);
	});

	it('19. −x² − 1 > 0 → ∅', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 - 1 > 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/∅|vide|empty|aucune/i);
	});
});

// =============================================================================
// Cas particuliers (20-22)
// =============================================================================

describe('Cas particuliers', () => {
	it('20. 2x² − 8 < 0 (b=0) → ]−2, 2[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('2x^2 - 8 < 0'), { level: 'lycee' });
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/-?\s*2/);
		expect(concl.solutionDescription).toMatch(/\]\s*-?\s*2/);
	});

	it('21. (x − 1)(x − 3) < 0 → ]1, 3[ (canonicalisée)', () => {
		// After standardize+expand → x² − 4x + 3 < 0
		const steps = generateQuadraticInequalitySteps(ineq('(x - 1)(x - 3) < 0'), {
			level: 'lycee'
		});
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/\]\s*1\s*[;,]\s*3\s*\[/);
	});
});

// =============================================================================
// Étapes structurelles (présence des kinds clés)
// =============================================================================

describe('structure des étapes', () => {
	it('lycee : émet identify-equation, identify-coefficients, compute-discriminant, sign-table, conclude', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('identify-equation');
		expect(kinds).toContain('identify-coefficients');
		expect(kinds).toContain('compute-discriminant');
		expect(kinds).toContain('quadratic-sign-table');
		expect(kinds).toContain('inequality-conclude-quadratic');
	});

	it('lycee : émet discriminant-positive si Δ > 0', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		expect(findOp(steps, 'discriminant-positive')).not.toBeNull();
	});

	it('lycee : émet discriminant-zero si Δ = 0', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 < 0'), { level: 'lycee' });
		expect(findOp(steps, 'discriminant-zero')).not.toBeNull();
	});

	it('lycee : émet discriminant-negative si Δ < 0', () => {
		// Use a non-fast-path expression (b ≠ 0) so we hit the Δ pipeline.
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + x + 1 < 0'), { level: 'lycee' });
		expect(findOp(steps, 'discriminant-negative')).not.toBeNull();
	});

	it('quadratic-sign-table porte a et roots corrects (Δ > 0)', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const tab = findOp(steps, 'quadratic-sign-table');
		expect(tab).not.toBeNull();
		expect(tab!.roots.length).toBe(2);
		expect(tab!.variable).toBe('x');
	});

	it('quadratic-sign-table sans racines si Δ < 0', () => {
		// Use a non-fast-path expression (b ≠ 0) so the sign table is emitted.
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + x + 1 < 0'), { level: 'lycee' });
		const tab = findOp(steps, 'quadratic-sign-table');
		expect(tab).not.toBeNull();
		expect(tab!.roots.length).toBe(0);
	});

	it('superieur : pas de discriminant-{positive,zero,negative} séparé', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), {
			level: 'superieur'
		});
		expect(findOp(steps, 'discriminant-positive')).toBeNull();
		expect(findOp(steps, 'discriminant-zero')).toBeNull();
		expect(findOp(steps, 'discriminant-negative')).toBeNull();
		// But still has compute-discriminant + sign-table + conclude
		expect(findOp(steps, 'compute-discriminant')).not.toBeNull();
		expect(findOp(steps, 'quadratic-sign-table')).not.toBeNull();
		expect(findOp(steps, 'inequality-conclude-quadratic')).not.toBeNull();
	});
});

// =============================================================================
// Erreurs (23-25)
// =============================================================================

describe('erreurs', () => {
	it('23. degré 3 (`x³ − 1 < 0`) → throw UnsupportedInequalityDegree', () => {
		expect(() => generateQuadraticInequalitySteps(ineq('x^3 - 1 < 0'), { level: 'lycee' })).toThrow(
			UnsupportedInequalityDegree
		);
	});

	it('24. coef paramétrique (`m·x² + 1 < 0`, m libre) → throw InequalityNotSolvable', () => {
		expect(() =>
			generateQuadraticInequalitySteps(ineq('m \\cdot x^2 + 1 < 0'), {
				level: 'lycee',
				variable: 'x'
			})
		).toThrow(InequalityNotSolvable);
	});

	it('25. relation = → throw PedagogicalInequalityError', () => {
		expect(() => generateQuadraticInequalitySteps(ineq('x^2 + 1 = 0'), { level: 'lycee' })).toThrow(
			PedagogicalInequalityError
		);
	});
});

// =============================================================================
// Smoke superieur level
// =============================================================================

describe('smoke superieur', () => {
	it('superieur produit aussi un conclude correct', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), {
			level: 'superieur'
		});
		const concl = getConclude(steps);
		expect(concl.relation).toBe('<');
		expect(concl.solutionDescription).toMatch(/2/);
		expect(concl.solutionDescription).toMatch(/3/);
	});
});

// =============================================================================
// Palier 2c — cas spéciaux (b = 0, c = 0, déjà factorisé)
// =============================================================================

function getConcludeIsolatedSquare(steps: readonly EquationStep[]) {
	const op = findOp(steps, 'inequality-conclude-from-isolated-square');
	if (op === null) throw new Error('expected inequality-conclude-from-isolated-square step');
	return op;
}

describe('palier 2c — fast path b = 0 (ax² + c ⊻ 0)', () => {
	it('A1. 2x² − 8 < 0 → ]−2, 2[ via isolate-square fast path', () => {
		const steps = generateQuadraticInequalitySteps(ineq('2x^2 - 8 < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		// Fast path : NO Δ
		expect(kinds).not.toContain('compute-discriminant');
		// Fast path emits these
		expect(kinds).toContain('recognize-no-linear-term');
		expect(kinds).toContain('isolate-square');
		expect(kinds).toContain('inequality-conclude-from-isolated-square');
		// Solution
		const concl = getConcludeIsolatedSquare(steps);
		expect(concl.relation).toBe('<');
		expect(concl.solutionDescription).toMatch(/\]\s*-?\s*2\s*[;,]\s*2\s*\[/);
	});

	it('A2. 2x² − 8 ≥ 0 → ]−∞, −2] ∪ [2, +∞[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('2x^2 - 8 \\geq 0'), { level: 'lycee' });
		const concl = getConcludeIsolatedSquare(steps);
		expect(concl.solutionDescription).toMatch(/-?\s*∞|-\\infty|infty/i);
		expect(concl.solutionDescription).toMatch(/-?\s*2/);
		// Both intervals present
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
	});

	it('A3. x² + 1 < 0 → ∅ (impossible)', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		expect(kinds).toContain('inequality-conclude-from-isolated-square');
		const concl = getConcludeIsolatedSquare(steps);
		expect(concl.solutionDescription).toMatch(/∅|emptyset/i);
	});

	it('A4. x² + 1 ≥ 0 → ℝ (toujours vrai)', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 \\geq 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		const concl = getConcludeIsolatedSquare(steps);
		expect(concl.solutionDescription).toMatch(/ℝ|mathbb\{R\}/i);
	});

	it('A5. −x² + 4 > 0 (a < 0, racines ±2) → ]−2, 2[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 4 > 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		expect(kinds).toContain('inequality-conclude-from-isolated-square');
		const concl = getConcludeIsolatedSquare(steps);
		expect(concl.solutionDescription).toMatch(/\]\s*-?\s*2\s*[;,]\s*2\s*\[/);
	});

	it('A6. Operator flip when a < 0 — isolate-square step shows flipped relation', () => {
		// `-x² + 4 > 0` ⇒ dividing by `-1` flips `>` to `<` ⇒ isolated form is `x² < 4`.
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 4 > 0'), { level: 'lycee' });
		const isolateStep = flatten(steps).find((s) => s.operation?.kind === 'isolate-square');
		expect(isolateStep).toBeDefined();
		// `before` keeps the original operator (`>`), `after` carries the flipped one (`<`).
		expect(isolateStep!.before.type).toBe('relation');
		expect(isolateStep!.after.type).toBe('relation');
		if (isolateStep!.before.type !== 'relation' || isolateStep!.after.type !== 'relation') return;
		expect(isolateStep!.before.relation).toBe('>');
		expect(isolateStep!.after.relation).toBe('<');
	});
});

describe('palier 2c — fast path c = 0 (ax² + bx ⊻ 0)', () => {
	it('B1. x² − 5x < 0 → ]0, 5[ via factor-x fast path', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		expect(kinds).toContain('recognize-no-constant-term');
		expect(kinds).toContain('factor-common-x');
		// Reuses palier 2b sign-table machinery
		expect(kinds).toContain('quadratic-sign-table');
		expect(kinds).toContain('inequality-conclude-quadratic');
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/\]\s*0\s*[;,]\s*5\s*\[/);
	});

	it('B2. x² + 3x ≥ 0 → ]−∞, −3] ∪ [0, +∞[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 3x \\geq 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		const concl = getConclude(steps);
		// Roots are 0 and -3
		expect(concl.solutionDescription).toMatch(/-?\s*3/);
		expect(concl.solutionDescription).toMatch(/0/);
	});

	it('B3. −2x² + 4x > 0 (a < 0, racines 0 et 2) → ]0, 2[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-2x^2 + 4x > 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/\]\s*0\s*[;,]\s*2\s*\[/);
	});
});

describe('palier 2c — fast path forme factorisée (αx + β)(γx + δ) ⊻ 0', () => {
	it('C1. (x − 1)(x − 3) < 0 → ]1, 3[ via factored fast path', () => {
		const steps = generateQuadraticInequalitySteps(ineq('(x - 1)(x - 3) < 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		expect(kinds).not.toContain('standardize');
		expect(kinds).toContain('recognize-factored');
		expect(kinds).toContain('quadratic-sign-table');
		expect(kinds).toContain('inequality-conclude-quadratic');
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/\]\s*1\s*[;,]\s*3\s*\[/);
	});

	it('C2. (2x + 4)(x − 1) > 0 (racines −2 et 1) → ]−∞, −2[ ∪ ]1, +∞[', () => {
		const steps = generateQuadraticInequalitySteps(ineq('(2x + 4)(x - 1) > 0'), {
			level: 'lycee'
		});
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).not.toContain('compute-discriminant');
		expect(kinds).toContain('recognize-factored');
		const concl = getConclude(steps);
		expect(concl.solutionDescription).toMatch(/-?\s*2/);
		expect(concl.solutionDescription).toMatch(/1/);
		expect(concl.solutionDescription).toMatch(/∪|\\cup|cup/i);
	});
});

describe('palier 2c — régression : chemin standard reste intact', () => {
	it('R1. x² − 5x + 6 < 0 (b≠0, c≠0, non factorisé) → emet bien compute-discriminant', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('compute-discriminant');
		expect(kinds).toContain('quadratic-sign-table');
	});

	it('R2. x² − 4x + 4 < 0 (Δ=0, pas un cas spécial) → standard path', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('compute-discriminant');
		expect(kinds).toContain('discriminant-zero');
	});

	it('R3. x² + 5x + 7 < 0 (b≠0, c≠0, Δ<0) → standard path Δ<0', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 5x + 7 < 0'), { level: 'lycee' });
		const kinds = flatten(steps).map((s) => s.operation?.kind);
		expect(kinds).toContain('compute-discriminant');
		expect(kinds).toContain('discriminant-negative');
	});
});
