import { describe, it, expect } from 'vitest';
import { seedFromId, shouldRenderRough, styleToRoughOptions } from '../rough-geometry';
import type { GeoStyleResolved } from '../svg-primitives';

// =============================================================================
// seedFromId
// =============================================================================

describe('seedFromId', () => {
	it('returns explicit seed when provided', () => {
		expect(seedFromId('seg_1', 42)).toBe(42);
	});

	it('generates deterministic seed from id', () => {
		const s1 = seedFromId('seg_1');
		const s2 = seedFromId('seg_1');
		expect(s1).toBe(s2);
	});

	it('different ids produce different seeds', () => {
		expect(seedFromId('seg_1')).not.toBe(seedFromId('seg_2'));
	});

	it('returns a non-negative number', () => {
		expect(seedFromId('test')).toBeGreaterThanOrEqual(0);
		expect(seedFromId('a')).toBeGreaterThanOrEqual(0);
		expect(seedFromId('')).toBeGreaterThanOrEqual(0);
	});
});

// =============================================================================
// shouldRenderRough
// =============================================================================

describe('shouldRenderRough', () => {
	describe('figureMode = normal', () => {
		it('returns false for all element types', () => {
			expect(shouldRenderRough('normal', 'segment', 'normal')).toBe(false);
			expect(shouldRenderRough('rough', 'segment', 'normal')).toBe(false);
			expect(shouldRenderRough('rough', 'circleByRadius', 'normal')).toBe(false);
		});
	});

	describe('figureMode = rough', () => {
		it('returns true for drawable elements', () => {
			expect(shouldRenderRough('normal', 'segment', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'line', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'ray', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'circleByRadius', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'circleByPoint', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'arcByAngles', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'arcByPoints', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'polygon', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'angle', 'rough')).toBe(true);
			expect(shouldRenderRough('normal', 'segmentMark', 'rough')).toBe(true);
		});

		it('returns false for point types', () => {
			expect(shouldRenderRough('normal', 'freePoint', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'midpoint', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'intersectionLL', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'reflectedPoint', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'rotatedPoint', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'translatedPoint', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'dilatedPoint', 'rough')).toBe(false);
			expect(shouldRenderRough('normal', 'reflectedOverLine', 'rough')).toBe(false);
		});

		it('returns false for measures', () => {
			expect(shouldRenderRough('normal', 'text', 'rough')).toBe(false);
		});
	});

	describe('figureMode = mixed', () => {
		it('returns true only when element render is rough', () => {
			expect(shouldRenderRough('rough', 'segment', 'mixed')).toBe(true);
			expect(shouldRenderRough('normal', 'segment', 'mixed')).toBe(false);
		});

		it('still excludes points even if marked rough', () => {
			expect(shouldRenderRough('rough', 'freePoint', 'mixed')).toBe(false);
			expect(shouldRenderRough('rough', 'text', 'mixed')).toBe(false);
		});
	});
});

// =============================================================================
// styleToRoughOptions
// =============================================================================

describe('styleToRoughOptions', () => {
	const baseSty: GeoStyleResolved = {
		color: '#dc2626',
		strokeWidth: 2,
		dash: 'solid',
		dashArray: '',
		opacity: 1,
		pointShape: 'dot',
		pointSize: 5,
		fillColor: undefined,
		fillOpacity: 0,
		render: 'rough',
		roughness: 1,
		roughSeed: undefined,
		roughBowing: 1,
		roughFillStyle: 'hachure',
		roughPreserveVertices: false
	};

	it('maps color to stroke', () => {
		const opts = styleToRoughOptions(baseSty, 42);
		expect(opts.stroke).toBe('#dc2626');
	});

	it('maps strokeWidth', () => {
		const opts = styleToRoughOptions(baseSty, 42);
		expect(opts.strokeWidth).toBe(2);
	});

	it('increases strokeWidth for dashed/dotted', () => {
		const dashed = styleToRoughOptions({ ...baseSty, dash: 'dashed' }, 42);
		expect(dashed.strokeWidth).toBe(2.5);
		expect(dashed.disableMultiStroke).toBe(true);
	});

	it('sets seed', () => {
		const opts = styleToRoughOptions(baseSty, 12345);
		expect(opts.seed).toBe(12345);
	});

	it('uses roughness from style by default', () => {
		const opts = styleToRoughOptions({ ...baseSty, roughness: 2.5 }, 42);
		expect(opts.roughness).toBe(2.5);
	});

	it('roughness parameter overrides style roughness', () => {
		const opts = styleToRoughOptions({ ...baseSty, roughness: 2.5 }, 42, 0.5);
		expect(opts.roughness).toBe(0.5);
	});

	it('sets fill when fillColor is present', () => {
		const sty = { ...baseSty, fillColor: '#ff0000' };
		const opts = styleToRoughOptions(sty, 42);
		expect(opts.fill).toBe('#ff0000');
		expect(opts.fillStyle).toBe('hachure');
	});

	it('no fill when fillColor is undefined', () => {
		const opts = styleToRoughOptions(baseSty, 42);
		expect(opts.fill).toBeUndefined();
		expect(opts.fillStyle).toBeUndefined();
	});

	it('no strokeLineDash for solid', () => {
		const opts = styleToRoughOptions(baseSty, 42);
		expect(opts.strokeLineDash).toBeUndefined();
	});

	it('sets strokeLineDash for dashed', () => {
		const opts = styleToRoughOptions({ ...baseSty, dash: 'dashed' }, 42);
		expect(opts.strokeLineDash).toBeDefined();
		expect(opts.strokeLineDash!.length).toBe(2);
	});

	it('sets strokeLineDash for dotted', () => {
		const opts = styleToRoughOptions({ ...baseSty, dash: 'dotted' }, 42);
		expect(opts.strokeLineDash).toBeDefined();
		expect(opts.strokeLineDash!.length).toBe(2);
	});

	it('maps bowing', () => {
		const opts = styleToRoughOptions({ ...baseSty, roughBowing: 5 }, 42);
		expect(opts.bowing).toBe(5);
	});

	it('maps preserveVertices', () => {
		const opts = styleToRoughOptions({ ...baseSty, roughPreserveVertices: true }, 42);
		expect(opts.preserveVertices).toBe(true);
	});

	it('defaults preserveVertices to false', () => {
		const opts = styleToRoughOptions(baseSty, 42);
		expect(opts.preserveVertices).toBe(false);
	});

	it('maps fillStyle from roughFillStyle when fill present', () => {
		const sty = { ...baseSty, fillColor: '#ff0000', roughFillStyle: 'cross-hatch' as const };
		const opts = styleToRoughOptions(sty, 42);
		expect(opts.fillStyle).toBe('cross-hatch');
	});

	it('uses solid fillStyle', () => {
		const sty = { ...baseSty, fillColor: '#ff0000', roughFillStyle: 'solid' as const };
		const opts = styleToRoughOptions(sty, 42);
		expect(opts.fillStyle).toBe('solid');
	});

	it('ignores fillStyle when no fillColor', () => {
		const sty = { ...baseSty, roughFillStyle: 'dots' as const };
		const opts = styleToRoughOptions(sty, 42);
		expect(opts.fillStyle).toBeUndefined();
	});
});
