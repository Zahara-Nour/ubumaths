import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import { createTransformer } from '../../viewport/viewport';
import { arcToSVG } from '../svg-primitives';

const viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const transformer = createTransformer(viewport, 400, 400);

describe('arcToSVG', () => {
	it('returns SVG path for arcByAngles', () => {
		const fig = new Figure();
		const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const id = fig.createArcByAngles(c, numeric(3), numeric(0), numeric(Math.PI / 2));
		const svg = arcToSVG(id, fig, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.path).toContain('M');
		expect(svg!.path).toContain('A');
	});

	it('returns SVG path for arcByPoints', () => {
		const fig = new Figure();
		const a = fig.createFreePoint({ x: numeric(3), y: numeric(0) });
		const o = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const b = fig.createFreePoint({ x: numeric(0), y: numeric(3) });
		const id = fig.createArcByPoints(a, o, b);
		const svg = arcToSVG(id, fig, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.path).toContain('M');
		expect(svg!.path).toContain('A');
	});

	it('sets large-arc flag for arcs > 180°', () => {
		const fig = new Figure();
		const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		// Arc from 0 to 270° (3*PI/2 radians)
		const id = fig.createArcByAngles(c, numeric(3), numeric(0), numeric((3 * Math.PI) / 2));
		const svg = arcToSVG(id, fig, transformer);
		expect(svg).not.toBeNull();
		// large-arc flag should be 1
		const parts = svg!.path.split(' ');
		const aIndex = parts.indexOf('A');
		// A rx ry rotation large-arc sweep-flag x y
		// large-arc is at aIndex + 4
		expect(parts[aIndex + 4]).toBe('1');
	});

	it('sets small-arc flag for arcs < 180°', () => {
		const fig = new Figure();
		const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		// Arc from 0 to 90° (PI/2 radians)
		const id = fig.createArcByAngles(c, numeric(3), numeric(0), numeric(Math.PI / 2));
		const svg = arcToSVG(id, fig, transformer);
		expect(svg).not.toBeNull();
		const parts = svg!.path.split(' ');
		const aIndex = parts.indexOf('A');
		expect(parts[aIndex + 4]).toBe('0');
	});

	it('returns null for unknown element', () => {
		const fig = new Figure();
		const svg = arcToSVG('nonexistent', fig, transformer);
		expect(svg).toBeNull();
	});

	it('returns null for non-arc element', () => {
		const fig = new Figure();
		const c = fig.createFreePoint({ x: numeric(0), y: numeric(0) });
		const svg = arcToSVG(c, fig, transformer);
		expect(svg).toBeNull();
	});
});
