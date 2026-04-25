import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { resolveStyle } from '../../rendering/svg-primitives';
import { numeric } from '../../types/geo-value';
import type { GeoStyle } from '../../types/elements';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

describe('FigureDefaults', () => {
	it('Figure without defaults uses #1e40af', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(0, 0));
		const el = f.getElementById(id)!;
		expect(el.color).toBe('#1e40af');
	});

	it('Figure with defaultColor uses that color', () => {
		const f = new Figure({ defaultColor: '#dc2626' });
		const id = f.createFreePoint(pt(0, 0));
		const el = f.getElementById(id)!;
		expect(el.color).toBe('#dc2626');
	});

	it('explicit color option overrides FigureDefaults', () => {
		const f = new Figure({ defaultColor: '#dc2626' });
		const id = f.createFreePoint(pt(0, 0), { color: '#16a34a' });
		const el = f.getElementById(id)!;
		expect(el.color).toBe('#16a34a');
	});

	it('defaults are accessible via figure.defaults', () => {
		const defaults = { defaultColor: '#dc2626', defaultStrokeWidth: 3 };
		const f = new Figure(defaults);
		expect(f.defaults).toEqual(defaults);
	});
});

describe('GeoStyle on elements', () => {
	it('element without style has style undefined', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(0, 0));
		const el = f.getElementById(id)!;
		expect(el.style).toBeUndefined();
	});

	it('element with style stores the style', () => {
		const f = new Figure();
		const style: GeoStyle = { dash: 'dashed', strokeWidth: 3 };
		const id = f.createSegment(f.createFreePoint(pt(0, 0)), f.createFreePoint(pt(1, 1)), { style });
		const el = f.getElementById(id)!;
		expect(el.style).toEqual(style);
	});

	it('style is preserved through all factory methods', () => {
		const f = new Figure();
		const style: GeoStyle = { opacity: 0.5, pointShape: 'cross' };
		const a = f.createFreePoint(pt(0, 0), { style });
		expect(f.getElementById(a)!.style).toEqual(style);

		const b = f.createFreePoint(pt(1, 0));
		const mid = f.createMidpoint(a, b, { style });
		expect(f.getElementById(mid)!.style).toEqual(style);

		const seg = f.createSegment(a, b, { style: { dash: 'dotted' } });
		expect(f.getElementById(seg)!.style).toEqual({ dash: 'dotted' });

		const line = f.createLine(a, b, { style: { strokeWidth: 4 } });
		expect(f.getElementById(line)!.style).toEqual({ strokeWidth: 4 });

		const ray = f.createRay(a, b, { style: { color: '#ff0000' } });
		expect(f.getElementById(ray)!.style).toEqual({ color: '#ff0000' });

		const circle = f.createCircleByRadius(a, numeric(2), { style: { dash: 'dashed' } });
		expect(f.getElementById(circle)!.style).toEqual({ dash: 'dashed' });
	});
});

describe('resolveStyle', () => {
	it('resolves with all defaults when no style and no figure defaults', () => {
		const el = { id: 'x', color: '#1e40af', visible: true, dependsOn: [] as const };
		const resolved = resolveStyle(el);
		expect(resolved).toEqual({
			color: '#1e40af',
			strokeWidth: 2,
			dash: 'solid',
			dashArray: '',
			opacity: 1,
			pointShape: 'dot',
			pointSize: 5,
			fillColor: undefined,
			fillOpacity: 0,
			render: 'normal',
			roughness: 1,
			roughSeed: undefined,
			roughBowing: 1,
			roughFillStyle: 'hachure',
			roughPreserveVertices: false
		});
	});

	it('element.style overrides element.color', () => {
		const el = {
			id: 'x',
			color: '#1e40af',
			visible: true,
			dependsOn: [] as const,
			style: { color: '#dc2626' }
		};
		const resolved = resolveStyle(el);
		expect(resolved.color).toBe('#dc2626');
	});

	it('figure defaults are used when no element style', () => {
		const el = { id: 'x', color: '#1e40af', visible: true, dependsOn: [] as const };
		const defaults = { defaultStrokeWidth: 4, defaultDash: 'dashed' as const };
		const resolved = resolveStyle(el, defaults);
		expect(resolved.strokeWidth).toBe(4);
		expect(resolved.dash).toBe('dashed');
		expect(resolved.dashArray).toBe('12 8');
	});

	it('element style overrides figure defaults', () => {
		const el = {
			id: 'x',
			color: '#1e40af',
			visible: true,
			dependsOn: [] as const,
			style: { strokeWidth: 1, dash: 'dotted' as const }
		};
		const defaults = { defaultStrokeWidth: 4, defaultDash: 'dashed' as const };
		const resolved = resolveStyle(el, defaults);
		expect(resolved.strokeWidth).toBe(1);
		expect(resolved.dash).toBe('dotted');
		expect(resolved.dashArray).toBe('2 6');
	});

	it('priority: element.style > element.color > figureDefaults > hardcoded', () => {
		const el = {
			id: 'x',
			color: '#111111',
			visible: true,
			dependsOn: [] as const,
			style: { color: '#222222' }
		};
		const defaults = { defaultColor: '#333333' };
		// element.style.color wins
		expect(resolveStyle(el, defaults).color).toBe('#222222');

		// Without style.color, element.color wins
		const el2 = { id: 'x', color: '#111111', visible: true, dependsOn: [] as const };
		expect(resolveStyle(el2, defaults).color).toBe('#111111');

		// Without element.color... (color is required on GeoElementBase, so this case doesn't apply)
	});

	it('dash array mapping is correct', () => {
		const base = { id: 'x', color: '#000', visible: true, dependsOn: [] as const };

		expect(resolveStyle({ ...base, style: { dash: 'solid' } }).dashArray).toBe('');
		expect(resolveStyle({ ...base, style: { dash: 'dashed' } }).dashArray).toBe('12 8');
		expect(resolveStyle({ ...base, style: { dash: 'dotted' } }).dashArray).toBe('2 6');
	});

	it('fillColor and fillOpacity resolve correctly', () => {
		const el = {
			id: 'x',
			color: '#000',
			visible: true,
			dependsOn: [] as const,
			style: { fillColor: '#ff0000', fillOpacity: 0.3 }
		};
		const resolved = resolveStyle(el);
		expect(resolved.fillColor).toBe('#ff0000');
		expect(resolved.fillOpacity).toBe(0.3);
	});

	it('pointShape and pointSize resolve correctly', () => {
		const el = {
			id: 'x',
			color: '#000',
			visible: true,
			dependsOn: [] as const,
			style: { pointShape: 'cross' as const, pointSize: 8 }
		};
		const resolved = resolveStyle(el);
		expect(resolved.pointShape).toBe('cross');
		expect(resolved.pointSize).toBe(8);
	});
});
