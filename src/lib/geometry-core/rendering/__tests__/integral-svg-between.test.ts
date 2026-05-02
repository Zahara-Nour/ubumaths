/**
 * Phase 3 — SVG rendering of GeoIntegralArea in V3 (aire_entre) mode.
 *
 * Tests `integralAreaBetweenToSVG`: renders the area between two curves f and g
 * (instead of between f and the x-axis).
 *
 * Spec: docs/wip/geometry/aire-entre-study.md §2.5.
 *
 * Red-first TDD: these tests must fail before the helper is implemented.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';
import { createTransformer } from '../../viewport/viewport';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';
import { integralAreaBetweenToSVG } from '../svg-primitives';

const VIEWPORT: Viewport = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const DIMS = { width: 600, height: 600 };

function setup(eqF: string, eqG: string, a: number, b: number) {
	const { figure, symbols } = runDsl(`f = courbe("${eqF}")\ng = courbe("${eqG}")`);
	const fId = symbols.get('f')!.figureId!;
	const gId = symbols.get('g')!.figureId!;
	const { areaId } = figure.createIntegralArea(fId, numeric(a), numeric(b), {
		secondFunctionId: gId
	});
	const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
	return { figure, fId, gId, areaId, transformer };
}

// =============================================================================
// A. Cas nominaux — paths générés
// =============================================================================

describe('integralAreaBetweenToSVG — basic rendering', () => {
	it('A1: non-intersecting curves → exactly 1 path (h ≡ 2 sur [0, 1])', () => {
		// f = x² + 2, g = x². h ≡ 2 > 0 partout. Une seule sous-région.
		const { figure, areaId, transformer } = setup('y = x^2 + 2', 'y = x^2', 0, 1);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths).toHaveLength(1);
		expect(svg!.paths[0].sign).toBe('positive');
	});

	it('A2: intersecting curves with sign change → ≥ 2 paths (sign change à 0 et 1)', () => {
		// f = x², g = x³ sur [-1, 2].
		// h = x² - x³. Zéros : x = 0, x = 1.
		// Sur [-1, 0]: h > 0 (-(-1)+1 = 2 > 0). Sur [0, 1]: h > 0. Sur [1, 2]: h < 0.
		// Donc 2 régions distinctes (positive, negative) — passé le zéro à x=1.
		const { figure, areaId, transformer } = setup('y = x^2', 'y = x^3', -1, 2);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(2);
		const signs = new Set(svg!.paths.map((p) => p.sign));
		expect(signs.has('positive')).toBe(true);
		expect(signs.has('negative')).toBe(true);
	});

	it('A3: each path is a closed SVG path (M ... Z)', () => {
		const { figure, areaId, transformer } = setup('y = x^2 + 2', 'y = x^2', 0, 1);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThan(0);
		for (const p of svg!.paths) {
			expect(p.d.startsWith('M')).toBe(true);
			expect(p.d.trim().endsWith('Z')).toBe(true);
		}
	});

	it('A4: path structure contains both forward and reverse segments (M, L, Z, length > seuil)', () => {
		// Le path doit avoir : M (initial f), des segments curve f, un L (jonction
		// vers g), des segments curve g (reversed), un L final ou Z.
		// On vérifie juste la structure : commence par M, contient ≥ 1 L, finit par Z,
		// et la longueur du `d` est conséquente (>50 chars pour un vrai path échantillonné).
		const { figure, areaId, transformer } = setup('y = x^2 + 2', 'y = x^2', 0, 1);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		const d = svg!.paths[0].d;
		expect(d).toMatch(/^M/);
		expect(d).toMatch(/L/);
		expect(d.trim().endsWith('Z')).toBe(true);
		// Un path échantillonné sur 256+ points + g reversed → string > 200 chars.
		expect(d.length).toBeGreaterThan(200);
	});

	it('A5: sign reflects whether f > g (positive) or f < g (negative) in the sub-region', () => {
		// f = x² + 2 > g = x² → toutes les régions sont 'positive'.
		const { figure, areaId, transformer } = setup('y = x^2 + 2', 'y = x^2', 0, 1);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.every((p) => p.sign === 'positive')).toBe(true);

		// f = x² < g = x² + 2 → toutes les régions sont 'negative'.
		const { figure: f2, areaId: a2, transformer: t2 } = setup('y = x^2', 'y = x^2 + 2', 0, 1);
		const svg2 = integralAreaBetweenToSVG(a2, f2, t2, DIMS);
		expect(svg2).not.toBeNull();
		expect(svg2!.paths.every((p) => p.sign === 'negative')).toBe(true);
	});
});

// =============================================================================
// B. Dégénérescences (retourne null)
// =============================================================================

describe('integralAreaBetweenToSVG — null cases', () => {
	it('B6: returns null when the element does not exist', () => {
		const { figure } = runDsl(`f = courbe("y = x^2")`);
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		expect(integralAreaBetweenToSVG('nope', figure, transformer, DIMS)).toBeNull();
	});

	it('B7: returns null when element is not integralArea', () => {
		const { figure, symbols } = runDsl(`f = courbe("y = x^2")`);
		const fnId = symbols.get('f')!.figureId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		expect(integralAreaBetweenToSVG(fnId, figure, transformer, DIMS)).toBeNull();
	});

	it('B8: returns null when integralArea is in V1/V2 mode (no secondFunctionId)', () => {
		// Mode V1 (signed) ou V2 (signed=false) sans secondFunctionId → null
		// → le dispatcher devra continuer à utiliser integralAreaToSVG pour ces modes.
		const { figure, symbols } = runDsl(`f = courbe("y = x^2")`);
		const fnId = symbols.get('f')!.figureId!;
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		expect(integralAreaBetweenToSVG(areaId, figure, transformer, DIMS)).toBeNull();
	});

	it('B9: returns null when bounds are equal (a === b)', () => {
		const { figure, areaId, transformer } = setup('y = x^2 + 2', 'y = x^2', 1, 1);
		expect(integralAreaBetweenToSVG(areaId, figure, transformer, DIMS)).toBeNull();
	});

	it('B10: f ≡ g → returns null or empty paths (rien à dessiner)', () => {
		// Deux courbes identiques. h ≡ 0, splitOnZeros retourne sign='zero' qui est
		// filtré → null (pas de path).
		const { figure, areaId, transformer } = setup('y = x^2', 'y = x^2', 0, 1);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		// Soit null, soit paths: [].
		if (svg !== null) {
			expect(svg.paths).toHaveLength(0);
		} else {
			expect(svg).toBeNull();
		}
	});
});

// =============================================================================
// C. Dynamique — slider-driven bounds
// =============================================================================

describe('integralAreaBetweenToSVG — dynamic bounds', () => {
	it('C11: slider drag updates the rendered path', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = x^2 + 2")
g = courbe("y = x^2")
b = slider(min=0, max=2, valeur=1)
A = aire_entre(f, g, 0, b)`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect(area).toBeDefined();
		const areaId = area!.id;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);

		const svgBefore = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svgBefore).not.toBeNull();
		const dBefore = svgBefore!.paths[0].d;

		// Move slider — la sous-région s'élargit, le path change.
		const bId = symbols.get('b')!.figureId!;
		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();

		const svgAfter = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svgAfter).not.toBeNull();
		expect(svgAfter!.paths[0].d).not.toBe(dBefore);
	});
});
