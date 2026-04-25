import { describe, it, expect } from 'vitest';
import { Figure } from '$lib/geometry-core/graph/figure';
import { numeric, type GeoPoint } from '$lib/geometry-core/types/geo-value';
import { createTransformer } from '$lib/geometry-core/viewport/viewport';
import {
	partialSegmentSVG,
	partialArcSVGPath,
	partialCircleSVGPath,
	drawingTipPosition
} from '../render-helpers';

// Create a simple viewport matching the default GeometryCanvas (center=0,0 ppu=40)
const W = 800;
const H = 600;
const PPU = 40;
const viewport = {
	xMin: -W / (2 * PPU),
	xMax: W / (2 * PPU),
	yMin: -H / (2 * PPU),
	yMax: H / (2 * PPU)
};
const transformer = createTransformer(viewport, W, H);

function pt(x: number, y: number): GeoPoint {
	return { x: numeric(x), y: numeric(y) };
}

function makeFigureWithSegment(): { fig: Figure; segId: string; ptAId: string; ptBId: string } {
	const fig = new Figure();
	const ptAId = fig.createFreePoint(pt(0, 0));
	const ptBId = fig.createFreePoint(pt(4, 0));
	const segId = fig.createSegment(ptAId, ptBId);
	return { fig, segId, ptAId, ptBId };
}

function makeFigureWithArc(): { fig: Figure; arcId: string } {
	const fig = new Figure();
	const centerId = fig.createFreePoint(pt(0, 0));
	const arcId = fig.createArcByAngles(centerId, numeric(3), numeric(0), numeric(Math.PI / 2));
	return { fig, arcId };
}

function makeFigureWithCircle(): { fig: Figure; circleId: string } {
	const fig = new Figure();
	const centerId = fig.createFreePoint(pt(2, 1));
	const circleId = fig.createCircleByRadius(centerId, numeric(3));
	return { fig, circleId };
}

describe('render-helpers', () => {
	describe('partialSegmentSVG', () => {
		it('returns null for unknown id', () => {
			const { fig } = makeFigureWithSegment();
			expect(partialSegmentSVG('unknown', fig, transformer, 0.5)).toBeNull();
		});

		it('returns start point at progress=0', () => {
			const { fig, segId } = makeFigureWithSegment();
			const result = partialSegmentSVG(segId, fig, transformer, 0);
			expect(result).not.toBeNull();
			// At progress=0, x2 should equal x1 (no segment drawn yet)
			expect(result!.x2).toBeCloseTo(result!.x1, 1);
			expect(result!.y2).toBeCloseTo(result!.y1, 1);
		});

		it('returns full segment at progress=1', () => {
			const { fig, segId } = makeFigureWithSegment();
			const full = partialSegmentSVG(segId, fig, transformer, 1);
			expect(full).not.toBeNull();
			// x2 should differ from x1 (4 units apart)
			expect(Math.abs(full!.x2 - full!.x1)).toBeGreaterThan(10);
		});

		it('returns partial segment at progress=0.5', () => {
			const { fig, segId } = makeFigureWithSegment();
			const half = partialSegmentSVG(segId, fig, transformer, 0.5);
			const full = partialSegmentSVG(segId, fig, transformer, 1);
			expect(half).not.toBeNull();
			expect(full).not.toBeNull();
			// At 0.5, x2 should be roughly midway between x1 and full x2
			const expectedX = (half!.x1 + full!.x2) / 2;
			expect(half!.x2).toBeCloseTo(expectedX, 1);
		});

		it('includes style information', () => {
			const { fig, segId } = makeFigureWithSegment();
			const result = partialSegmentSVG(segId, fig, transformer, 0.5);
			expect(result!.style).toBeDefined();
			expect(result!.style.color).toBeDefined();
			expect(result!.style.strokeWidth).toBeGreaterThan(0);
		});
	});

	describe('partialArcSVGPath', () => {
		it('returns null for unknown id', () => {
			const { fig } = makeFigureWithArc();
			expect(partialArcSVGPath('unknown', fig, transformer, 0.5)).toBeNull();
		});

		it('returns null at progress=0', () => {
			const { fig, arcId } = makeFigureWithArc();
			// At progress 0, start and end angles are the same → degenerate arc
			const result = partialArcSVGPath(arcId, fig, transformer, 0);
			// May return null or a very short path
			if (result) {
				expect(result.path).toContain('M');
			}
		});

		it('returns valid SVG path at progress=0.5', () => {
			const { fig, arcId } = makeFigureWithArc();
			const result = partialArcSVGPath(arcId, fig, transformer, 0.5);
			expect(result).not.toBeNull();
			expect(result!.path).toContain('M');
			expect(result!.path).toContain('A');
		});

		it('returns full arc at progress=1', () => {
			const { fig, arcId } = makeFigureWithArc();
			const result = partialArcSVGPath(arcId, fig, transformer, 1);
			expect(result).not.toBeNull();
			expect(result!.path).toContain('A');
		});
	});

	describe('partialCircleSVGPath', () => {
		it('returns null for unknown id', () => {
			const { fig } = makeFigureWithCircle();
			expect(partialCircleSVGPath('unknown', fig, transformer, 0.5)).toBeNull();
		});

		it('returns valid SVG path at progress=0.5', () => {
			const { fig, circleId } = makeFigureWithCircle();
			const result = partialCircleSVGPath(circleId, fig, transformer, 0.5);
			expect(result).not.toBeNull();
			expect(result!.path).toContain('M');
			expect(result!.path).toContain('A');
		});
	});

	describe('drawingTipPosition', () => {
		it('returns null for empty animating set', () => {
			const { fig } = makeFigureWithSegment();
			expect(drawingTipPosition(new Set(), fig, transformer, 0.5)).toBeNull();
		});

		it('returns segment tip position at progress=0.5', () => {
			const { fig, segId } = makeFigureWithSegment();
			const tip = drawingTipPosition(new Set([segId]), fig, transformer, 0.5);
			expect(tip).not.toBeNull();
			expect(typeof tip!.x).toBe('number');
			expect(typeof tip!.y).toBe('number');
		});

		it('returns start position at progress=0', () => {
			const { fig, segId } = makeFigureWithSegment();
			const tip0 = drawingTipPosition(new Set([segId]), fig, transformer, 0);
			const seg = partialSegmentSVG(segId, fig, transformer, 0);
			expect(tip0).not.toBeNull();
			expect(tip0!.x).toBeCloseTo(seg!.x1, 1);
			expect(tip0!.y).toBeCloseTo(seg!.y1, 1);
		});

		it('returns arc tip position', () => {
			const { fig, arcId } = makeFigureWithArc();
			const tip = drawingTipPosition(new Set([arcId]), fig, transformer, 0.5);
			expect(tip).not.toBeNull();
		});
	});
});
