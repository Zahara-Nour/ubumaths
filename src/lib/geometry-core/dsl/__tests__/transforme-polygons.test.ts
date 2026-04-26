import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { applyTransformationToElement } from '../transform-apply';

function makeTriangleFigure() {
	const fig = new Figure();
	const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
	const a = fig.createFreePoint({ x: numeric(1), y: numeric(0) });
	const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
	const c = fig.createFreePoint({ x: numeric(0), y: numeric(1) });
	const poly = fig.createPolygon([a, b, c]);
	const rot = fig.createRotation(o, { kind: 'numeric', value: Math.PI / 2 });
	return { fig, o, a, b, c, poly, rot };
}

describe('transforme() — polygon', () => {
	it('rotates a triangle', () => {
		const { fig, poly, rot } = makeTriangleFigure();
		const result = applyTransformationToElement(fig, rot, poly, 'polygone');
		expect(result.symbolType).toBe('polygone');
		const el = fig.getElementById(result.figureId);
		expect(el!.type).toBe('polygon');
		if (el!.type === 'polygon') {
			expect(el.dependsOn).toHaveLength(3);
			const v0 = fig.getPosition(el.dependsOn[0])!;
			const v1 = fig.getPosition(el.dependsOn[1])!;
			const v2 = fig.getPosition(el.dependsOn[2])!;
			// (1,0)→(0,1), (1,1)→(-1,1), (0,1)→(-1,0)
			expect(geoToNumber(v0.x)).toBeCloseTo(0);
			expect(geoToNumber(v0.y)).toBeCloseTo(1);
			expect(geoToNumber(v1.x)).toBeCloseTo(-1);
			expect(geoToNumber(v1.y)).toBeCloseTo(1);
			expect(geoToNumber(v2.x)).toBeCloseTo(-1);
			expect(geoToNumber(v2.y)).toBeCloseTo(0);
		}
	});

	it('translates a polygon', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(1), y: numeric(0) });
		const c = fig.createFreePoint({ x: numeric(0), y: numeric(1) });
		const poly = fig.createPolygon([a, b, c]);
		const p = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const q = fig.createFreePoint({ x: numeric(2), y: numeric(3) });
		const t = fig.createTranslation(p, q);
		const result = applyTransformationToElement(fig, t, poly, 'polygone');
		const el = fig.getElementById(result.figureId);
		if (el!.type === 'polygon') {
			const v0 = fig.getPosition(el.dependsOn[0])!;
			expect(geoToNumber(v0.x)).toBeCloseTo(2);
			expect(geoToNumber(v0.y)).toBeCloseTo(3);
		}
	});

	it('intermediate vertex points are invisible', () => {
		const { fig, poly, rot } = makeTriangleFigure();
		applyTransformationToElement(fig, rot, poly, 'polygone');
		const rotatedPoints = fig.getAllElements().filter((e) => e.type === 'rotatedPoint');
		const invisible = rotatedPoints.filter((e) => !e.visible);
		expect(invisible.length).toBeGreaterThanOrEqual(3);
	});

	it('homothety scales a polygon', () => {
		const fig = new Figure();
		const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const a = fig.createFreePoint({ x: numeric(1), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(1), y: numeric(1) });
		const c = fig.createFreePoint({ x: numeric(0), y: numeric(1) });
		const poly = fig.createPolygon([a, b, c]);
		const h = fig.createHomothety(o, numeric(2));
		const result = applyTransformationToElement(fig, h, poly, 'polygone');
		const el = fig.getElementById(result.figureId);
		if (el!.type === 'polygon') {
			const v0 = fig.getPosition(el.dependsOn[0])!;
			expect(geoToNumber(v0.x)).toBeCloseTo(2);
			expect(geoToNumber(v0.y)).toBeCloseTo(0);
		}
	});
});
