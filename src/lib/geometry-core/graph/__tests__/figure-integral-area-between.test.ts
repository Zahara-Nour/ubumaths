/**
 * Phase 1 (aire_entre builtin) — `secondFunctionId?` field on GeoIntegralArea
 * + `createIntegralArea` factory branch for aire entre deux courbes.
 *
 * Spec: `docs/wip/geometry/aire-entre-study.md` §0 (option α étendue,
 * decisions validated 2026-05-01). 10 behaviors validated by the user.
 *
 * Red-first TDD: these tests must fail before implementation.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';
import { numeric, type ScalarParam } from '../../types/geo-value';
import type { MathNode } from '$lib/mathAST/types';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { subtract } from '$lib/mathAST/factory';
import { getAllDiscontinuities } from '../../dsl/singularity-warn';

interface GeoIntegralAreaShape {
	type: 'integralArea';
	id: string;
	functionId: string;
	lowerBound: ScalarParam;
	upperBound: ScalarParam;
	signed: boolean;
	antiderivative: MathNode | null;
	compiledF: ((vars: { x: number }) => number) | null;
	integrationStatus: 'exact' | 'approximate' | 'unsupported';
	dependsOn: readonly string[];
	_scalarId: string;
	// V3 (aire_entre)
	secondFunctionId?: string;
	differenceExpression?: MathNode;
	compiledDifference?: (vars: { x: number }) => number;
}

function setupFigureWithTwoFns(eqF: string, eqG: string) {
	// Curve equations follow the active angle mode; DSL default is degrees.
	// These tests work in radians (mathAST native), so opt in explicitly.
	const { figure, symbols } = runDsl(
		`unite_angle("radians")\nf = courbe("${eqF}")\ng = courbe("${eqG}")`
	);
	const fId = symbols.get('f')!.figureId!;
	const gId = symbols.get('g')!.figureId!;
	return { figure, fId, gId };
}

function getArea(figure: ReturnType<typeof setupFigureWithTwoFns>['figure'], areaId: string) {
	return figure.getElementById(areaId) as unknown as GeoIntegralAreaShape;
}

// =============================================================================
// A. Création — secondFunctionId field + cache differenceExpression/compiled
//
// Note: `y = x` is parsed as a GeoLine (affine in x and y). To stay in the
// GeoFunction path, we use polynomial forms like `y = x^3` (no division to
// avoid parser precedence quirks). Same convention as
// figure-integral-area-unsigned.test.ts.
// =============================================================================

describe('createIntegralArea — aire_entre (mode secondFunctionId)', () => {
	it('A1: secondFunctionId option → element has signed=false and secondFunctionId=gId', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const { areaId } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		const area = getArea(figure, areaId);
		expect(area.signed).toBe(false);
		expect(area.secondFunctionId).toBe(gId);
	});

	it('A2: differenceExpression and compiledDifference are cached at creation', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const { areaId } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		const area = getArea(figure, areaId);
		expect(area.differenceExpression).toBeDefined();
		expect(typeof area.compiledDifference).toBe('function');
		// h(x) = x^2 - x^3 ; h(0.5) = 0.25 - 0.125 = 0.125
		expect(area.compiledDifference!({ x: 0.5 })).toBeCloseTo(0.125, 9);
	});

	it('A3: secondFunctionId is in dependsOn (cohérence avec functionId)', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const { areaId } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		const area = getArea(figure, areaId);
		expect(area.dependsOn).toContain(fId);
		expect(area.dependsOn).toContain(gId);
	});
});

// =============================================================================
// B. Calcul correct — cas pédagogiques classiques
// =============================================================================

describe('createIntegralArea — aire_entre compute', () => {
	it('B4: f=x², g=x³, [0,1] → aire_entre = 1/12 (cas Terminale classique)', () => {
		// h = x² - x³ = x²(1-x), zéros en 0 et 1 (bornes), h ≥ 0 sur (0, 1).
		// aire = ∫_0^1 (x² - x³) dx = 1/3 - 1/4 = 1/12.
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const { scalarId } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 12, 6);
	});

	it('B5: f=sin(x), g=cos(x), [π/4, 5π/4] → aire_entre = 2√2', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = sin(x)', 'y = cos(x)');
		const { scalarId } = figure.createIntegralArea(
			fId,
			numeric(Math.PI / 4),
			numeric((5 * Math.PI) / 4),
			{ secondFunctionId: gId }
		);
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2 * Math.sqrt(2), 5);
	});

	it('B6: f=sin(x), g=sin(x)/2, [0, 2π] → aire_entre = 2 (sign change à π)', () => {
		// h = sin(x)/2. Zéros à 0, π, 2π. Sur [0,π] h ≥ 0 ; sur [π, 2π] h ≤ 0.
		// aire = (1/2)*[-cos]_0^π + |(1/2)*[-cos]_π^{2π}| = 1 + 1 = 2.
		const { figure, fId, gId } = setupFigureWithTwoFns('y = sin(x)', 'y = sin(x) / 2');
		const { scalarId } = figure.createIntegralArea(fId, numeric(0), numeric(2 * Math.PI), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2, 6);
	});

	it("B7: f=x²+2, g=x², [0,1] → aire_entre = 2 (pas d'intersection, h ≡ 2)", () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2 + 2', 'y = x^2');
		const { scalarId } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2, 6);
	});
});

// =============================================================================
// C. Invariances mathématiques
// =============================================================================

describe('createIntegralArea — aire_entre invariances', () => {
	it('C8: symétrie (f, g) ↔ (g, f) → même valeur', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const { scalarId: sFG } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		const { scalarId: sGF } = figure.createIntegralArea(gId, numeric(0), numeric(1), {
			secondFunctionId: fId
		});
		const valFG = figure.getScalarValue(sFG)!;
		const valGF = figure.getScalarValue(sGF)!;
		expect(valGF).toBeCloseTo(valFG, 8);
	});

	it('C9: bornes inversées (a > b) → même valeur (convention [lo, hi])', () => {
		// Cas avec sign change (sin(x) vs sin(x)/2 sur [0, 2π], aire = 2).
		const { figure, fId, gId } = setupFigureWithTwoFns('y = sin(x)', 'y = sin(x) / 2');
		const { scalarId: sAB } = figure.createIntegralArea(fId, numeric(0), numeric(2 * Math.PI), {
			secondFunctionId: gId
		});
		const { scalarId: sBA } = figure.createIntegralArea(fId, numeric(2 * Math.PI), numeric(0), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(sBA)).toBeCloseTo(figure.getScalarValue(sAB)!, 6);
	});
});

// =============================================================================
// D. Cas dégénérés
// =============================================================================

describe('createIntegralArea — aire_entre cas dégénérés', () => {
	it('D10: a === b → aire = 0 exact', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const { scalarId } = figure.createIntegralArea(fId, numeric(2), numeric(2), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(scalarId)).toBe(0);
	});

	it('D11: f ≡ g (deux courbes identiques) → aire = 0', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^2');
		const { scalarId } = figure.createIntegralArea(fId, numeric(0), numeric(1), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(0, 9);
	});
});

// =============================================================================
// E. Réactivité — slider drag updates aire_entre
// =============================================================================

describe('createIntegralArea — aire_entre réactivité', () => {
	it('E12: lower slider drag → aire_entre recompute correctement', () => {
		// f = x², g = x³, b = 1 fixé. h = x² - x³ = x²(1-x).
		// À a = 0 : aire = ∫_0^1 (x² - x³) dx = 1/12.
		// Quand a glisse à -1 :
		//   sur [-1, 0]: h = x² - x³ ≥ 0 (x³ ≤ 0). aire_left = ∫_{-1}^0 = [x³/3 - x⁴/4]_{-1}^0 = 7/12.
		//   sur [0, 1]: aire_right = 1/12.
		//   total = 7/12 + 1/12 = 8/12 = 2/3.
		const { figure, fId, gId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const lower = figure.createSlider(-2, 2, 0);
		const { scalarId } = figure.createIntegralArea(fId, { scalarRef: lower }, numeric(1), {
			secondFunctionId: gId
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 12, 6);
		figure.beginTransaction();
		figure.moveSlider(lower, -1);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2 / 3, 6);
	});
});

// =============================================================================
// F. Validation inputs
// =============================================================================

describe('createIntegralArea — aire_entre validation', () => {
	it('F13: rejects when secondFunctionId references a non-function element', () => {
		const { figure, fId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		const pt = figure.createFreePoint({ x: numeric(0), y: numeric(0) });
		expect(() =>
			figure.createIntegralArea(fId, numeric(0), numeric(1), { secondFunctionId: pt })
		).toThrow(/function/i);
	});

	it('F14: rejects when secondFunctionId references a non-existent id', () => {
		const { figure, fId } = setupFigureWithTwoFns('y = x^2', 'y = x^3');
		expect(() =>
			figure.createIntegralArea(fId, numeric(0), numeric(1), { secondFunctionId: 'ghost' })
		).toThrow();
	});
});

// =============================================================================
// G. Singularité — NaN-on-divergence via cache discontinuités de h
// =============================================================================

describe('createIntegralArea — aire_entre singularité', () => {
	it('G15: f=1/x, g=sin(x) sur [-1,1] avec cache discontinuités → aire = NaN', () => {
		// h = 1/x - sin(x) diverge en 0 (asymptote verticale héritée de 1/x).
		// Le DSL Phase 2 calculera ce cache via getAllDiscontinuities(h, 'x') ; ici en
		// factory pure, on simule le pipeline en construisant h manuellement et en
		// appelant le helper. Le compute closure consulte le cache et retourne NaN
		// quand une discontinuité divergente intersecte [a, b].
		const { figure, fId, gId } = setupFigureWithTwoFns('y = 1/x', 'y = sin(x)');
		const fExpr = parseCustom('1/x');
		const gExpr = parseCustom('sin(x)');
		const hExpr = subtract(fExpr, gExpr);
		const discs = getAllDiscontinuities(hExpr, 'x') ?? undefined;
		const { scalarId } = figure.createIntegralArea(fId, numeric(-1), numeric(1), {
			secondFunctionId: gId,
			discontinuities: discs
		});
		const v = figure.getScalarValue(scalarId);
		expect(Number.isNaN(v as number)).toBe(true);
	});
});

// =============================================================================
// H. Coexistence avec V1 (signed=true) et V2 (signed=false sans secondFunctionId)
// =============================================================================

describe('createIntegralArea — coexistence aire_entre / aire / integrale', () => {
	it('H16: integrale, aire, aire_entre coexistent et calculent indépendamment', () => {
		const { figure, fId, gId } = setupFigureWithTwoFns('y = sin(x)', 'y = cos(x)');
		// integrale(sin, 0, 2π) = 0
		const { scalarId: intId } = figure.createIntegralArea(fId, numeric(0), numeric(2 * Math.PI), {
			signed: true
		});
		// aire(sin, 0, 2π) = 4
		const { scalarId: aireId } = figure.createIntegralArea(fId, numeric(0), numeric(2 * Math.PI), {
			signed: false
		});
		// aire_entre(sin, cos, π/4, 5π/4) = 2√2
		const { scalarId: entreId } = figure.createIntegralArea(
			fId,
			numeric(Math.PI / 4),
			numeric((5 * Math.PI) / 4),
			{ secondFunctionId: gId }
		);
		expect(figure.getScalarValue(intId)).toBeCloseTo(0, 6);
		expect(figure.getScalarValue(aireId)).toBeCloseTo(4, 6);
		expect(figure.getScalarValue(entreId)).toBeCloseTo(2 * Math.sqrt(2), 5);
	});
});
