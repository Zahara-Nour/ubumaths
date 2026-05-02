/**
 * SVG rendering tests for `GeoFunction` with optional `domain` restriction.
 * - sampling viewport is clamped to the domain
 * - endpoint markers (filled vs hollow circles) at finite bounds
 */

import { describe, it, expect } from 'vitest';
import { functionToSVG } from '../svg-primitives';
import { parse } from '../../dsl/parser';
import { interpret } from '../../dsl/interpreter';
import { createTransformer } from '../../viewport/viewport';

const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);
const dims = { width: 800, height: 600 };

function run(script: string) {
	return interpret(parse(script));
}

describe('functionToSVG with domain restriction', () => {
	it('emits endpointMarkers for closed-closed bounded domain', () => {
		const { figure } = run('f = courbe("y = x^2 sur [-2 ; 2]")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;

		const svg = functionToSVG(fnId, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.endpointMarkers).toBeDefined();
		// Two finite closed bounds → two closed markers.
		expect(svg!.endpointMarkers!.length).toBe(2);
		expect(svg!.endpointMarkers!.every((m) => m.bracketType === 'closed')).toBe(true);
	});

	it('emits hollow markers for open bounds', () => {
		const { figure } = run('f = courbe("y = x^2 sur ]-1 ; 1[")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const svg = functionToSVG(fnId, figure, transformer, dims);
		expect(svg!.endpointMarkers).toBeDefined();
		// Both bounds open → two open markers.
		expect(svg!.endpointMarkers!.length).toBe(2);
		expect(svg!.endpointMarkers!.every((m) => m.bracketType === 'open')).toBe(true);
	});

	it('mixes closed and open markers for half-open domain', () => {
		const { figure } = run('f = courbe("y = x^2 sur [-1 ; 1[")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const svg = functionToSVG(fnId, figure, transformer, dims);
		expect(svg!.endpointMarkers).toBeDefined();
		expect(svg!.endpointMarkers!.length).toBe(2);
		const types = svg!.endpointMarkers!.map((m) => m.bracketType).sort();
		expect(types).toEqual(['closed', 'open']);
	});

	it('does NOT emit markers at infinite bounds', () => {
		const { figure } = run('f = courbe("y = x^2 sur [0 ; +infini[")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const svg = functionToSVG(fnId, figure, transformer, dims);
		// Only the finite (lower=0) bound has a marker; +∞ doesn't.
		expect(svg!.endpointMarkers).toBeDefined();
		expect(svg!.endpointMarkers!.length).toBe(1);
		expect(svg!.endpointMarkers![0].bracketType).toBe('closed');
	});

	it('returns null when domain is entirely outside viewport', () => {
		const { figure } = run('f = courbe("y = x^2 sur [100 ; 200]")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const svg = functionToSVG(fnId, figure, transformer, dims);
		expect(svg).toBeNull();
	});

	it('does not emit markers when there is no domain', () => {
		const { figure } = run('f = courbe("y = x^2")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const svg = functionToSVG(fnId, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.endpointMarkers).toBeUndefined();
	});

	it('reactive markers move when slider value changes', () => {
		const { figure } = run(`
a = slider(min=-5, max=5, valeur=-2)
b = slider(min=-5, max=5, valeur=2)
f = courbe("y = x^2 sur [a ; b]")
		`);
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const sliderA = figure.getAllElements().find((e) => e.type === 'slider' && e.label === 'a')!.id;

		const svg1 = functionToSVG(fnId, figure, transformer, dims);
		expect(svg1!.endpointMarkers).toBeDefined();
		const initialCx = svg1!.endpointMarkers![0].cx;

		// Move slider — sampling and markers should re-resolve.
		figure.moveSlider(sliderA, 0);
		const svg2 = functionToSVG(fnId, figure, transformer, dims);
		expect(svg2!.endpointMarkers).toBeDefined();
		expect(svg2!.endpointMarkers![0].cx).not.toBe(initialCx);
	});

	it('clamps sampling to the domain interior', () => {
		// Even though viewport is [-10, 10], sampling should only happen on [-2, 2].
		const { figure: f1 } = run('f = courbe("y = x^2")');
		const id1 = f1.getAllElements().find((e) => e.type === 'function')!.id;
		const svg1 = functionToSVG(id1, f1, transformer, dims);

		const { figure: f2 } = run('f = courbe("y = x^2 sur [-2 ; 2]")');
		const id2 = f2.getAllElements().find((e) => e.type === 'function')!.id;
		const svg2 = functionToSVG(id2, f2, transformer, dims);

		expect(svg2!.path.length).toBeLessThan(svg1!.path.length);
	});

	it('marker positions are inside the SVG viewport', () => {
		const { figure } = run('f = courbe("y = x^2 sur [-2 ; 2]")');
		const fnId = figure.getAllElements().find((e) => e.type === 'function')!.id;
		const svg = functionToSVG(fnId, figure, transformer, dims);
		for (const m of svg!.endpointMarkers!) {
			expect(m.cx).toBeGreaterThanOrEqual(0);
			expect(m.cx).toBeLessThanOrEqual(dims.width);
			expect(m.cy).toBeGreaterThanOrEqual(0);
			expect(m.cy).toBeLessThanOrEqual(dims.height);
		}
	});
});
